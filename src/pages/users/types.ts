import type { User } from '@/types/api';

/**
 * 用户表格组件属性
 */
export interface UserTableProps {
  /** 租户 ID，用于筛选特定租户的用户 */
  tenantId?: string;
}

/**
 * 创建用户抽屉引用接口
 */
export interface UserCreateDrawerRef {
  open: (tenantId?: string) => void;
  close: () => void;
}

/**
 * 编辑用户抽屉引用接口
 */
export interface UserEditDrawerRef {
  open: (user: User) => void;
  close: () => void;
}
