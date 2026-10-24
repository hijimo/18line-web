/**
 * 统一错误解析测试（缺陷 49 回归）。
 *
 * 这里守的是管理后台**所有**接口的报错可读性：后端 RuoYi 的业务错误也走 HTTP 200，
 * 只靠 body 里的四位数业务码区分（达人域 4103、账单域 4080~4087、打赏参数域 4090~4096），
 * 而这些码全部 ≥500。旧实现用 `code >= 500` 判服务器错误，把每一句后端原文都改写成
 * 「服务器错误，请稍后重试」，运营只能看到废话。
 *
 * 断言的核心不变量：**后端给了原文，parseError 就必须原样返回原文**。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isErrorNotified,
  isHttpStatus,
  markErrorNotified,
  parseError,
  pickErrorCode,
  pickServerMessage,
  showError,
  showErrorOnce,
} from '../errorHandler';

const { errorSpy } = vi.hoisted(() => ({ errorSpy: vi.fn() }));

vi.mock('@/utils/antdStatic', () => ({
  messageInstance: { error: errorSpy },
}));

/** 复刻响应拦截器造业务错误的方式：new Error(msg) 且挂上 body 的 code */
const bizError = (code: number, msg: string) => {
  const e = new Error(msg) as Error & { code: number };
  e.code = code;
  return e;
};

/** 造一个 AxiosError 形态的对象（HTTP 层失败） */
const axiosLike = (opts: {
  status?: number;
  axiosCode?: string;
  data?: unknown;
  message?: string;
}) => {
  const e = new Error(opts.message ?? 'Request failed') as Record<string, any>;
  if (opts.axiosCode) e.code = opts.axiosCode;
  if (opts.status !== undefined) e.response = { status: opts.status, data: opts.data };
  else e.response = undefined;
  return e;
};

beforeEach(() => {
  errorSpy.mockClear();
});

describe('parseError · 业务码必须原样透出后端原文', () => {
  it('🔴 4103「不能审核自己提交的路线」：这就是本次报障的那一条', () => {
    const info = parseError(bizError(4103, '不能审核自己提交的路线'));
    expect(info.message).toBe('不能审核自己提交的路线');
    expect(info.message).not.toContain('服务器错误');
    expect(info.code).toBe(4103);
    expect(info.type).toBe('api');
  });

  it('账单域 4080~4087、打赏参数域 4090~4096 同样不被改写', () => {
    expect(parseError(bizError(4086, '日期跨度不能超过 31 天')).message).toBe(
      '日期跨度不能超过 31 天',
    );
    expect(parseError(bizError(4084, '任务不存在或已被清理')).message).toBe('任务不存在或已被清理');
    expect(parseError(bizError(4092, '分成率之和超过可用空间')).message).toBe(
      '分成率之和超过可用空间',
    );
  });

  it('ServiceException 不带业务码时 body 是 code=500 + 中文原文，也要透出原文', () => {
    // RuoYi: throw new ServiceException("xxx") → AjaxResult.error("xxx") → {code:500,msg:"xxx"}
    const info = parseError({ code: 500, msg: '该路线已被删除，请刷新后重试' });
    expect(info.message).toBe('该路线已被删除，请刷新后重试');
  });

  it('业务码原文为空时才落兜底，且不能是「服务器错误」这种误导文案', () => {
    const info = parseError(bizError(4103, ''));
    expect(info.message).toBe('操作失败，请稍后重试');
  });
});

describe('parseError · 后端原文里带「超时」二字时不能被误判成客户端网络超时', () => {
  it('🔴 「参数服务不可用：Redis 连接超时」是服务端在描述自己的故障，必须原样显示', () => {
    const info = parseError(bizError(500, '参数服务不可用：Redis 连接超时'));
    expect(info.message).toBe('参数服务不可用：Redis 连接超时');
    expect(info.type).toBe('api');
    expect(info.type).not.toBe('network');
  });

  it('业务码 4095 带 timeout 英文字样同理', () => {
    expect(parseError(bizError(4095, 'upstream timeout, 写库失败')).message).toBe(
      'upstream timeout, 写库失败',
    );
  });

  it('没有业务码/响应信息的纯 Error 仍按超时启发式归类（保留原能力）', () => {
    const info = parseError(new Error('timeout of 10000ms exceeded'));
    expect(info.type).toBe('network');
    expect(info.message).toBe('请求超时，请检查网络连接后重试');
  });
});

