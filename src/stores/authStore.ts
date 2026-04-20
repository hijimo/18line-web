/**
 * 认证状态管理
 * 使用 Zustand 管理用户登录状态、token 和用户信息
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TOKEN_KEY, USER_INFO_KEY as USER_INFO } from '@/utils/userData';
import type { User } from '@/types/api/user';

/**
 * 认证状态接口
 */
interface AuthState {
  /** 是否已认证 */
  isAuthenticated: boolean;
  /** 用户信息 */
  user: User | null;
  /** 认证令牌 */
  token: string | null;
  /** 是否记住登录状态 */
  rememberMe: boolean;
}

/**
 * 认证操作接口
 */
interface AuthActions {
  /**
   * 登录方法
   * @param token 认证令牌
   * @param user 用户信息
   * @param remember 是否记住登录状态
   */
  login: (token: string, user: User, remember?: boolean) => void;
  /**
   * 登出方法
   */
  logout: () => void;
  /**
   * 更新用户信息
   * @param user 用户信息
   */
  updateUser: (user: Partial<User>) => void;
  /**
   * 更新 token
   * @param token 新的认证令牌
   */
  updateToken: (token: string) => void;
}

/**
 * 认证 Store 类型
 */
type AuthStore = AuthState & AuthActions;

/**
 * 初始状态
 */
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  rememberMe: false,
};

/**
 * 认证状态管理 Store
 *
 * 功能：
 * - 管理用户登录状态
 * - 存储和管理认证 token
 * - 存储和管理用户信息
 * - 支持持久化存储（根据 rememberMe 选项）
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,

      // 登录方法
      login: (token: string, user: User, remember = false) => {
        const authData = {
          isAuthenticated: true,
          token,
          user,
          rememberMe: remember,
        };

        // 更新状态
        set(authData);

        // 手动保存到 localStorage
        localStorage.setItem(TOKEN_KEY, authData.token);
        localStorage.setItem(USER_INFO, JSON.stringify(authData.user));
      },

      // 登出方法
      logout: () => {
        // 更新状态
        set(initialState);

        // 清除 localStorage
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_INFO);
      },

      // 更新用户信息
      updateUser: (userData: Partial<User>) => {
        set((state) => {
          const updatedUser = state.user ? { ...state.user, ...userData } : userData;

          // 如果记住登录状态，同步更新 localStorage
          if (state.rememberMe && updatedUser) {
            const authData = {
              isAuthenticated: state.isAuthenticated,
              token: state.token,
              user: updatedUser,
              rememberMe: state.rememberMe,
            };
            localStorage.setItem('auth-storage', JSON.stringify(authData));
          }

          return { user: updatedUser };
        });
      },

      // 更新 token
      updateToken: (token: string) => {
        set((state) => {
          // 如果记住登录状态，同步更新 localStorage
          if (state.rememberMe) {
            const authData = {
              isAuthenticated: state.isAuthenticated,
              token,
              user: state.user,
              rememberMe: state.rememberMe,
            };
            localStorage.setItem('auth-storage', JSON.stringify(authData));
          }

          return { token };
        });
      },
    }),
    {
      name: 'auth-storage', // localStorage 中的 key
      // 根据 rememberMe 决定是否持久化
      partialize: (state) =>
        state.rememberMe
          ? {
              isAuthenticated: state.isAuthenticated,
              user: state.user,
              token: state.token,
              rememberMe: state.rememberMe,
            }
          : { rememberMe: false }, // 不记住时只保存 rememberMe 标志
    },
  ),
);

/**
 * 获取认证状态的选择器
 */
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;

/**
 * 获取用户信息的选择器
 */
export const selectUser = (state: AuthStore) => state.user;

/**
 * 获取 token 的选择器
 */
export const selectToken = (state: AuthStore) => state.token;

/**
 * 获取 rememberMe 状态的选择器
 */
export const selectRememberMe = (state: AuthStore) => state.rememberMe;
