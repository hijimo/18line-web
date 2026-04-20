/**
 * 认证相关的 React Query Hooks
 * 封装 authentication API 为可复用的 hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getAuthentication } from '@/services/api/authentication/authentication'
import type {
  ChangePasswordRequest,
  LoginDataResponse,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
  RegisterRequest,
  ResendVerificationRequest,
  SuccessResponse,
  UnlockAccountRequest,
  UserDataResponse,
  VerifyEmailRequest,
} from '@/types/api'

// 创建 authentication 服务实例
const authService = getAuthentication()

// Query Keys 常量
export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
}

/**
 * 用户登录 Hook
 * @returns useMutation 返回值，包含 mutate、mutateAsync、isLoading 等
 * @example
 * const { mutate: login, isLoading } = useLogin()
 * login({ email: 'user@example.com', password: '123456' })
 */
export const useLogin = () => {
  const queryClient = useQueryClient()

  return useMutation<LoginDataResponse, Error, LoginRequest>({
    mutationFn: (data: LoginRequest) => authService.postAuthLogin(data),
    onSuccess: (response) => {
      // 登录成功后，使缓存的用户信息失效，触发重新获取
      if (response.data?.user) {
        queryClient.setQueryData(authKeys.me(), response.data.user)
      }
    },
  })
}

/**
 * 用户登出 Hook
 * @returns useMutation 返回值
 * @example
 * const { mutate: logout } = useLogout()
 * logout({ refreshToken: 'xxx' })
 */
export const useLogout = () => {
  const queryClient = useQueryClient()

  return useMutation<SuccessResponse, Error, LogoutRequest>({
    mutationFn: (data: LogoutRequest) => authService.postAuthLogout(data),
    onSuccess: () => {
      // 登出成功后，清除所有认证相关的缓存
      queryClient.removeQueries({ queryKey: authKeys.all })
    },
  })
}

/**
 * 获取当前用户信息 Hook
 * @param enabled 是否启用查询，默认为 true
 * @returns useQuery 返回值，包含 data、isLoading、error 等
 * @example
 * const { data: user, isLoading } = useCurrentUser()
 */
export const useCurrentUser = (enabled = true) => {
  return useQuery<UserDataResponse, Error>({
    queryKey: authKeys.me(),
    queryFn: () => authService.getAuthMe(),
    enabled,
    // 用户信息不经常变化，可以设置较长的缓存时间
    staleTime: 5 * 60 * 1000, // 5 分钟
    gcTime: 10 * 60 * 1000, // 10 分钟
  })
}

/**
 * 刷新访问令牌 Hook
 * @returns useMutation 返回值
 * @example
 * const { mutate: refreshToken } = useRefreshToken()
 * refreshToken({ refreshToken: 'xxx' })
 */
export const useRefreshToken = () => {
  return useMutation<LoginDataResponse, Error, RefreshRequest>({
    mutationFn: (data: RefreshRequest) => authService.postAuthRefresh(data),
  })
}

/**
 * 用户注册 Hook
 * @returns useMutation 返回值
 * @example
 * const { mutate: register, isLoading } = useRegister()
 * register({ email: 'user@example.com', password: '123456', displayName: '张三' })
 */
export const useRegister = () => {
  return useMutation<UserDataResponse, Error, RegisterRequest>({
    mutationFn: (data: RegisterRequest) => authService.postAuthRegister(data),
  })
}

/**
 * 修改密码 Hook
 * @returns useMutation 返回值
 * @example
 * const { mutate: changePassword } = useChangePassword()
 * changePassword({ oldPassword: '123456', newPassword: '654321' })
 */
export const useChangePassword = () => {
  return useMutation<SuccessResponse, Error, ChangePasswordRequest>({
    mutationFn: (data: ChangePasswordRequest) =>
      authService.postAuthChangePassword(data),
  })
}

/**
 * 重新发送验证邮件 Hook
 * @returns useMutation 返回值
 * @example
 * const { mutate: resendVerification } = useResendVerification()
 * resendVerification({ email: 'user@example.com' })
 */
export const useResendVerification = () => {
  return useMutation<SuccessResponse, Error, ResendVerificationRequest>({
    mutationFn: (data: ResendVerificationRequest) =>
      authService.postAuthResendVerification(data),
  })
}

/**
 * 验证邮箱 Hook
 * @returns useMutation 返回值
 * @example
 * const { mutate: verifyEmail } = useVerifyEmail()
 * verifyEmail({ token: 'verification-token' })
 */
export const useVerifyEmail = () => {
  const queryClient = useQueryClient()

  return useMutation<SuccessResponse, Error, VerifyEmailRequest>({
    mutationFn: (data: VerifyEmailRequest) =>
      authService.postAuthVerifyEmail(data),
    onSuccess: () => {
      // 验证成功后，使用户信息缓存失效
      queryClient.invalidateQueries({ queryKey: authKeys.me() })
    },
  })
}

/**
 * 解锁账户 Hook（需要管理员权限）
 * @returns useMutation 返回值
 * @example
 * const { mutate: unlockAccount } = useUnlockAccount()
 * unlockAccount({ userId: 'user-id' })
 */
export const useUnlockAccount = () => {
  return useMutation<SuccessResponse, Error, UnlockAccountRequest>({
    mutationFn: (data: UnlockAccountRequest) =>
      authService.postAuthUnlockAccount(data),
  })
}