describe('parseError · 真·HTTP 状态码', () => {
  it('HTTP 502 且响应体不是 RuoYi JSON（网关 HTML）→ 通用文案', () => {
    const info = parseError(
      axiosLike({ status: 502, axiosCode: 'ERR_BAD_RESPONSE', data: '<html>502</html>' }),
    );
    expect(info.message).toBe('服务器错误，请稍后重试');
    expect(info.code).toBe(502);
  });

  it('HTTP 500 但响应体带 RuoYi 原文 → 显示原文而不是通用文案', () => {
    const info = parseError(
      axiosLike({
        status: 500,
        axiosCode: 'ERR_BAD_REQUEST',
        data: { code: 500, msg: '系统异常，请稍后再试' },
      }),
    );
    expect(info.message).toBe('系统异常，请稍后再试');
  });

  it('🔴 axios 的 code 是字符串，绝不能把英文 "Request failed with status code 500" 弹给运营', () => {
    const info = parseError(
      axiosLike({
        status: 500,
        axiosCode: 'ERR_BAD_REQUEST',
        message: 'Request failed with status code 500',
      }),
    );
    expect(info.message).not.toContain('Request failed');
    expect(info.code).toBe(500);
  });

  it('403 有后端原文时优先原文（RuoYi 那句比通用文案更具体）', () => {
    const withMsg = parseError(
      axiosLike({
        status: 403,
        axiosCode: 'ERR_BAD_REQUEST',
        data: { code: 403, msg: '没有权限，请联系管理员授权' },
      }),
    );
    expect(withMsg.message).toBe('没有权限，请联系管理员授权');
    expect(withMsg.type).toBe('auth');

    const noMsg = parseError(axiosLike({ status: 403, axiosCode: 'ERR_BAD_REQUEST' }));
    expect(noMsg.message).toBe('无权限执行此操作，请联系管理员');
  });

  it('404 无原文 → 通用文案', () => {
    expect(parseError(axiosLike({ status: 404, axiosCode: 'ERR_BAD_REQUEST' })).message).toBe(
      '请求的资源不存在',
    );
  });
});

describe('parseError · 网络与超时', () => {
  it('ERR_NETWORK → 网络文案，不是「服务器错误」', () => {
    const info = parseError(axiosLike({ axiosCode: 'ERR_NETWORK', message: 'Network Error' }));
    expect(info.type).toBe('network');
    expect(info.message).toBe('网络连接失败，请检查网络连接后重试');
  });

  it('ECONNABORTED → 超时文案', () => {
    const info = parseError(
      axiosLike({ axiosCode: 'ECONNABORTED', message: 'timeout of 10000ms exceeded' }),
    );
    expect(info.type).toBe('network');
    expect(info.message).toBe('请求超时，请检查网络连接后重试');
  });
});

describe('parseError · 非接口错误不受影响', () => {
  it('本地抛的普通 Error 原样返回，类型 unknown', () => {
    const info = parseError(new Error('本地计算炸了'));
    expect(info.message).toBe('本地计算炸了');
    expect(info.type).toBe('unknown');
  });

  it('null / undefined / 字符串都不会抛异常', () => {
    expect(parseError(null).message).toBe('发生未知错误，请稍后重试');
    expect(parseError(undefined).message).toBe('发生未知错误，请稍后重试');
    expect(parseError('boom').message).toBe('发生未知错误，请稍后重试');
  });
});

describe('取原文与取码的取值口径', () => {
  it('🔴 后端字段叫 msg，不是 message —— 这是原文丢失的第二处成因', () => {
    expect(pickServerMessage({ code: 4103, msg: '不能审核自己提交的路线' })).toBe(
      '不能审核自己提交的路线',
    );
    expect(pickServerMessage(axiosLike({ status: 400, data: { msg: '参数不合法' } }))).toBe(
      '参数不合法',
    );
  });

  it('isHttpStatus：100~599 才算 HTTP 状态码，四位业务码一律不算', () => {
    expect(isHttpStatus(200)).toBe(true);
    expect(isHttpStatus(599)).toBe(true);
    expect(isHttpStatus(600)).toBe(false);
    expect(isHttpStatus(4103)).toBe(false);
    expect(isHttpStatus('ERR_NETWORK')).toBe(false);
    expect(isHttpStatus(undefined)).toBe(false);
  });

  it('pickErrorCode：数字业务码优先，其次 response.status，字符串 code 原样带回', () => {
    expect(pickErrorCode(bizError(4103, 'x'))).toBe(4103);
    expect(pickErrorCode(axiosLike({ status: 502, axiosCode: 'ERR_BAD_RESPONSE' }))).toBe(502);
    expect(pickErrorCode(axiosLike({ axiosCode: 'ERR_NETWORK' }))).toBe('ERR_NETWORK');
  });
});

describe('showErrorOnce · 同一句话只弹一次', () => {
  it('拦截器已弹过（有标记）→ 页面兜底不再弹', () => {
    const e = bizError(4103, '不能审核自己提交的路线');
    markErrorNotified(e);
    expect(isErrorNotified(e)).toBe(true);
    showErrorOnce(e, '审核失败');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('没标记（本地错误）→ 弹原文', () => {
    showErrorOnce(new Error('本地计算炸了'));
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0].content).toBe('本地计算炸了');
  });

  it('没标记且取不到文案 → 用调用方给的兜底', () => {
    showErrorOnce({}, '加载打赏参数失败');
    expect(errorSpy.mock.calls[0][0].content).toBe('加载打赏参数失败');
  });

  it('空文案不弹，避免弹出一个空泡泡', () => {
    showError('');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('冻结对象打标记不抛异常（最坏只是多弹一次，不能崩）', () => {
    const frozen = Object.freeze(new Error('x'));
    expect(() => markErrorNotified(frozen)).not.toThrow();
  });
});

describe('showError · antd 静态实例未注册时必须空值安全', () => {
  it('messageInstance 为 undefined 也不抛，绝不把业务 Error 顶替成 TypeError', async () => {
    vi.resetModules();
    vi.doMock('@/utils/antdStatic', () => ({ messageInstance: undefined }));
    const mod = await import('../errorHandler');
    expect(() => mod.showError('任意文案')).not.toThrow();
    expect(() => mod.showErrorOnce(new Error('boom'))).not.toThrow();
    vi.doUnmock('@/utils/antdStatic');
    vi.resetModules();
  });
});
