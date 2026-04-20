import type { AxiosRequestConfig } from 'axios'
import request from '@/utils/request'

/**
 * Orval 自定义请求函数
 * 将 Orval 生成的请求适配到项目的 request 工具
 *
 * @template T 响应数据类型
 * @param config Axios 请求配置
 * @returns Promise<T> 返回响应数据
 */
export const orvalMutator = async <T = any>(
  config: AxiosRequestConfig,
): Promise<T> => {
  const { url, ...restConfig } = config

  if (!url) {
    throw new Error('请求 URL 不能为空')
  }

  return request<T>(url, restConfig)
}
