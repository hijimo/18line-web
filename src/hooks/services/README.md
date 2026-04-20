# Services Hooks

本目录包含基于 React Query 封装的 API 服务 hooks，提供数据获取、缓存和状态管理功能。

## useAuthentication - 认证服务 Hooks

封装了所有认证相关的 API 接口，包括登录、登出、注册、密码管理等功能。

### 功能特性

- ✅ 基于 React Query 实现
- ✅ 自动请求状态管理（loading、error、success）
- ✅ 智能缓存和数据同步
- ✅ 乐观更新支持
- ✅ 自动重试机制
- ✅ TypeScript 类型安全

---

## API 参考

### useLogin - 用户登录

用于用户登录的 mutation hook。

**返回值**：

- `mutate`: 同步调用登录
- `mutateAsync`: 异步调用登录（返回 Promise）
- `isLoading`: 是否正在加载
- `isError`: 是否发生错误
- `error`: 错误对象
- `isSuccess`: 是否成功
- `data`: 响应数据

**使用示例**：

```typescript
import { useLogin } from '@/hooks/services'
import { useAuthStore } from '@/stores'

function LoginPage() {
  const { mutate: login, isLoading, error } = useLogin()
  const authStore = useAuthStore()

  const handleSubmit = (values: { email: string; password: string }) => {
    login(
      {
        email: values.email,
        password: values.password,
      },
      {
        onSuccess: (response) => {
          if (response.data) {
            // 保存认证信息到 store
            authStore.login(
              response.data.accessToken || '',
              response.data.user || {},
              values.remember
            )

            // 显示成功提示
            message.success('登录成功')

            // 跳转到首页
            navigate('/')
          }
        },
        onError: (error) => {
          // 显示错误提示
          message.error(error.message || '登录失败')
        },
      }
    )
  }

  return (
    <LoginForm
      onSubmit={handleSubmit}
      loading={isLoading}
    />
  )
}
```

**使用 async/await**：

```typescript
const { mutateAsync: login } = useLogin()

const handleSubmit = async (values: LoginFormValues) => {
  try {
    const response = await login({
      email: values.email,
      password: values.password,
    })

    if (response.data) {
      authStore.login(
        response.data.accessToken || '',
        response.data.user || {},
        values.remember,
      )
      message.success('登录成功')
      navigate('/')
    }
  } catch (error) {
    message.error('登录失败')
  }
}
```

---

### useLogout - 用户登出

用于用户登出的 mutation hook。

**使用示例**：

```typescript
import { useLogout } from '@/hooks/services'
import { useAuthStore } from '@/stores'

function Header() {
  const { mutate: logout } = useLogout()
  const authStore = useAuthStore()
  const token = useAuthStore((state) => state.token)

  const handleLogout = () => {
    logout(
      { refreshToken: token || '' },
      {
        onSuccess: () => {
          // 清除本地认证状态
          authStore.logout()

          // 显示提示
          message.success('已退出登录')

          // 跳转到登录页
          navigate('/login')
        },
      }
    )
  }

  return <button onClick={handleLogout}>退出登录</button>
}
```

---

### useCurrentUser - 获取当前用户信息

用于获取当前登录用户信息的 query hook。

**参数**：

- `enabled`: 是否启用查询（默认 true）

**返回值**：

- `data`: 用户数据响应
- `isLoading`: 是否正在加载
- `isError`: 是否发生错误
- `error`: 错误对象
- `refetch`: 手动重新获取数据

**使用示例**：

```typescript
import { useCurrentUser } from '@/hooks/services'
import { useAuthStore, selectIsAuthenticated } from '@/stores'

function UserProfile() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  // 只在已登录时获取用户信息
  const { data, isLoading, error } = useCurrentUser(isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  if (isLoading) {
    return <Spin />
  }

  if (error) {
    return <div>加载失败：{error.message}</div>
  }

  const user = data?.data

  return (
    <div>
      <h1>欢迎，{user?.displayName}</h1>
      <p>邮箱：{user?.email}</p>
      <p>角色：{user?.roles?.join(', ')}</p>
    </div>
  )
}
```

**手动刷新用户信息**：

