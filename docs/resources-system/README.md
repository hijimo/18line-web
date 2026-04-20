# Resources 系统使用指南

## 概述

Resources 系统是从 Refine 框架移植过来的核心功能，用于统一管理应用中的资源（页面、路由、菜单）配置。通过声明式的方式定义资源，系统会自动生成对应的菜单项和路由。

## 核心概念

### 什么是 Resource？

Resource（资源）代表应用中的一个实体或功能模块，例如：用户管理、产品管理、订单管理等。每个资源可以包含多个操作页面：

- **list**: 列表页
- **create**: 创建页
- **edit**: 编辑页
- **show**: 详情页
- **clone**: 克隆页

## 快速开始

### 1. 定义 Resources

在 `src/router.tsx` 中定义你的资源配置：

```tsx
import { UserOutlined, TeamOutlined, ShoppingOutlined } from '@ant-design/icons';
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
    name: 'users',
    list: '/users',
    create: '/users/create',
    edit: '/users/:id/edit',
    show: '/users/:id',
    meta: {
      label: '用户管理',
      icon: <UserOutlined />,
    },
  },
  {
    name: 'products',
    list: '/products',
    create: '/products/create',
    edit: '/products/:id/edit',
    meta: {
      label: '产品管理',
      icon: <ShoppingOutlined />,
    },
  },
];
```

### 2. 应用 Resources

在路由配置中使用 `ResourceContextProvider` 包裹你的布局：

```tsx
const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <ResourceContextProvider resources={resources}>
          <ThemedLayout Header={Header} Title={renderTitle} Sider={renderSider}>
            <Outlet />
          </ThemedLayout>
        </ResourceContextProvider>
      </AuthProvider>
    ),
    children: [
      // 你的路由配置
    ],
  },
]);
```

### 3. 自动生成菜单

配置完成后，侧边栏会自动根据 resources 生成菜单项，无需手动配置菜单。

## ResourceProps 配置详解

### 基础属性

```typescript
interface ResourceProps {
  // 资源名称（必填）
  name: string;
  
  // 资源标识符（可选，默认使用 name）
  identifier?: string;
  
  // 列表页路径
  list?: string;
  
  // 创建页路径
  create?: string;
  
  // 编辑页路径（支持参数，如 :id）
  edit?: string;
  
  // 详情页路径（支持参数，如 :id）
  show?: string;
  
  // 克隆页路径（支持参数，如 :id）
  clone?: string;
  
  // 元数据配置
  meta?: ResourceMeta;
}
```

### Meta 配置

```typescript
interface ResourceMeta {
  // 显示标签（用于菜单、面包屑等）
  label?: string;
  
  // 图标（React 节点）
  icon?: ReactNode;
  
  // 是否在侧边栏隐藏
  hide?: boolean;
  
  // 父资源名称（用于嵌套菜单）
  parent?: string;
  
  // 是否可删除
  canDelete?: boolean;
  
  // 专用数据提供者名称
  dataProviderName?: string;
  
  // 其他自定义属性
  [key: string]: any;
}
```

## 高级用法

### 嵌套菜单

通过 `meta.parent` 属性可以创建嵌套菜单：

```tsx
const resources: ResourceProps[] = [
  {
    name: 'system',
    list: '/system',
    meta: {
      label: '系统管理',
      icon: <SettingOutlined />,
    },
  },
  {
    name: 'users',
    list: '/system/users',
    meta: {
      label: '用户管理',
      icon: <UserOutlined />,
      parent: 'system', // 嵌套在 system 下
    },
  },
  {
    name: 'roles',
    list: '/system/roles',
    meta: {
      label: '角色管理',
      icon: <TeamOutlined />,
      parent: 'system', // 嵌套在 system 下
    },
  },
];
```

### 隐藏菜单项

某些资源不需要在菜单中显示：

```tsx
{
  name: 'profile',
  list: '/profile',
  edit: '/profile/edit',
  meta: {
    label: '个人资料',
    hide: true, // 不在菜单中显示
  },
}
```

### 使用 identifier

当多个资源使用相同的 name 时，使用 identifier 区分：

```tsx
{
  name: 'products',
  identifier: 'admin-products',
  list: '/admin/products',
  meta: {
    label: '管理员产品',
  },
}
```

## 使用 useMenu Hook

在自定义组件中使用 `useMenu` hook 获取菜单数据：

