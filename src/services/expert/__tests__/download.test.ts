/**
 * `postForDownload` 单测。
 *
 * ## 为什么用 MSW 打真实 axios，而不是把 axios 整个 mock 掉
 * 本次修的缺陷是「筛选条件在 body 还是 query」，那是 axios **真实序列化 + 真实 HTTP
 * 报文**层面的事。`vi.mock('axios')` 只能断言"我们递了什么 config 进去"，断言不了
 * "后端最终收到的 URL 长什么样"——恰好漏掉这个 bug 本身（config 里写了 params，
 * 但如果 axios 把它塞进 body，mock 版测试照样全绿）。
 * 所以：请求真的走一遍 axios → XHR → MSW，在 handler 里读 `request.url` 和
 * `await request.text()`；同时用 `vi.spyOn(axios, 'post')`（不改实现）额外断言
 * 「body 位是 undefined、参数在 config.params」这个调用形态。
 *
 * ## 断言的三条不变量（对应缺陷后果）
 * 1. 筛选条件出现在 **URL query**，body 为空 —— 否则 RuoYi 无 `@RequestBody` 的
 *    export 控制器绑不上，`<if>` 全不成立，静默导出**全量**（A7 就是资金数据越界交付）。
 * 2. `undefined`/`null`/`''` 被剔除，但 `0`/`false` 保留 —— 空串会让后端
 *    `Long merchantId` 绑定抛 400；而 0/false 是合法筛选值，剔掉等于改了语义。
 * 3. 后端返回 `application/json` 错误体时抛带 msg 的 Error 且**不存盘** ——
 *    否则用户拿到一个打不开的 .xlsx 还看到"已导出"。
 */

import { ReadableStream as NodeReadableStream } from 'node:stream/web';
import axios from 'axios';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../mocks/server';
import type { ExpertRewardOrderListQuery } from '@/types/expert';
import { cleanParams, postForDownload, serializeExportParams } from '../download';
import { exportExpertPayable } from '../expertIncome';
import { exportExpertRewardOrder } from '../expertRewardOrder';

/**
 * ⚠️ 测试环境兼容补丁（jsdom 29 + msw 2.14），**不是被测代码的问题**：
 * jsdom 的 `Blob` 实现了 `arrayBuffer()`/`text()`，但**没有 `stream()`**。
 * 而 `responseType: 'blob'` 的链路会两次撞上 undici 的 `Response` 构造：
 *   1. handler 里 `new HttpResponse(blob)`；
 *   2. `@mswjs/interceptors` 在 XHR 收尾时把 `xhr.response`（jsdom Blob）
 *      反向包成 Fetch Response（`createResponse`）。
 * undici 的 `extractBody` 对 Blob-like 直接调 `object.stream()` →
 * `TypeError: object.stream is not a function`，表现为请求永不 resolve + 一堆
 * Unhandled Rejection。浏览器/真实 Node 的 Blob 都有 `stream()`，所以只在这里补。
 */
const blobProto = Blob.prototype as unknown as { stream?: () => unknown };
if (typeof blobProto.stream !== 'function') {
  blobProto.stream = function patchedStream(this: Blob) {
    const self = this;
    return new NodeReadableStream<Uint8Array>({
      start: async (controller) => {
        controller.enqueue(new Uint8Array(await self.arrayBuffer()));
        controller.close();
      },
    });
  };
}

const EXPORT_URL = '/travel18/expertPayable/export';
const ORDER_EXPORT_URL = '/travel18/expertRewardOrder/export';

const XLS_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** 伪造一个 Excel 流（内容无所谓，只要 MIME 不是 application/json） */
const xlsBlob = () => new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], { type: XLS_MIME });

/** 捕获 handler 实际收到的请求，供断言 URL / body */
let captured: { url: string; method: string; body: string; contentType: string | null } | null =
  null;