```typescript
function UpdateProfile() {
  const { data, refetch } = useCurrentUser()

  const handleUpdate = async (newData: Partial<User>) => {
    // 更新用户信息
    await updateUserAPI(newData)

    // 重新获取最新的用户信息
    refetch()
  }

  return <ProfileForm onSubmit={handleUpdate} />
}
```

---

### useRefreshToken - 刷新访问令牌

用于刷新访问令牌的 mutation hook。

**使用示例**：

```typescript
import { useRefreshToken } from '@/hooks/services'
import { useAuthStore } from '@/stores'

function useTokenRefresh() {
  const { mutateAsync: refreshToken } = useRefreshToken()
  const updateToken = useAuthStore((state) => state.updateToken)
  const token = useAuthStore((state) => state.token)

  const refresh = async () => {
    try {
      const response = await refreshToken({
        refreshToken: token || '',
      })

      if (response.data?.accessToken) {
        // 更新 token
        updateToken(response.data.accessToken)
        return response.data.accessToken
      }
    } catch (error) {
      // Token 刷新失败，跳转到登录页
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
  }

  return { refresh }
}
```

**在 Axios 拦截器中使用**：

```typescript
import axios from 'axios'
import { useAuthStore } from '@/stores'

let isRefreshing = false
let failedQueue: any[] = []

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // 如果是 401 错误且未重试过
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 如果正在刷新，将请求加入队列
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { refresh } = useTokenRefresh()
        const newToken = await refresh()

        // 更新原请求的 token
        originalRequest.headers.Authorization = `Bearer ${newToken}`

        // 重试队列中的请求
        failedQueue.forEach((prom) => prom.resolve())
        failedQueue = []

        return axios(originalRequest)
      } catch (err) {
        failedQueue.forEach((prom) => prom.reject(err))
        failedQueue = []
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)
```

---

### useRegister - 用户注册

用于用户注册的 mutation hook。

**使用示例**：

```typescript
import { useRegister } from '@/hooks/services'

function RegisterPage() {
  const { mutate: register, isLoading } = useRegister()

  const handleSubmit = (values: RegisterFormValues) => {
    register(
      {
        email: values.email,
        password: values.password,
        displayName: values.displayName,
      },
      {
        onSuccess: (response) => {
          message.success('注册成功，请查收验证邮件')
          navigate('/login')
        },
        onError: (error) => {
          message.error(error.message || '注册失败')
        },
      }
    )
  }

  return <RegisterForm onSubmit={handleSubmit} loading={isLoading} />
}
```

---

### useChangePassword - 修改密码

用于修改密码的 mutation hook。

**使用示例**：

```typescript
import { useChangePassword } from '@/hooks/services'

function ChangePasswordForm() {
  const { mutate: changePassword, isLoading } = useChangePassword()

  const handleSubmit = (values: ChangePasswordFormValues) => {
    changePassword(
      {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      },
      {
        onSuccess: () => {
          message.success('密码修改成功')
          form.resetFields()
        },
        onError: (error) => {
          message.error(error.message || '密码修改失败')
        },
      }
    )
  }

  return <Form onFinish={handleSubmit}>...</Form>
}
```

---

### useResendVerification - 重新发送验证邮件

用于重新发送验证邮件的 mutation hook。

**使用示例**：

```typescript
import { useResendVerification } from '@/hooks/services'

function EmailVerificationPage() {
  const { mutate: resendVerification, isLoading } = useResendVerification()

  const handleResend = () => {
    resendVerification(
      { email: 'user@example.com' },
      {
        onSuccess: () => {
          message.success('验证邮件已发送')
        },
        onError: (error) => {
          message.error(error.message || '发送失败')
        },
      }
    )
  }

  return <Button onClick={handleResend} loading={isLoading}>重新发送</Button>
}
```

---

### useVerifyEmail - 验证邮箱

用于验证邮箱的 mutation hook。

**使用示例**：