```tsx
import { useMenu } from '@/hooks/menu';

function CustomMenu() {
  const { menuItems, selectedKey, defaultOpenKeys } = useMenu();
  
  return (
    <Menu
      items={menuItems}
      selectedKeys={[selectedKey]}
      defaultOpenKeys={defaultOpenKeys}
    />
  );
}
```

## 使用 ResourceContext

在组件中访问资源配置：

```tsx
import { useResourceContext } from '@/contexts/resource';

function MyComponent() {
  const { resources } = useResourceContext();
  
  // 查找特定资源
  const userResource = resources.find(r => r.name === 'users');
  
  return <div>{/* 使用资源信息 */}</div>;
}
```

## 完整示例

```tsx
// src/router.tsx
import { createBrowserRouter, Outlet } from 'react-router';
import {
  HomeOutlined,
  UserOutlined,
  TeamOutlined,
  ShoppingOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { ResourceContextProvider } from './contexts/resource';
import type { ResourceProps } from './types/resource';

// 定义资源
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
    name: 'users',
    list: '/users',
    create: '/users/create',
    edit: '/users/:id/edit',
    show: '/users/:id',
    meta: {
      label: '用户管理',
      icon: <UserOutlined />,
    },
  },
  {
    name: 'products',
    list: '/products',
    create: '/products/create',
    edit: '/products/:id/edit',
    show: '/products/:id',
    meta: {
      label: '产品管理',
      icon: <ShoppingOutlined />,
    },
  },
  {
    name: 'system',
    list: '/system',
    meta: {
      label: '系统管理',
      icon: <SettingOutlined />,
    },
  },
  {
    name: 'roles',
    list: '/system/roles',
    create: '/system/roles/create',
    edit: '/system/roles/:id/edit',
    meta: {
      label: '角色管理',
      icon: <TeamOutlined />,
      parent: 'system',
    },
  },
];

// 创建路由
const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <ResourceContextProvider resources={resources}>
          <ThemedLayout Header={Header} Title={renderTitle} Sider={renderSider}>
            <Outlet />
          </ThemedLayout>
        </ResourceContextProvider>
      </AuthProvider>
    ),
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/users', element: <UserList /> },
      { path: '/users/create', element: <UserCreate /> },
      { path: '/users/:id/edit', element: <UserEdit /> },
      { path: '/users/:id', element: <UserShow /> },
      { path: '/products', element: <ProductList /> },
      { path: '/products/create', element: <ProductCreate /> },
      { path: '/products/:id/edit', element: <ProductEdit /> },
      { path: '/products/:id', element: <ProductShow /> },
      { path: '/system', element: <SystemDashboard /> },
      { path: '/system/roles', element: <RoleList /> },
      { path: '/system/roles/create', element: <RoleCreate /> },
      { path: '/system/roles/:id/edit', element: <RoleEdit /> },
    ],
  },
]);

export default router;
```

## 注意事项

1. **路由参数**: 编辑、详情等页面的路由支持参数（如 `:id`），系统会自动识别
2. **菜单生成**: 只有配置了 `list` 属性的资源才会在菜单中显示
3. **路由匹配**: 系统会根据当前路由自动高亮对应的菜单项
4. **嵌套层级**: 支持多层嵌套，但建议不超过 3 层以保持菜单简洁

## 迁移指南

### 从手动配置菜单迁移

**之前（手动配置）：**

```tsx
const menuItems = [
  { key: 'users', label: '用户管理', route: '/users', icon: <UserOutlined /> },
  { key: 'products', label: '产品管理', route: '/products', icon: <ShoppingOutlined /> },
];

<ThemedSider menuItems={menuItems} />
```

**现在（使用 resources）：**

```tsx
const resources = [
  {
    name: 'users',
    list: '/users',
    meta: { label: '用户管理', icon: <UserOutlined /> },
  },
  {
    name: 'products',
    list: '/products',
    meta: { label: '产品管理', icon: <ShoppingOutlined /> },
  },
];

<ResourceContextProvider resources={resources}>
  <ThemedSider />
</ResourceContextProvider>
```

## 相关文件

- `src/types/resource.ts` - 资源类型定义
- `src/contexts/resource/` - 资源上下文
- `src/hooks/menu/` - 菜单相关 Hooks
- `src/components/layout/ThemedSider/` - 侧边栏组件
- `src/router.tsx` - 路由配置示例