/** msw 的 `HttpResponse<T>` 需要泛型实参，这里用公共父类型 `Response` 收口 */
const stubExport = (response: () => Response, url: string = EXPORT_URL) => {
  server.use(
    http.post(`*${url}`, async ({ request }) => {
      captured = {
        url: request.url,
        method: request.method,
        body: await request.text(),
        contentType: request.headers.get('content-type'),
      };
      return response();
    }),
  );
};

const searchOf = (rawUrl: string) => new URL(rawUrl).searchParams;

/**
 * jsdom **没有** `URL.createObjectURL`（属性不存在，所以 `vi.spyOn` 会直接报
 * "createObjectURL does not exist"），必须整体赋值补上。
 * 同时 stub 掉 `<a>.click()`：不 stub 的话 jsdom 会打印
 * "Not implemented: navigation" 噪声，把真实断言失败淹没。
 */
const createObjectURLSpy = vi.fn(() => 'blob:mock');
const revokeObjectURLSpy = vi.fn();

beforeEach(() => {
  captured = null;
  localStorage.clear();
  createObjectURLSpy.mockClear();
  revokeObjectURLSpy.mockClear();
  URL.createObjectURL = createObjectURLSpy;
  URL.revokeObjectURL = revokeObjectURLSpy;
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('cleanParams · 纯函数', () => {
  it('剔除 undefined / null / 空字符串', () => {
    expect(
      cleanParams({ a: 1, b: undefined, c: null, d: '', e: 'x' }),
    ).toEqual({ a: 1, e: 'x' });
  });

  it('保留 0 / false / "0"（合法筛选值，剔掉等于改语义）', () => {
    expect(cleanParams({ zero: 0, no: false, strZero: '0' })).toEqual({
      zero: 0,
      no: false,
      strZero: '0',
    });
  });

  it('入参为空时返回空对象（不返回 undefined，避免 axios 走默认序列化）', () => {
    expect(cleanParams()).toEqual({});
    expect(cleanParams(undefined)).toEqual({});
  });
});

describe('serializeExportParams · 显式序列化', () => {
  it('RuoYi 时间区间 key 编码成 params%5BbeginTime%5D（Servlet 解码后还原为 params[beginTime]）', () => {
    expect(serializeExportParams({ 'params[beginTime]': '2026-09-01 00:00:00' })).toBe(
      'params%5BbeginTime%5D=2026-09-01%2000%3A00%3A00',
    );
  });

  it('中文值与多参数按 & 连接', () => {
    expect(serializeExportParams({ merchantId: 12, terminalGroup: 'ios' })).toBe(
      'merchantId=12&terminalGroup=ios',
    );
  });
});

describe('postForDownload · 参数走 query 不走 body', () => {
  it('筛选条件出现在 URL query，且 POST body 为空', async () => {
    stubExport(() =>
      new HttpResponse(xlsBlob(), {
        headers: {
          'content-disposition':
            "attachment; filename*=UTF-8''%E8%BE%BE%E4%BA%BA%E5%AF%B9%E8%B4%A6%E5%8D%95.xlsx",
        },
      }),
    );
    const postSpy = vi.spyOn(axios, 'post');

    const filename = await postForDownload(
      EXPORT_URL,
      { merchantId: 12, authorUserId: 77, terminalGroup: 'ios', payStatus: '1' },
      '达人对账单.xlsx',
    );

    // 文件名以 Content-Disposition 为准（后端带账期，比 fallback 更有信息量）
    expect(filename).toBe('达人对账单.xlsx');
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);

    // ① 真实报文：参数在 query
    expect(captured).not.toBeNull();
    const search = searchOf(captured!.url);
    expect(search.get('merchantId')).toBe('12');
    expect(search.get('authorUserId')).toBe('77');
    expect(search.get('terminalGroup')).toBe('ios');
    expect(search.get('payStatus')).toBe('1');
    // ② 真实报文：body 空（JSON body 后端绑不上）
    expect(captured!.method).toBe('POST');
    expect(captured!.body).toBe('');
    expect(captured!.contentType ?? '').not.toContain('application/json');

    // ③ 调用形态：body 位是 undefined，参数在 config.params，且带显式 serializer
    const [, bodyArg, config] = postSpy.mock.calls[0] as [
      string,
      unknown,
      Record<string, unknown>,
    ];
    expect(bodyArg).toBeUndefined();
    expect(config.params).toEqual({
      merchantId: 12,
      authorUserId: 77,
      terminalGroup: 'ios',
      payStatus: '1',
    });
    expect(typeof (config.paramsSerializer as { serialize?: unknown }).serialize).toBe('function');
    expect(config.responseType).toBe('blob');
    // 导出是全表扫描级查询，不能被 request 实例的 10s 默认超时掐掉
    expect(config.timeout).toBe(120000);
  });

  it('A4 的 RuoYi 时间区间 params[beginTime] 出现在最终 URL 上', async () => {
    stubExport(() => new HttpResponse(xlsBlob()), ORDER_EXPORT_URL);

    await postForDownload(ORDER_EXPORT_URL, {
      orderStatus: '2',
      'params[beginTime]': '2026-09-01 00:00:00',
      'params[endTime]': '2026-09-30 23:59:59',
    });

    // 编码形态与未编码形态都接受（Servlet 两种都能还原），但必须真的在 query 上
    const url = decodeURIComponent(captured!.url);
    expect(url).toContain('params[beginTime]=2026-09-01 00:00:00');
    expect(url).toContain('params[endTime]=2026-09-30 23:59:59');
    expect(captured!.url).toMatch(/params(%5B|\[)beginTime(%5D|\])=/);
  });

  it('A7/A10 的顶层 beginTime/endTime 不被改写成 params[...] 形态', async () => {
    stubExport(() => new HttpResponse(xlsBlob()));

    await postForDownload(EXPORT_URL, {
      merchantId: 3,
      beginTime: '2026-09-01 00:00:00',
      endTime: '2026-09-30 23:59:59',
    });

    const search = searchOf(captured!.url);
    expect(search.get('beginTime')).toBe('2026-09-01 00:00:00');
    expect(search.get('endTime')).toBe('2026-09-30 23:59:59');
    expect(captured!.url).not.toContain('params%5B');
  });

  it('undefined / null / 空字符串不进 URL（避免 Long 字段绑定空串抛 400）', async () => {
    stubExport(() => new HttpResponse(xlsBlob()));

    await postForDownload(EXPORT_URL, {
      merchantId: undefined,
      authorUserId: null,
      terminalGroup: '',
      payStatus: '1',
      zero: 0,
    });

    const url = captured!.url;
    expect(url).not.toContain('merchantId');
    expect(url).not.toContain('authorUserId');
    expect(url).not.toContain('terminalGroup');
    expect(url).not.toMatch(/payStatus=&/);
    expect(searchOf(url).get('payStatus')).toBe('1');
    // 0 是合法值，必须留着
    expect(searchOf(url).get('zero')).toBe('0');
  });

  it('无 Content-Disposition 时用 fallback 文件名（第三参 / 函数默认值）', async () => {
    stubExport(() => new HttpResponse(xlsBlob()));
    await expect(postForDownload(EXPORT_URL, { payStatus: '1' }, '自定义.xlsx')).resolves.toBe(
      '自定义.xlsx',
    );

    stubExport(() => new HttpResponse(xlsBlob()));
    await expect(postForDownload(EXPORT_URL, { payStatus: '1' })).resolves.toBe('export.xlsx');
  });

  it('带上 Authorization 头（裸 axios 不经过 request 拦截器，得自己加）', async () => {
    localStorage.setItem('token', 'tk-123');
    let auth: string | null = null;
    server.use(
      http.post(`*${EXPORT_URL}`, ({ request }) => {
        auth = request.headers.get('authorization');
        return new HttpResponse(xlsBlob());
      }),
    );

    await postForDownload(EXPORT_URL, { payStatus: '1' });
    expect(auth).toBe('Bearer tk-123');
  });
});

describe('postForDownload · JSON 错误体不能被当成文件存盘', () => {
  it('抛出后端 msg，且没有创建下载', async () => {
    stubExport(() =>
      HttpResponse.json({ code: 500, msg: '没有导出权限，请联系管理员' }),
    );
    await expect(postForDownload(EXPORT_URL, { payStatus: '1' })).rejects.toThrow(
      '没有导出权限，请联系管理员',
    );
    expect(createObjectURLSpy).not.toHaveBeenCalled();
  });

  it('msg 缺失时退化成「导出失败」，仍然是抛错而不是存盘', async () => {
    stubExport(() => HttpResponse.json({ code: 500 }));
    await expect(postForDownload(EXPORT_URL, {})).rejects.toThrow('导出失败');
    expect(createObjectURLSpy).not.toHaveBeenCalled();
  });
});

/**
 * 两个调用方（A7 达人对账单 / A4 达人鼓励订单）的导出参数必须真的落到 query 上。
 * 放在这里而不是页面测试里：这是「导出范围 = 当前筛选条件」这条资金红线的最底层保证，
 * 页面测试挂了可能是渲染问题，这一层挂了就是数据越界。
 */
describe('调用方 · 导出参数落到 query', () => {
  it('exportExpertPayable：A7/A10 顶层 beginTime/endTime + 商家/达人筛选', async () => {
    stubExport(() => new HttpResponse(xlsBlob()));

    const filename = await exportExpertPayable({
      merchantId: 3,
      authorUserId: 77,
      terminalGroup: 'android',
      payStatus: '1',
      beginTime: '2026-09-01 00:00:00',
      endTime: '2026-09-30 23:59:59',
    });

    expect(filename).toBe('达人对账单.xlsx');
    expect(captured!.body).toBe('');
    const search = searchOf(captured!.url);
    expect(search.get('merchantId')).toBe('3');
    expect(search.get('authorUserId')).toBe('77');
    expect(search.get('terminalGroup')).toBe('android');
    expect(search.get('beginTime')).toBe('2026-09-01 00:00:00');
    expect(search.get('endTime')).toBe('2026-09-30 23:59:59');
    // A7 绝不能被套成 A4 的 RuoYi 形态
    expect(captured!.url).not.toContain('params%5B');
  });

  it('exportExpertRewardOrder：A4 的 params[beginTime] 形态 + 文件名', async () => {
    stubExport(() => new HttpResponse(xlsBlob()), ORDER_EXPORT_URL);

    const filename = await exportExpertRewardOrder({
      orderStatus: '2',
      merchantId: 3,
      'params[beginTime]': '2026-09-01 00:00:00',
      'params[endTime]': '2026-09-30 23:59:59',
    } as ExpertRewardOrderListQuery);

    expect(filename).toBe('达人鼓励订单.xlsx');
    expect(captured!.body).toBe('');
    expect(captured!.url).toMatch(/params%5BbeginTime%5D=/);
    expect(searchOf(captured!.url).get('params[beginTime]')).toBe('2026-09-01 00:00:00');
    expect(searchOf(captured!.url).get('merchantId')).toBe('3');
  });

  it('筛选值为 undefined 时不出现在 URL（达人视角下 authorUserId 恒空）', async () => {
    stubExport(() => new HttpResponse(xlsBlob()));

    await exportExpertPayable({ payStatus: '1', authorUserId: undefined, merchantId: undefined });

    expect(searchOf(captured!.url).get('payStatus')).toBe('1');
    expect(captured!.url).not.toContain('authorUserId');
    expect(captured!.url).not.toContain('merchantId');
  });
});
