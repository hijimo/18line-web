/**
 * 用户信息类型定义
 */
export type UserInfo = {
  /** 公司ID */
  co_id?: number;
  /** 公司名称 */
  co_name?: string;
  /** 用户权限列表 */
  permission?: number[];
  /** 用户ID */
  u_id?: number;
  /** 用户名称 */
  u_name?: string;
};

/**
 * 公司信息类型定义
 */
export type CompanyInfo = {
  /** 认证类型 */
  auth_type?: number;
  /** 公司ID */
  co_id?: number;
  /** 公司名称 */
  co_name?: string;
  /** 公司Logo URL */
  logo_url?: string;
  /** 公司简称 */
  co_name_short?: string;
};

/**
 * 用户信息API响应类型
 */
export type UserInfoResponse = {
  message?: string;
  result?: {
    user_info?: UserInfo;
  };
  code?: number;
};

/**
 * 公司信息API响应类型
 */
export type CompanyInfoResponse = {
  message?: string;
  result?: CompanyInfo;
  code?: number;
};
