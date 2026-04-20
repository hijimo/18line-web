/**
 * 角色数据类型定义
 */
export interface RoleData {
  id: string
  name: string
  description: string
  createdAt: string
}

/**
 * 角色列表响应类型
 */
export interface RoleListResponse {
  data: RoleData[]
  total: number
}

/**
 * 搜索表单数据类型
 */
export interface SearchFormData {
  keyword?: string
  status?: string
}