```typescript
import { useVerifyEmail } from '@/hooks/services'
import { useSearchParams } from 'react-router-dom'

function EmailVerificationPage() {
  const [searchParams] = useSearchParams()
  const { mutate: verifyEmail, isLoading } = useVerifyEmail()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      verifyEmail(
        { token },
        {
          onSuccess: () => {
            message.success('邮箱验证成功')
            navigate('/login')
          },
          onError: (error) => {
            message.error(error.message || '验证失败')
          },
        }
      )
    }
  }, [searchParams])

  return <Spin spinning={isLoading}>验证中...</Spin>
}
```

---

### useUnlockAccount - 解锁账户

用于解锁被锁定账户的 mutation hook（需要管理员权限）。

**使用示例**：

```typescript
import { useUnlockAccount } from '@/hooks/services'

function UserManagement() {
  const { mutate: unlockAccount } = useUnlockAccount()

  const handleUnlock = (userId: string) => {
    unlockAccount(
      { userId },
      {
        onSuccess: () => {
          message.success('账户已解锁')
          refetchUsers()
        },
        onError: (error) => {
          message.error(error.message || '解锁失败')
        },
      }
    )
  }

  return <Button onClick={() => handleUnlock('user-id')}>解锁账户</Button>
}
```

---

## Query Keys

所有认证相关的 query keys 都定义在 `authKeys` 对象中：

```typescript
export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
}
```

**使用场景**：

```typescript
import { useQueryClient } from '@tanstack/react-query'
import { authKeys } from '@/hooks/services'

function SomeComponent() {
  const queryClient = useQueryClient()

  // 使缓存失效
  queryClient.invalidateQueries({ queryKey: authKeys.me() })

  // 清除缓存
  queryClient.removeQueries({ queryKey: authKeys.all })

  // 手动设置缓存
  queryClient.setQueryData(authKeys.me(), userData)
}
```

---

## 最佳实践

### 1. 错误处理

始终处理错误情况：

```typescript
const { mutate: login, error } = useLogin()

// 方式 1：使用 onError 回调
login(data, {
  onError: (error) => {
    message.error(error.message)
  },
})

// 方式 2：使用 error 状态
if (error) {
  return <Alert message={error.message} type="error" />
}
```

### 2. 加载状态

使用 isLoading 状态提供用户反馈：

```typescript
const { mutate: login, isLoading } = useLogin()

return (
  <Button
    onClick={() => login(data)}
    loading={isLoading}
  >
    登录
  </Button>
)
```

### 3. 成功回调

在成功后执行必要的操作：

```typescript
login(data, {
  onSuccess: (response) => {
    // 1. 更新本地状态
    authStore.login(response.data.accessToken, response.data.user)

    // 2. 显示提示
    message.success('登录成功')

    // 3. 跳转页面
    navigate('/')
  },
})
```

### 4. 与 Zustand Store 配合使用

```typescript
import { useLogin } from '@/hooks/services'
import { useAuthStore } from '@/stores'

function LoginPage() {
  const { mutate: login } = useLogin()
  const authStoreLogin = useAuthStore((state) => state.login)

  const handleLogin = (values: LoginFormValues) => {
    login(
      { email: values.email, password: values.password },
      {
        onSuccess: (response) => {
          if (response.data) {
            // 将 API 响应保存到 Zustand store
            authStoreLogin(
              response.data.accessToken || '',
              response.data.user || {},
              values.remember
            )
          }
        },
      }
    )
  }

  return <LoginForm onSubmit={handleLogin} />
}
```

### 5. 条件查询

只在需要时才发起请求：

```typescript
const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

// 只在已登录时获取用户信息
const { data } = useCurrentUser(isAuthenticated)
```

---

## 注意事项

1. **Token 管理**：登录成功后记得保存 token 到 store
2. **缓存策略**：用户信息设置了 5 分钟的缓存时间，可根据需求调整
3. **错误处理**：始终处理 onError 回调，提供友好的错误提示
4. **类型安全**：所有 hooks 都有完整的 TypeScript 类型定义
5. **自动重试**：React Query 默认会重试失败的请求，可通过配置调整

---

## 相关文档

- [React Query 官方文档](https://tanstack.com/query/latest)
- [认证状态管理 (authStore)](../../stores/README.md)
- [API 类型定义](../../types/api/index.ts)
