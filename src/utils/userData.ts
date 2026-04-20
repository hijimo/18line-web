import type { User } from '@/types/api';
import type { CompanyInfo } from '@/types/user';

// 存储键名常量
export const TOKEN_KEY = 'token';
export const USER_INFO_KEY = 'user_info';
export const COMPANY_INFO_KEY = 'company_info';

/**
 * 从localStorage获取用户信息
 */
export const getUserInfoFromStorage = (): User | null => {
  try {
    const cached = localStorage.getItem(USER_INFO_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

/**
 * 从localStorage获取公司信息
 */
export const getCompanyInfoFromStorage = (): CompanyInfo | null => {
  try {
    const cached = localStorage.getItem(COMPANY_INFO_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

/**
 * 检查用户是否有特定权限
 */
export const hasPermission = (permission: number, userInfo?: User | null): boolean => {
  if (!userInfo?.permission) {
    return false;
  }
  return userInfo.permission.includes(permission);
};

/**
 * 获取用户显示名称
 */
export const getUserDisplayName = (userInfo?: User | null): string => {
  return userInfo?.u_name || '未知用户';
};

/**
 * 获取公司显示名称
 */
export const getCompanyDisplayName = (companyInfo?: CompanyInfo | null): string => {
  return companyInfo?.co_name || companyInfo?.co_name_short || '未知公司';
};
