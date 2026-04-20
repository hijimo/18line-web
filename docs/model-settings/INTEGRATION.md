# 模型设置页面集成指南

## 路由配置

### 1. 添加路由到 router.tsx

在 `src/router.tsx` 文件中添加模型设置页面的路由配置：

```tsx
import { SettingOutlined } from '@ant-design/icons';
import ModelSettings from './pages/model-settings';

// 在 resources 数组中添加新资源
const resources: ResourceProps[] = [
  // ... 现有资源
  {
    name: 'model-settings',
    list: '/model-settings',
    meta: {
      label: '模型设置',
      icon: <SettingOutlined />,
    },
  },
];

// 在路由配置的 children 中添加路由
{
  path: '/model-settings',
  element: <ModelSettings />,
},
```

### 2. 完整的路由配置示例

```tsx
import {
  HomeOutlined,
  MessageOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { createBrowserRouter, Outlet } from 'react-router';
import Header from '@/components/Header';
import {
  ThemedLayout,
  ThemedSider,
  ThemedTitle,
  type LayoutThemedTitleProps,
} from '@/components/Layout';
import { AuthProvider } from './components/AuthProvider';
import Layout from './components/Layout/Layout';
import { ResourceContextProvider } from './contexts/resource';
import Chat from './pages/chat';
import Index from './pages/Index';
import Login from './pages/Login';
import ModelSettings from './pages/model-settings';
import Notfound from './pages/Notfound';
import Tenants from './pages/tenants';
import Users from './pages/users';
import type { ResourceProps } from './types/resource';

const resources: ResourceProps[] = [
  {
    name: 'dashboard',
    list: '/',
    meta: {
      label: '首页',
      icon: <HomeOutlined />,
    },
  },
  {
    name: 'chat',
    list: '/chat',
    meta: {
      label: '聊天会话',
      icon: <MessageOutlined />,
    },
  },
  {
    name: 'tenants',
    list: '/tenants',
    meta: {
      label: '租户管理',
      icon: <TeamOutlined />,
    },
  },
  {
    name: 'users',
    list: '/users',
    meta: {
      label: '用户管理',
      icon: <UserOutlined />,
    },
  },
  {
    name: 'model-settings',
    list: '/model-settings',
    meta: {
      label: '模型设置',
      icon: <SettingOutlined />,
    },
  },
];

const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      {
        path: '/login',
        element: <Login />,
      },
      {
        element: (
          <ResourceContextProvider resources={resources}>
            <ThemedLayout Header={Header} Title={renderTitle} Sider={renderSider}>
              <Outlet />
            </ThemedLayout>
          </ResourceContextProvider>
        ),
        children: [
          {
            path: '/',
            element: (
              <Layout>
                <Index />
              </Layout>
            ),
          },
          {
            path: '/chat',
            element: <Chat />,
          },
          {
            path: '/tenants',
            element: <Tenants />,
          },
          {
            path: '/users',
            element: <Users />,
          },
          {
            path: '/model-settings',
            element: <ModelSettings />,
          },
          {
            path: '*',
            element: (
              <Layout>
                <Notfound />
              </Layout>
            ),
          },
        ],
      },
    ],
  },
]);

export default router;
```

## 权限控制

### 1. 添加权限检查（可选）

如果需要权限控制，可以在路由配置中添加权限检查：

```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';

{
  path: '/model-settings',
  element: (
    <ProtectedRoute requiredRole={['system_admin', 'tenant_admin']}>
      <ModelSettings />
    </ProtectedRoute>
  ),
}
```

### 2. 基于角色的功能限制

在组件内部根据用户角色限制功能：

```tsx
import { useAuthStore } from '@/stores/authStore';

const ModelConfigList: React.FC = () => {
  const { user } = useAuthStore();
  const isSystemAdmin = user?.role === 'system_admin';

  // 只有系统管理员可以看到所有租户的配置
  const { data } = useModelConfigurations({
    tenantId: isSystemAdmin ? undefined : user?.tenantId,
  });

  // ...
};
```

