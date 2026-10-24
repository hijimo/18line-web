/**
 * 错误处理工具函数
 * 提供统一的错误处理和用户友好的错误信息
 *
 * ## 一条铁律：后端给了原文，就必须显示原文
 *
 * 本项目后端是 RuoYi，响应体形如 `{code, msg, data?}`（见 `types/common.ts` 的
 * `ResponseData`），并且**业务错误也走 HTTP 200**，只靠 body 里的 `code` 区分。
 * 业务码是四位数（达人域 4103、账单域 4080~4087、打赏参数域 4090~4096 …），
 * 这些码**全部 ≥500**。
 *
 * 历史实现（缺陷 49）在这里犯过两个错，导致后端精心写的提示被吞掉：
 *   1. 用 `code >= 500` 判「服务器错误」→ 每一个四位业务码都被改写成
 *      「服务器错误，请稍后重试」，运营看到的是废话，只能靠页面各自打补丁补原文；
 *   2. 只找 `message` 字段，而后端字段叫 `msg` → 即便走到透传分支也取不到原文。
 *
 * 现在的规则：**HTTP 状态码只在 100~599**；落在这个区间外的数字一律是业务码，
 * 原文直接透出。透传是安全的——`GlobalExceptionHandler` 对未知异常返回的是
 * 已脱敏的「系统异常，请稍后再试」，不会把堆栈塞进 `msg`。
 */

import { messageInstance } from '@/utils/antdStatic';

export interface ErrorInfo {
  message: string;
  type: 'network' | 'api' | 'auth' | 'microapp' | 'unknown';
  code?: string | number;
  details?: string;
}

/** 后端原文可能出现的字段名，按可信度排序（RuoYi 用 `msg`） */
const MESSAGE_FIELDS = ['msg', 'message', 'errMsg', 'errorMessage'] as const;

/** 请求根本没到服务端的 axios 错误码（这些 code 是字符串，不能拿来比大小） */
const NETWORK_CODES = new Set(['ERR_NETWORK', 'ERR_INTERNET_DISCONNECTED']);
const TIMEOUT_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT']);

const firstText = (...vals: unknown[]): string => {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
};

/**
 * 是不是 axios 自己造的错误对象。
 *
 * ⚠️ 这类对象的 `.message` 是**英文技术文本**（"Request failed with status code 500"、
 * "Network Error"），不是后端说的话，绝不能当原文弹给运营看。
 * 后端原文只可能在它的 `response.data` 里。
 */
const looksLikeAxiosError = (e: Record<string, any>): boolean =>
  e.isAxiosError === true || 'response' in e || 'config' in e;

/**
 * 从任意错误形态里挖出「后端原文」。
 *
 * 覆盖三种来源：
 *  1. 响应拦截器造的业务 Error：原文在 `error.message`，业务码在 `error.code`
 *  2. AxiosError（HTTP 4xx/5xx 但响应体是 RuoYi JSON）：原文**只**取 `response.data.msg`
 *  3. 页面/服务层自己 throw 的 `{ code, msg }` 裸对象
 */
export const pickServerMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') return '';
  const e = error as Record<string, any>;
  const data = e.response?.data;
  const fromBody = data && typeof data === 'object' ? MESSAGE_FIELDS.map((f) => data[f]) : [];
  const fromError = looksLikeAxiosError(e) ? [] : MESSAGE_FIELDS.map((f) => e[f]);
  return firstText(...fromBody, ...fromError);
};

/**
 * HTTP 状态码只可能落在 100~599。
 * 四位业务码（4080/4090/4103…）不在此区间 —— 这是区分「后端在说话」与
 * 「服务器炸了」的唯一可靠依据。
 */
export const isHttpStatus = (code: unknown): code is number =>
  typeof code === 'number' && Number.isFinite(code) && code >= 100 && code <= 599;

/**
 * 取用于分类的错误码：优先 body 里的数字业务码，其次 HTTP 状态。
 *
 * ⚠️ AxiosError 的 `code` 是**字符串**（`ERR_BAD_REQUEST`、`ERR_NETWORK`…），
 * 旧实现拿它去比 `>= 500` 恒为 false，于是 HTTP 500 会漏到兜底分支，
 * 把英文的 "Request failed with status code 500" 直接弹给运营看。
 */
