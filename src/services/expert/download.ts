/**
 * 文件流下载（对账单 / 订单导出）。
 *
 * ⚠️ **为什么不能复用 `@/utils/request`**：那个实例的响应拦截器会解构
 *    `res.data.code` 并在 `code !== 200` 时抛业务错误。Excel 流没有 `code` 字段，
 *    走它必然被当成「业务处理失败」，且错误提示里带不出后端的真实 msg。
 *    所以这里用裸 axios，只复用同一个 baseURL 与 Authorization 头。
 *
 * ⚠️ **为什么参数走 query 而不是 JSON body**（这条是硬约束，不要"顺手改成 body"）：
 *    RuoYi 的导出控制器签名是
 *    `public void export(HttpServletResponse response, TravelAccommodation query)`，
 *    **没有 `@RequestBody`**（见 `travel18/.../TravelAccommodationController.java`）。
 *    Spring 对无 `@RequestBody` 的 POJO 入参用 `ServletModelAttributeMethodProcessor`
 *    从 query string / form 表单绑定，**JSON body 一律绑不上**：后端拿到的 query 对象
 *    所有字段都是 null → mapper 里的 `<if>` 全部不成立 → 导出的是**全量数据**而不是
 *    「当前筛选条件」，直接违反设计文档 §8.4（A7 达人对账单导出范围 = 当前筛选）。
 *    既有 orval 生成产物也是这个形态：`src/services/api/住宿管理/住宿管理.ts`
 *    `export8` → `{url:'/travel18/accommodation/export', method:'POST', params}`。
 *    后端部署后跑 `pnpm api`，生成的客户端同样是 `params`，所以垫片必须对齐，
 *    否则迁移时会静默失效（页面照样提示"已导出"，用户无法察觉）。
 *
 * ⚠️ 仍然要防「错误被当成文件下载」：RuoYi 在鉴权/业务失败时返回 JSON，
 *    `responseType: 'blob'` 下它会被包成一个 Blob，浏览器照样存盘，
 *    用户拿到一个打不开的 .xlsx，还以为导出成功了。所以下面先嗅探 MIME。
 */

import axios from 'axios';
import { TOKEN_KEY } from '@/utils/userData';

/** 从 Content-Disposition 里取文件名，兼容 `filename*=UTF-8''` 与 `filename=` 两种写法 */
const parseFilename = (disposition?: string): string | undefined => {
  if (!disposition) return undefined;
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ''));
    } catch {
      return utf8Match[1].trim();
    }
  }
  const plainMatch = /filename="?([^";]+)"?/i.exec(disposition);
  return plainMatch?.[1]?.trim();
};

const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // 立即 revoke 会让部分浏览器丢掉下载，延迟到下一个宏任务
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * 剔除 `undefined` / `null` / `''`。
 *
 * 不是洁癖：空值会被 axios 序列化成 `merchantId=&authorUserId=`，
 * 后端把它绑定到 `Long merchantId` 时空串转数字直接抛 400（mapper 里
 * `<if test="merchantId != null">` 那类判空根本来不及生效）。
 * 只清顶层：A4 的时间区间是 RuoYi 的 `params[beginTime]` 形态，
 * key 本身就是扁平字符串，不存在嵌套对象需要递归。
 */
export const cleanParams = (params?: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    out[key] = value;
  });
  return out;
};

/**
 * 显式序列化器：不依赖 axios 默认 `encode`（它会把 `%5B`/`%5D` 还原成 `[`/`]`、
 * `%20` 还原成 `+`，行为随 axios 版本变）。这里一律标准 `encodeURIComponent`，
 * `params[beginTime]` → `params%5BbeginTime%5D`，Servlet 容器解码后还原成
 * `params[beginTime]`，Spring 据此绑进 `BaseEntity.params` 这个 Map。
 */
export const serializeExportParams = (params: Record<string, unknown>): string =>
  Object.entries(params)
    .map(([key, value]) => {
      const raw = value instanceof Date ? value.toISOString() : String(value);
      return `${encodeURIComponent(key)}=${encodeURIComponent(raw)}`;
    })
    .join('&');

/**
 * POST 一个导出接口并把返回的文件流存盘。
 *
 * @param url    导出接口路径
 * @param params **筛选条件**，以 query string 发送（理由见文件头）
 * @returns 实际使用的文件名（便于页面提示与测试断言）
 * @throws 后端返回 JSON 错误体时抛出带 msg 的 Error，由调用方 message.error 展示
 */
export const postForDownload = async (
  url: string,
  params?: Record<string, unknown>,
  fallbackFilename = 'export.xlsx',
): Promise<string> => {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await axios.post<Blob>(url, undefined, {
    baseURL: import.meta.env.VITE_API_BASE_URL as string | undefined,
    params: cleanParams(params),
    paramsSerializer: { serialize: serializeExportParams },
    responseType: 'blob',
    // 导出是全表扫描级别的查询，10s（request 实例的默认值）不够
    timeout: 120000,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const blob = res.data;
  if (blob.type.includes('application/json')) {
    const text = await blob.text();
    let msg = '导出失败';
    try {
      const parsed = JSON.parse(text) as { msg?: string; code?: number };
      msg = parsed.msg || msg;
    } catch {
      // 非 JSON 的 JSON：直接把原文前 200 字带出来，排障时比"导出失败"有用
      msg = text.slice(0, 200) || msg;
    }
    throw new Error(msg);
  }

  const filename = parseFilename(res.headers?.['content-disposition'] as string | undefined);
  const used = filename || fallbackFilename;
  saveBlob(blob, used);
  return used;
};
