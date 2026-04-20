import { useLocation, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { useCurrentUser } from '@/hooks/services/useAuthentication';
import { useAuthStore } from '@/stores/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * 认证提供者组件
 * 负责在应用启动时恢复登录状态
 * 在非登录页面自动获取用户信息并更新认证状态
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // 只获取需要的方法和状态，避免整个 store 对象作为依赖
  const { updateUser, login, logout, isAuthenticated, token, rememberMe } = useAuthStore();
  const isLoginPage = location.pathname === '/login' || location.pathname === '/tabledemo';

  // 只在非登录页才获取用户信息
  const shouldFetchUser = !isLoginPage;

  const { data: userResponse, isError } = useCurrentUser(shouldFetchUser);

  useEffect(() => {
    // 如果获取用户信息成功，更新认证状态
    if (userResponse?.data) {
      updateUser(userResponse.data);
      // 确保认证状态为 true
      if (!isAuthenticated && token) {
        login(token, userResponse.data, rememberMe);
      }
    }

    // 如果获取用户信息失败（如 token 过期），清除认证状态并跳转到登录页
    if (isError && shouldFetchUser) {
      logout();
      navigate('/login', { replace: true, state: { from: location } });
    }
  }, [
    userResponse,
    isError,
    shouldFetchUser,
    updateUser,
    login,
    logout,
    isAuthenticated,
    token,
    rememberMe,
    navigate,
    location,
  ]);

  return <>{children}</>;
};