export const pickErrorCode = (error: unknown): number | string | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as Record<string, any>;
  if (typeof e.code === 'number' && Number.isFinite(e.code)) return e.code;
  const status = e.response?.status;
  if (typeof status === 'number' && Number.isFinite(status)) return status;
  return typeof e.code === 'string' && e.code ? e.code : undefined;
};

/**
 * 解析错误信息，返回用户友好的错误描述
 */
export const parseError = (error: unknown): ErrorInfo => {
  // 网络错误
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: '网络连接失败，请检查网络连接后重试',
      type: 'network',
      details: error.message,
    };
  }

  // API / 业务错误
  if (error && typeof error === 'object' && ('code' in error || 'response' in error)) {
    const raw = String((error as Record<string, any>).message ?? '');
    const serverMessage = pickServerMessage(error);
    const code = pickErrorCode(error);

    // ① 请求没到服务端：断网 / 超时（axios 的字符串 code）
    if (!isHttpStatus(code) && typeof code === 'string') {
      if (NETWORK_CODES.has(code)) {
        return {
          message: '网络连接失败，请检查网络连接后重试',
          type: 'network',
          code,
          details: raw || undefined,
        };
      }
      if (TIMEOUT_CODES.has(code)) {
        return {
          message: '请求超时，请检查网络连接后重试',
          type: 'network',
          code,
          details: raw || undefined,
        };
      }
    }

    // ② 业务码（不在 HTTP 状态码区间）：后端原文原样透出，绝不改写
    if (!isHttpStatus(code)) {
      return {
        message: serverMessage || '操作失败，请稍后重试',
        type: 'api',
        code,
        // 原文已经是要显示的话，details 只在还有额外技术信息时才带上
        details: serverMessage && serverMessage !== raw ? raw || undefined : undefined,
      };
    }

    // ③ 真·HTTP 状态码：仍然优先原文，取不到才用通用文案
    if (code === 401 || code === 403) {
      return {
        message: serverMessage || '无权限执行此操作，请联系管理员',
        type: 'auth',
        code,
        details: serverMessage || raw || undefined,
      };
    }

    if (code === 404) {
      return {
        message: serverMessage || '请求的资源不存在',
        type: 'api',
        code,
        details: serverMessage ? undefined : raw || undefined,
      };
    }

    if (code >= 500) {
      return {
        message: serverMessage || '服务器错误，请稍后重试',
        type: 'api',
        code,
        details: serverMessage && serverMessage !== raw ? raw || undefined : undefined,
      };
    }

    return {
      message: serverMessage || '服务器响应异常',
      type: 'api',
      code,
      details: serverMessage && serverMessage !== raw ? raw || undefined : undefined,
    };
  }

  // 网络超时错误
  //
  // ⚠️ 必须排在 API 分支**之后**：后端原文里出现「超时」二字（例如
  // 「参数服务不可用：Redis 连接超时」）是**服务端在描述它自己的故障**，
  // 不是客户端网络超时。旧顺序让这条启发式抢先把原文改写成了
  // 「请求超时，请检查网络连接后重试」，运营会以为是自己的网断了而反复重试。
  // 真正的 axios 超时（ECONNABORTED / ETIMEDOUT）已在上面按字符串 code 精确识别。
  if (
    error instanceof Error &&
    (error.message.includes('timeout') || error.message.includes('超时'))
  ) {
    return {
      message: '请求超时，请检查网络连接后重试',
      type: 'network',
      details: error.message,
    };
  }

  // 认证错误
  if (error instanceof Error) {
    if (
      error.message.includes('token') ||
      error.message.includes('认证') ||
      error.message.includes('登录') ||
      error.message.includes('401') ||
      error.message.includes('403')
    ) {
      return {
        message: '身份验证失败，请重新登录',
        type: 'auth',
        details: error.message,
      };
    }

    // 微前端加载错误
    if (error.message.includes('微前端') || error.message.includes('子应用')) {
      return {
        message: '应用加载失败，请稍后重试',
        type: 'microapp',
        details: error.message,
      };
    }

    return {
      message: error.message,
      type: 'unknown',
    };
  }

  // 未知错误
  return {
    message: '发生未知错误，请稍后重试',
    type: 'unknown',
    details: String(error),
  };
};

// ---------------------------------------------------------------------------
// 弹窗去重：拦截器已经弹过后端原文时，页面 catch 不要再弹同一句
// ---------------------------------------------------------------------------

const NOTIFIED_FLAG = '__errorNotified';

