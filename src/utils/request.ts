import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import cookies from 'js-cookie';
import { useAuthStore } from '@/stores/authStore';
import { messageInstance } from '@/utils/antdStatic';
import {
  logError,
  markErrorNotified,
  parseError,
  showError,
  type ErrorInfo,
} from '@/utils/errorHandler';
import { TOKEN_KEY, USER_INFO_KEY as USER_INFO } from '@/utils/userData';
import type { ResponseData } from '@/types';

// ⚠️ 这里原来打印的是整个 import.meta.env。
// Vite 对「整体引用 import.meta.env」会把**所有 VITE_* 变量**内联进产物，
// 而 .env.production 里带着 OSS 的 AccessKeyId/AccessKeySecret（供上传插件用），
// 于是生产 bundle 里出现了明文密钥，且产物是公网可下载的。
// 需要调试 baseURL 时只打印这一个变量，绝不要打印整个 env 对象。
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // baseURL: '/api/v1/',
  timeout: 10000,
});

// 不需要显示错误提示的 URL 列表
const noNotifyList: string[] = [];

/**
 * 各类型在「后端一个字都没给」时的兜底文案。
 * 只在 parseError 取不到任何原文时才会用到 —— 有原文一律显示原文。
 */
const FALLBACK_TEXT: Record<ErrorInfo['type'], string> = {
  network: '网络连接失败，请检查网络连接',
  api: '服务器响应异常',
  auth: '身份验证失败，请重新登录',
  microapp: '应用加载失败，请稍后重试',
  unknown: '请求失败，请稍后重试',
};

/**
 * 统一的错误处理函数
 *
 * ⚠️ 文案只有 `parseError` 一个来源。历史上这里按 type 各写一套，其中 api 分支
 * 还去读 `response.data.message`（后端字段其实叫 `msg`，且业务错误是拦截器自己
 * `new Error()` 造的、根本没有 response），于是后端原文在两处被连续丢掉，
 * 运营只看到「服务器错误，请稍后重试」（缺陷 49）。
 */
const errorHandler = (error: AxiosError | Error, context?: string): void => {
  const errorInfo = parseError(error);

  logError(error, context);

  // 检查是否需要显示错误提示
  const shouldNotify = !noNotifyList.some((url) =>
    (error as AxiosError).config?.url?.includes(url),
  );

  if (!shouldNotify) {
    return;
  }

  // showError 内部对未注册的 antd 静态实例做了空值保护：
  // 弹窗失败绝不能反过来抛异常，否则会把真正的业务 Error 顶替成 TypeError。
  const shown = showError(errorInfo.message || FALLBACK_TEXT[errorInfo.type]);

  // 只有**真的弹出去了**才标记「拦截器已提示」，页面 catch 里的 showErrorOnce
  // 才会跳过。没弹成功就不打标记，把机会留给页面兜底 —— 否则这条错误会变成
  // 谁都看不见的静默失败。
  if (shown) {
    markErrorNotified(error);
  }
};

request.interceptors.request.use((config) => {
  const authorization = localStorage.getItem(TOKEN_KEY);

  // Authorization: cookies.get('Authorization')!,
  //       'droplet-device-id': cookies.get('droplet-device-id')!,
  // const authorization = cookies.get('Authorization');
  const deviceId = cookies.get('droplet-device-id');
  const userInfo = localStorage.getItem(USER_INFO);

  if (authorization) {
    config.headers.Authorization = `Bearer ${authorization}`;
  }
  if (userInfo) {
    config.headers['X-Tenant-ID'] = JSON.parse(userInfo)?.tenantId;
  }

  if (deviceId) {
    config.headers['droplet-device-id'] = deviceId;
  }

  return config;
});

request.interceptors.response.use(
  (res) => {
    const { msg: msgStr, code } = (res.data as unknown as ResponseData) || {};

    if (code === 401) {
      // 认证失败（token 无效/过期），自动登出
      const { logout } = useAuthStore.getState();
      logout();

      messageInstance?.error?.({
        content: '登录已过期，请重新登录',
        duration: 3,
      });

      // 跳转到登录页
      window.location.href = '/login';
      return Promise.reject(new Error(msgStr || '认证失败'));
    }
    // 403 无权限属于业务错误，走下方通用分支：仅提示，不登出
    if (code !== 200) {
      // 创建业务错误
      const error = new Error(msgStr || '业务处理失败');
      (error as any).code = code;

      errorHandler(error, `API 业务错误: ${res.config?.url}`);
      throw error;
    }
    return res.data;
  },
  (axiosError: AxiosError) => {
    // 处理 HTTP 错误
    errorHandler(axiosError, `HTTP 请求错误: ${axiosError.config?.url}`);
    throw axiosError;
  },
);

// 自定义 request 函数，返回正确的类型
const customRequest = async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  // 如果 data 中包含 pageNo/pageSize，提取到 URL 参数中（后端 list 接口需要 query 参数）
  const { data, ...restConfig } = config || {};
  if (data && typeof data === 'object' && ('pageNo' in data || 'pageSize' in data)) {
    const { pageNo, pageSize, ...restData } = data as Record<string, any>;
    const sep = url.includes('?') ? '&' : '?';
    const paging = [];
    if (pageSize != null) paging.push(`pageSize=${pageSize}`);
    if (pageNo != null) paging.push(`pageNum=${pageNo}`);
    const newUrl = paging.length ? `${url}${sep}${paging.join('&')}` : url;
    const response = await request(newUrl, { ...restConfig, data: restData });
    return response as T;
  }
  const response = await request(url, config);
  return response as T;
};

export default customRequest;
