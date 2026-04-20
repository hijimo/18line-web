import { message } from 'antd';
import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import cookies from 'js-cookie';
import { useAuthStore } from '@/stores/authStore';
import { logError, parseError } from '@/utils/errorHandler';
import { TOKEN_KEY, USER_INFO_KEY as USER_INFO } from '@/utils/userData';
import type { ResponseData } from '@/types';

console.log('import.meta.env.VITE_API_BASE_URL', import.meta.env);
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // baseURL: '/api/v1/',
  timeout: 10000,
});

// 不需要显示错误提示的 URL 列表
const noNotifyList: string[] = [];

/**
 * 统一的错误处理函数
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

  // 根据错误类型显示不同的提示
  switch (errorInfo.type) {
    case 'network':
      message.error({
        content: '网络连接失败，请检查网络连接',
        duration: 4,
      });
      break;
    case 'api':
      const axiosErr = error as AxiosError;
      const messageStr = (axiosErr.response?.data as any)?.message;
      message.error({
        content: messageStr || errorInfo.message || '服务器响应异常',
        duration: 4,
      });

      break;
    default:
      message.error({
        content: errorInfo.message || '请求失败，请稍后重试',
        duration: 4,
      });
      break;
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
    const { message: messageStr, code, result } = (res.data as unknown as ResponseData) || {};

    if (code === 401 || code === 403) {
      // 认证失败或无权限，自动登出
      const { logout } = useAuthStore.getState();
      logout();

      message.error({
        content: code === 401 ? '登录已过期，请重新登录' : '无权限访问',
        duration: 3,
      });

      // 跳转到登录页
      window.location.href = '/login';
      return Promise.reject(new Error(messageStr || '认证失败'));
    }
    if (code !== 200) {
      // 创建业务错误
      const error = new Error(messageStr || '业务处理失败');
      (error as any).code = code;
      (error as any).result = result;

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
  const response = await request(url, config);
  return response as T;
};

export default customRequest;
