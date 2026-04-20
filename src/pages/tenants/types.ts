import type { Tenant } from '@/types/api'

/**
 * 租户表格组件的 Props 类型
 */
export interface TenantTableProps {
  // 当前表格组件不需要额外的 props，所有状态内部管理
  // 预留接口以便未来扩展
}

/**
 * 创建租户抽屉组件的 Ref 类型
 */
export interface TenantCreateDrawerRef {
  /**
   * 打开创建租户抽屉
   */
  open: () => void

  /**
   * 关闭创建租户抽屉
   */
  close: () => void
}

/**
 * 编辑租户抽屉组件的 Ref 类型
 */
export interface TenantEditDrawerRef {
  /**
   * 打开编辑租户抽屉
   * @param tenant 要编辑的租户信息
   */
  open: (tenant: Tenant) => void

  /**
   * 关闭编辑租户抽屉
   */
  close: () => void
}

/**
 * 创建租户表单数据类型
 * 继承自 API 的 CreateTenantRequest 类型
 */
export interface TenantCreateFormData {
  /**
   * 租户名称（必填）
   * 长度：1-255 个字符
   */
  name: string

  /**
   * 租户域名（可选）
   * 长度：最多 255 个字符
   */
  domain?: string

  /**
   * 租户元数据（可选）
   * JSON 格式的字符串
   */
  metadata?: string
}

/**
 * 编辑租户表单数据类型
 * 继承自 API 的 UpdateTenantRequest 类型
 */
export interface TenantEditFormData {
  /**
   * 租户名称（可选）
   * 长度：1-255 个字符
   */
  name?: string

  /**
   * 租户域名（可选）
   * 长度：最多 255 个字符
   */
  domain?: string

  /**
   * 租户状态（可选）
   * true: 启用
   * false: 禁用
   */
  status?: boolean

  /**
   * 租户元数据（可选）
   * JSON 格式的字符串
   */
  metadata?: string
}

/**
 * 租户搜索表单数据类型
 */
export interface TenantSearchFormData {
  /**
   * 租户名称搜索关键词
   */
  name?: string

  /**
   * 租户类型筛选
   * system: 平台租户
   * tenant: 业务租户
   */
  type?: 'system' | 'tenant'

  /**
   * 租户状态筛选
   * true: 启用
   * false: 禁用
   */
  status?: boolean
}