/** 由 `utils/request.ts` 的拦截器在弹完窗后调用，标记「这句已经给用户看过了」 */
export const markErrorNotified = (error: unknown): void => {
  if (!error || typeof error !== 'object') return;
  try {
    (error as Record<string, unknown>)[NOTIFIED_FLAG] = true;
  } catch {
    // 冻结对象写不进去，忽略即可：最坏结果是页面多弹一次，不影响功能
  }
};

/** 这个错误是否已经被拦截器弹过窗 */
export const isErrorNotified = (error: unknown): boolean =>
  !!(
    error &&
    typeof error === 'object' &&
    (error as Record<string, unknown>)[NOTIFIED_FLAG] === true
  );

/**
 * 弹一条错误提示。返回**是否真的弹出去了**。
 *
 * ⚠️ 必须空值安全：antd 静态实例由 `AntdStaticProvider` 在应用挂载时注册，
 * 在那之前（以及测试里没挂 Provider 时）`messageInstance` 是 undefined。
 * 旧实现在这种情况下会抛 TypeError，**把真正的业务 Error 顶替掉**，
 * 页面 catch 到的就成了 "Cannot read properties of undefined"，原文二次丢失（缺陷 29）。
 *
 * 返回值用于决定要不要打「已弹窗」标记：没弹成功就不能打，
 * 否则页面兜底也会跟着跳过，这条错误会变成**谁都看不见的静默失败**。
 */
export const showError = (content: string): boolean => {
  if (!content || !messageInstance?.error) return false;
  messageInstance.error({ content, duration: 4 });
  return true;
};

/**
 * 页面 catch 里的统一兜底：
 *  - 拦截器已经弹过后端原文 → 什么都不做（避免同一句话弹两次）
 *  - 非请求错误（本地校验、数据处理抛的异常）→ 补一句原文或调用方给的兜底文案
 */
export const showErrorOnce = (error: unknown, fallback?: string): void => {
  if (isErrorNotified(error)) return;
  // 优先级沿用页面原来的写法：后端/异常原文 → 调用方给的业务兜底 → 通用解析结果。
  // 调用方的兜底（如「加载打赏参数失败」）比通用的「发生未知错误」更能告诉用户哪儿坏了。
  const text =
    pickServerMessage(error) || fallback || parseError(error).message || '操作失败，请稍后重试';
  showError(text);
};

/**
 * 记录错误日志
 */
export const logError = (error: unknown, context?: string) => {
  const errorInfo = parseError(error);
  const logMessage = `[${errorInfo.type.toUpperCase()}] ${context ? `${context}: ` : ''}${errorInfo.message}`;

  if (errorInfo.details) {
    console.error(logMessage, errorInfo.details);
  } else {
    console.error(logMessage);
  }

  // 在生产环境中，这里可以发送错误到监控服务
  if (process.env.NODE_ENV === 'production') {
    // TODO: 发送错误到监控服务
  }
};

/**
 * 检查是否为网络错误
 */
export const isNetworkError = (error: unknown): boolean => {
  return parseError(error).type === 'network';
};

/**
 * 检查是否为认证错误
 */
export const isAuthError = (error: unknown): boolean => {
  return parseError(error).type === 'auth';
};

/**
 * 获取重试建议
 */
export const getRetryAdvice = (errorInfo: ErrorInfo): string => {
  switch (errorInfo.type) {
    case 'network':
      return '请检查网络连接，然后点击重试';
    case 'api':
      return '服务暂时不可用，请稍后重试';
    case 'auth':
      return '请重新登录后再试';
    case 'microapp':
      return '应用加载失败，请刷新页面或稍后重试';
    default:
      return '请刷新页面或稍后重试';
  }
};

/**
 * 处理错误并返回用户友好的错误消息
 * @param error 错误对象
 * @param context 错误上下文（用于日志记录）
 * @returns 用户友好的错误消息
 */
export const handleError = (error: unknown, context?: string): string => {
  const errorInfo = parseError(error);
  logError(error, context);
  return errorInfo.message;
};

/**
 * 处理表单验证错误
 * @param errorFields 表单错误字段
 * @returns 第一个错误消息
 */
export const handleFormError = (errorFields: any[]): string => {
  if (errorFields && errorFields.length > 0) {
    const firstError = errorFields[0];
    if (firstError.errors && firstError.errors.length > 0) {
      return firstError.errors[0];
    }
  }
  return '表单验证失败，请检查输入';
};
