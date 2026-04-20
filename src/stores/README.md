# 状态管理

本目录包含应用的全局状态管理，使用 Zustand 实现。

## authStore - 认证状态管理

管理用户登录状态、token 和用户信息。

### 功能特性

- ✅ 用户登录状态管理
- ✅ Token 存储和管理
- ✅ 用户信息存储
- ✅ 支持"记住我"功能
- ✅ 自动持久化（根据用户选择）
- ✅ 提供便捷的选择器函数

### 基本使用

#### 1. 登录

```typescript
import { useAuthStore } from '@/stores'

function LoginPage() {
  const login = useAuthStore((state) => state.login)

  const handleLogin = async (values: LoginFormValues) => {
    // 调用登录 API
    const response = await loginAPI(values)

    if (response.success && response.data) {
      // 保存认证状态
      login(response.data.token, response.data.user, values.remember)

      // 跳转到首页
      navigate('/')
    }
  }

  return <LoginForm onSubmit={handleLogin} />
}
```

#### 2. 登出

```typescript
import { useAuthStore } from '@/stores'

function Header() {
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return <button onClick={handleLogout}>退出登录</button>
}
```

#### 3. 获取用户信息

```typescript
import { useAuthStore, selectUser } from '@/stores'

function UserProfile() {
  // 使用选择器获取用户信息
  const user = useAuthStore(selectUser)

  if (!user) {
    return <div>未登录</div>
  }

  return (
    <div>
      <h1>欢迎，{user.username}</h1>
      <p>邮箱：{user.email}</p>
    </div>
  )
}
```

#### 4. 检查认证状态

```typescript
import { useAuthStore, selectIsAuthenticated } from '@/stores'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return <>{children}</>
}
```

#### 5. 获取 Token

```typescript
import { useAuthStore, selectToken } from '@/stores'

function useAPI() {
  const token = useAuthStore(selectToken)

  const fetchData = async () => {
    const response = await fetch('/api/data', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.json()
  }

  return { fetchData }
}
```

#### 6. 更新用户信息

```typescript
import { useAuthStore } from '@/stores'

function UpdateProfile() {
  const updateUser = useAuthStore((state) => state.updateUser)

  const handleUpdate = async (newData: Partial<User>) => {
    // 调用更新 API
    await updateUserAPI(newData)

    // 更新本地状态
    updateUser(newData)
  }

  return <ProfileForm onSubmit={handleUpdate} />
}
```

### API 参考

#### State（状态）

| 属性              | 类型             | 说明             |
| ----------------- | ---------------- | ---------------- |
| `isAuthenticated` | `boolean`        | 是否已认证       |
| `user`            | `User \| null`   | 用户信息         |
| `token`           | `string \| null` | 认证令牌         |
| `rememberMe`      | `boolean`        | 是否记住登录状态 |

#### Actions（操作）

| 方法          | 参数                                              | 说明                   |
| ------------- | ------------------------------------------------- | ---------------------- |
| `login`       | `(token: string, user: User, remember?: boolean)` | 登录并保存认证信息     |
| `logout`      | `()`                                              | 登出并清除所有认证信息 |
| `updateUser`  | `(user: Partial<User>)`                           | 更新用户信息           |
| `updateToken` | `(token: string)`                                 | 更新认证令牌           |

#### Selectors（选择器）

| 选择器                  | 返回类型         | 说明           |
| ----------------------- | ---------------- | -------------- |
| `selectIsAuthenticated` | `boolean`        | 获取认证状态   |
| `selectUser`            | `User \| null`   | 获取用户信息   |
| `selectToken`           | `string \| null` | 获取认证令牌   |
| `selectRememberMe`      | `boolean`        | 获取记住我状态 |

### 持久化说明

- 当用户选择"记住我"时，认证信息会保存到 `localStorage`
- 当用户不选择"记住我"时，认证信息仅在当前会话有效
- 存储的 key 为 `auth-storage`
- 登出时会自动清除所有持久化数据

### 最佳实践

1. **使用选择器**：优先使用提供的选择器函数，避免直接访问整个 state

   ```typescript
   // ✅ 推荐
   const user = useAuthStore(selectUser)

   // ❌ 不推荐
   const { user } = useAuthStore()
   ```

2. **避免不必要的重渲染**：只订阅需要的状态

   ```typescript
   // ✅ 只在 user 变化时重渲染
   const user = useAuthStore((state) => state.user)

   // ❌ 任何状态变化都会重渲染
   const store = useAuthStore()
   ```

3. **在 API 拦截器中使用**：可以在 axios 拦截器中获取 token

   ```typescript
   import { useAuthStore } from '@/stores'

   axios.interceptors.request.use((config) => {
     const token = useAuthStore.getState().token
     if (token) {
       config.headers.Authorization = `Bearer ${token}`
     }
     return config
   })
   ```

4. **处理 401 错误**：在响应拦截器中自动登出

   ```typescript
   axios.interceptors.response.use(
     (response) => response,
     (error) => {
       if (error.response?.status === 401) {
         useAuthStore.getState().logout()
         window.location.href = '/login'
       }
       return Promise.reject(error)
     },
   )
   ```

### 注意事项

- Token 存储在 localStorage 中，请确保使用 HTTPS
- 敏感操作前应验证 token 的有效性
- 建议配合路由守卫使用，保护需要认证的页面
- 定期刷新 token 以保持会话活跃
