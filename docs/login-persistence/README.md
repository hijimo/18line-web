# 登录状态持久化

## 概述

实现了用户登录状态的持久化功能，用户登录后即使刷新页面或关闭浏览器（如果选择"记住我"），也能保持登录状态。

## 功能特性

- ✅ 自动恢复登录状态
- ✅ 页面刷新时自动获取用户信息
- ✅ Token 过期自动跳转登录页
- ✅ 支持"记住我"功能
- ✅ 非登录页面自动验证身份

## 技术实现

### 核心组件

#### AuthProvider

认证提供者组件，负责在应用启动时恢复登录状态。

**位置**: `src/components/AuthProvider.tsx`

**功能**:

1. 检测当前页面是否为登录页
2. 如果不是登录页且存在 token，自动调用 `useCurrentUser` 获取用户信息
3. 获取成功后更新 authStore 中的用户信息和认证状态
4. 获取失败（如 token 过期）时清除认证状态并跳转到登录页

### 状态管理

使用 Zustand 的 `persist` 中间件实现状态持久化：

```typescript
// src/stores/authStore.ts
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // ... 状态和方法
    }),
    {
      name: 'auth-storage',
      // 根据 rememberMe 决定是否持久化
      partialize: (state) =>
        state.rememberMe
          ? {
              isAuthenticated: state.isAuthenticated,
              user: state.user,
              token: state.token,
              rememberMe: state.rememberMe,
            }
          : { rememberMe: false },
    },
  ),
)
```

### 工作流程

```
应用启动
    ↓
AuthProvider 初始化
    ↓
检查是否为登录页？
    ↓ 否
检查是否有 token？
    ↓ 是
调用 useCurrentUser 获取用户信息
    ↓
获取成功？
    ↓ 是
更新 authStore 用户信息
    ↓
保持登录状态
```

如果获取失败：

```
Token 过期或无效
    ↓
清除认证状态
    ↓
跳转到登录页
```

## 使用方式

### 1. 路由配置集成

在 `router.tsx` 中已集成 `AuthProvider` 作为根布局：

```tsx
const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      // 所有路由...
    ],
  },
])
```

这样 `AuthProvider` 可以访问路由上下文（useLocation、useNavigate）。

### 2. 登录时保存状态

在登录页面调用 `authStore.login()` 时传入 `remember` 参数：

```tsx
// src/pages/Login/index.tsx
authStore.login(accessToken, user, values.remember)
```

### 3. 在组件中使用认证状态

```tsx
import { useAuthStore } from '@/stores/authStore'

const MyComponent = () => {
  const { isAuthenticated, user, token } = useAuthStore()

  if (!isAuthenticated) {
    return <div>请先登录</div>
  }

  return <div>欢迎，{user?.displayName}</div>
}
```

## 配置说明

### React Query 配置

在 `src/hooks/services/useAuthentication.ts` 中配置了用户信息的缓存策略：

```typescript
export const useCurrentUser = (enabled = true) => {
  return useQuery<UserDataResponse, Error>({
    queryKey: authKeys.me(),
    queryFn: () => authService.getAuthMe(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 分钟内不重新获取
    gcTime: 10 * 60 * 1000, // 10 分钟后清除缓存
  })
}
```

### 持久化存储

- **存储位置**: localStorage
- **存储键名**: `auth-storage`
- **存储内容**: 根据 `rememberMe` 决定
  - `rememberMe = true`: 存储完整认证信息（token、user、isAuthenticated）
  - `rememberMe = false`: 仅存储 rememberMe 标志

## 安全考虑

1. **Token 验证**: 每次应用启动时都会验证 token 的有效性
2. **自动登出**: Token 过期时自动清除认证状态
3. **敏感信息**: Token 存储在 localStorage 中，建议使用 HTTPS
4. **记住我选项**: 用户可以选择是否持久化登录状态

## 注意事项

1. **登录页面不验证**: 在登录页面不会调用 `useCurrentUser`，避免不必要的请求
2. **路由保护**: 需要配合路由守卫使用，保护需要认证的页面
3. **Token 刷新**: 如需实现 token 自动刷新，可以在 `AuthProvider` 中添加相关逻辑
4. **多标签页同步**: Zustand persist 支持多标签页状态同步

## 相关文件

- `src/components/AuthProvider.tsx` - 认证提供者组件
- `src/stores/authStore.ts` - 认证状态管理
- `src/hooks/services/useAuthentication.ts` - 认证相关 Hooks
- `src/pages/Login/index.tsx` - 登录页面
- `src/App.tsx` - 应用入口

## 后续优化建议

1. **添加路由守卫**: 创建 `ProtectedRoute` 组件保护需要认证的路由
2. **Token 自动刷新**: 在 token 即将过期时自动刷新
3. **加载状态**: 在验证身份时显示加载动画
4. **错误处理**: 更细粒度的错误处理和用户提示
5. **权限管理**: 基于用户角色的权限控制