## 菜单配置

### 1. 菜单图标

使用 Ant Design 图标库中的图标：

```tsx
import { SettingOutlined } from '@ant-design/icons';

// 在 resources 配置中使用
meta: {
  label: '模型设置',
  icon: <SettingOutlined />,
}
```

### 2. 菜单排序

在 `resources` 数组中调整顺序来控制菜单显示顺序。

### 3. 子菜单（可选）

如果需要子菜单，可以使用嵌套结构：

```tsx
{
  name: 'settings',
  meta: {
    label: '系统设置',
    icon: <SettingOutlined />,
  },
  children: [
    {
      name: 'model-settings',
      list: '/settings/model-settings',
      meta: {
        label: '模型设置',
      },
    },
    {
      name: 'system-settings',
      list: '/settings/system',
      meta: {
        label: '系统配置',
      },
    },
  ],
}
```

## 依赖检查

### 1. 确认已安装的依赖

```bash
# 检查 package.json 中是否包含以下依赖
yarn list --pattern "@tanstack/react-query"
yarn list --pattern "antd"
yarn list --pattern "react-router"
```

### 2. 必需的依赖

```json
{
  "dependencies": {
    "@ant-design/pro-components": "^2.x",
    "@tanstack/react-query": "^5.x",
    "antd": "^5.x",
    "react": "^18.x",
    "react-router": "^7.x"
  }
}
```

## 测试集成

### 1. 访问页面

启动开发服务器后，访问：

```
http://localhost:3000/model-settings
```

### 2. 检查菜单

确认左侧菜单中显示"模型设置"菜单项。

### 3. 测试功能

- 查看模型列表
- 创建新配置
- 启用/禁用模型
- 编辑配置
- 删除配置

## 常见问题

### Q1: 页面无法访问，显示 404

**解决方法：**

1. 检查路由配置是否正确添加
2. 确认组件导入路径正确
3. 重启开发服务器

### Q2: 菜单中没有显示"模型设置"

**解决方法：**

1. 检查 `resources` 数组中是否添加了配置
2. 确认 `meta.label` 和 `meta.icon` 是否正确
3. 检查权限配置

### Q3: API 请求失败

**解决方法：**

1. 检查后端服务是否启动
2. 确认 API 代理配置正确
3. 查看浏览器控制台的网络请求
4. 检查 API Key 和权限

### Q4: 样式显示异常

**解决方法：**

1. 确认 Tailwind CSS 配置正确
2. 检查 Ant Design 主题配置
3. 清除浏览器缓存
4. 重新构建项目

## 环境变量配置

如果需要配置 API 地址等环境变量：

```env
# .env.development
VITE_API_BASE_URL=http://localhost:8080
VITE_API_TIMEOUT=10000

# .env.production
VITE_API_BASE_URL=https://api.production.com
VITE_API_TIMEOUT=30000
```

在代码中使用：

```tsx
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
```

## 性能优化

### 1. 代码分割

使用 React.lazy 延迟加载页面：

```tsx
import { lazy } from 'react';

const ModelSettings = lazy(() => import('./pages/model-settings'));

// 在路由中使用 Suspense
{
  path: '/model-settings',
  element: (
    <Suspense fallback={<div>加载中...</div>}>
      <ModelSettings />
    </Suspense>
  ),
}
```

### 2. React Query 缓存配置

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟
      gcTime: 10 * 60 * 1000, // 10分钟
      retry: 1,
    },
  },
});
```

## 部署注意事项

### 1. 构建生产版本

```bash
yarn build
```

### 2. 检查构建产物

```bash
yarn preview
```

### 3. 环境变量

确保生产环境的环境变量配置正确。

### 4. API 代理

生产环境需要配置 Nginx 或其他反向代理来处理 API 请求。

## 下一步

1. 根据实际需求调整页面布局和样式
2. 添加更多功能（如批量操作、导入导出等）
3. 完善错误处理和用户提示
4. 添加单元测试和 E2E 测试
5. 优化性能和用户体验
