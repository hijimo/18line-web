/**
 * 拦截器端到端回归：后端原文必须一路走到弹窗。
 *
 * 复现的就是线上报障那条 —— 达人审核自己的路线，后端返回
 * `{code:4103, msg:"不能审核自己提交的路线"}`（HTTP 200），前端却弹「服务器错误，请稍后重试」。
 *
 * 这里刻意走**真实的 axios 实例 + 真实的响应拦截器 + MSW**，不 mock 请求层，
 * 因为缺陷 49 恰恰出在拦截器自己身上：单测 parseError 是测不出来的。
 */

import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auditExpertRoute } from '@/services/expert';
import { server } from '../../../mocks/server';
import { isErrorNotified, showErrorOnce } from '../errorHandler';
import request from '../request';

const { errorSpy } = vi.hoisted(() => ({ errorSpy: vi.fn() }));

vi.mock('@/utils/antdStatic', () => ({
  messageInstance: { error: errorSpy },
}));

/** 后端业务错误：HTTP 200 + body 里四位数业务码（RuoYi 的既有约定） */
const bizError = (code: number, msg: string) => HttpResponse.json({ code, msg });

/** 取出拦截器最后一次弹窗的文案 */
const lastToast = () =>
  errorSpy.mock.calls.length ? errorSpy.mock.calls[errorSpy.mock.calls.length - 1][0].content : '';

beforeEach(() => {
  errorSpy.mockClear();
});

describe('拦截器 · 业务错误弹的是后端原文', () => {
  it('🔴 4103 达人审核自己的路线：弹「不能审核自己提交的路线」，不是「服务器错误，请稍后重试」', async () => {
    server.use(
      http.put('*/travel18/expertRoute/audit', () => bizError(4103, '不能审核自己提交的路线')),
    );

    await expect(
      auditExpertRoute({ routeId: 1, auditStatus: '1', auditRemark: null } as never),
    ).rejects.toThrow('不能审核自己提交的路线');

    expect(lastToast()).toBe('不能审核自己提交的路线');
    expect(lastToast()).not.toContain('服务器错误');
  });

  it('其它业务域的四位码同样透出原文（账单 4086 / 打赏参数 4092）', async () => {
    server.use(http.put('*/x/bill', () => bizError(4086, '日期跨度不能超过 31 天')));
    await expect(request('/x/bill', { method: 'PUT' })).rejects.toThrow();
    expect(lastToast()).toBe('日期跨度不能超过 31 天');

    errorSpy.mockClear();
    server.use(http.post('*/x/cfg', () => bizError(4092, '分成率之和超过可用空间')));
    await expect(request('/x/cfg', { method: 'POST' })).rejects.toThrow();
    expect(lastToast()).toBe('分成率之和超过可用空间');
  });

  it('code=500 但带中文业务原文（ServiceException 不带码）→ 也显示原文', async () => {
    server.use(http.get('*/x/svc', () => bizError(500, '该路线已被删除，请刷新后重试')));
    await expect(request('/x/svc')).rejects.toThrow();
    expect(lastToast()).toBe('该路线已被删除，请刷新后重试');
  });
});

describe('拦截器 · 抛给页面的错误对象不能被破坏', () => {
  it('页面按 e.code 分派动作引导的能力必须保留', async () => {
    server.use(http.put('*/x/audit', () => bizError(4103, '不能审核自己提交的路线')));

    let caught: any;
    try {
      await request('/x/audit', { method: 'PUT' });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(caught.code).toBe(4103);
    expect(caught.message).toBe('不能审核自己提交的路线');
  });

  it('弹过窗的错误会被打标记，页面 showErrorOnce 不会把同一句再弹一遍', async () => {
    server.use(http.put('*/x/audit2', () => bizError(4103, '不能审核自己提交的路线')));

    let caught: any;
    try {
      await request('/x/audit2', { method: 'PUT' });
    } catch (e) {
      caught = e;
    }

    expect(isErrorNotified(caught)).toBe(true);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    showErrorOnce(caught, '审核失败');
    expect(errorSpy).toHaveBeenCalledTimes(1); // 没有第二次
  });
});

describe('拦截器 · HTTP 层错误', () => {
  it('网关 502 返回 HTML（没有 msg）→ 通用文案，且不能是英文 axios 文本', async () => {
    server.use(
      http.get('*/x/gw', () =>
        HttpResponse.text('<html><head><title>502 Bad Gateway</title></head></html>', {
          status: 502,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    );

    await expect(request('/x/gw')).rejects.toThrow();
    expect(lastToast()).toBe('服务器错误，请稍后重试');
    expect(lastToast()).not.toContain('Request failed');
  });

  it('HTTP 500 但响应体是 RuoYi JSON → 显示 body 里的原文', async () => {
    server.use(
      http.get(
        '*/x/srv',
        () =>
          new HttpResponse(JSON.stringify({ code: 500, msg: '系统异常，请稍后再试' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );

    await expect(request('/x/srv')).rejects.toThrow();
    expect(lastToast()).toBe('系统异常，请稍后再试');
  });
});

describe('拦截器 · 弹窗能力缺失时不能吃掉真正的错误', () => {
  it('messageInstance 未注册（应用启动早期/测试未挂 Provider）→ 业务 Error 原样抛出，不被 TypeError 顶替', async () => {
    vi.resetModules();
    vi.doMock('@/utils/antdStatic', () => ({ messageInstance: undefined }));

    const freshRequest = (await import('../request')).default;
    server.use(http.put('*/x/noinstance', () => bizError(4103, '不能审核自己提交的路线')));

    let caught: any;
    try {
      await freshRequest('/x/noinstance', { method: 'PUT' });
    } catch (e) {
      caught = e;
    }

    // 旧实现这里会变成 TypeError: Cannot read properties of undefined (reading 'error')
    expect(caught).not.toBeInstanceOf(TypeError);
    expect(caught?.code).toBe(4103);
    expect(caught?.message).toBe('不能审核自己提交的路线');

    // 🔴 没弹成功就绝不能打「已提示」标记：否则页面兜底也会跳过，
    //    这条错误会变成谁都看不见的静默失败
    expect(isErrorNotified(caught)).toBe(false);

    // 页面兜底此时必须还能把它弹出来（这里 messageInstance 仍是 undefined，
    // 所以断言的是「不抛异常」，真正的弹出由上面的用例覆盖）
    expect(() => showErrorOnce(caught, '审核失败')).not.toThrow();

    vi.doUnmock('@/utils/antdStatic');
    vi.resetModules();
  });
});
