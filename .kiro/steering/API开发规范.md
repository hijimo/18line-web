---
inclusion: fileMatch
fileMatchPattern: 'src/**/{api,services,hooks}/**/*.{ts,tsx}'
---

# API 开发规范

## API 客户端配置

### Axios 实例配置

```typescript
import axios from 'axios'
import Cookies from 'js-cookie'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 统一错误处理
    if (error.response?.status === 401) {
      // 处理未授权
    }
    return Promise.reject(error)
  },
)
```

## API 服务层

### 服务文件组织

```
src/
  services/
    api/
      user.ts       # 用户相关 API
      product.ts    # 产品相关 API
      index.ts      # 导出所有 API
    types/
      user.ts       # 用户类型定义
      product.ts    # 产品类型定义
```

### API 函数定义

```typescript
// src/services/api/user.ts
import { apiClient } from './client'
import type { User, UserCreateInput } from '../types/user'

export const userApi = {
  // 获取用户列表
  getUsers: async (): Promise<User[]> => {
    return apiClient.get('/users')
  },

  // 获取单个用户
  getUser: async (id: string): Promise<User> => {
    return apiClient.get(`/users/${id}`)
  },

  // 创建用户
  createUser: async (data: UserCreateInput): Promise<User> => {
    return apiClient.post('/users', data)
  },

  // 更新用户
  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    return apiClient.put(`/users/${id}`, data)
  },

  // 删除用户
  deleteUser: async (id: string): Promise<void> => {
    return apiClient.delete(`/users/${id}`)
  },
}
```

## React Query 集成

### 查询 Hooks

```typescript
// src/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi } from '@/services/api/user'
import type { User, UserCreateInput } from '@/services/types/user'

// 查询键工厂
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
}

// 获取用户列表
export const useUsers = () => {
  return useQuery({
    queryKey: userKeys.lists(),
    queryFn: userApi.getUsers,
  })
}

// 获取单个用户
export const useUser = (id: string) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userApi.getUser(id),
    enabled: !!id,
  })
}

// 创建用户
export const useCreateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

// 更新用户
export const useUpdateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      userApi.updateUser(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

// 删除用户
export const useDeleteUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}
```

### 在组件中使用

```typescript
import { useUsers, useCreateUser } from '@/hooks/useUsers';
import { message } from 'antd';

const UserList = () => {
  const { data: users, isLoading, error } = useUsers();
  const createUser = useCreateUser();

  const handleCreate = async (values: UserCreateInput) => {
    try {
      await createUser.mutateAsync(values);
      message.success('用户创建成功');
    } catch (error) {
      message.error('用户创建失败');
    }
  };

  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>加载失败</div>;

  return (
    <div>
      {users?.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
};
```

## 类型定义

### API 响应类型

```typescript
// src/services/types/common.ts
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
```

### 实体类型

```typescript
// src/services/types/user.ts
export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

export interface UserCreateInput {
  name: string
  email: string
  password: string
}

export interface UserUpdateInput {
  name?: string
  email?: string
  avatar?: string
}
```

## 错误处理

### 统一错误处理

```typescript
import { message } from 'antd'

export const handleApiError = (error: any) => {
  if (error.response) {
    // 服务器返回错误
    const { status, data } = error.response

    switch (status) {
      case 400:
        message.error(data.message || '请求参数错误')
        break
      case 401:
        message.error('未授权，请重新登录')
        // 跳转到登录页
        break
      case 403:
        message.error('没有权限访问')
        break
      case 404:
        message.error('请求的资源不存在')
        break
      case 500:
        message.error('服务器错误')
        break
      default:
        message.error(data.message || '请求失败')
    }
  } else if (error.request) {
    // 请求已发送但没有收到响应
    message.error('网络错误，请检查网络连接')
  } else {
    // 其他错误
    message.error(error.message || '未知错误')
  }
}
```

## 最佳实践

1. **使用 TypeScript**: 为所有 API 定义类型
2. **统一错误处理**: 在拦截器中处理通用错误
3. **使用 React Query**: 管理服务端状态和缓存
4. **查询键管理**: 使用工厂函数管理查询键
5. **乐观更新**: 在适当的场景使用乐观更新
6. **请求取消**: 使用 AbortController 取消请求
7. **重试策略**: 为失败的请求配置重试策略
8. **缓存策略**: 根据数据特性配置合适的缓存时间
