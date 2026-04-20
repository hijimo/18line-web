# Refine 布局组件移植文档

## 概述

本文档介绍了从 Refine 框架移植的布局组件系统，包括 `ThemedLayout`、`ThemedSider`、`ThemedHeader` 和 `ThemedTitle` 组件。

## 功能特性

- ✅ 响应式布局设计
- ✅ 可折叠侧边栏
- ✅ 移动端抽屉式导航
- ✅ 自定义标题和图标
- ✅ 用户信息显示
- ✅ 树形菜单结构
- ✅ 主题集成（Ant Design）
- ✅ TypeScript 类型支持

## 目录结构

```
src/
├── components/
│   └── layout/
│       ├── ThemedLayout/
│       │   └── index.tsx          # 主布局组件
│       ├── ThemedSider/
│       │   ├── index.tsx          # 侧边栏组件
│       │   └── styles.ts          # 样式定义
│       ├── ThemedHeader/
│       │   └── index.tsx          # 头部组件
│       ├── ThemedTitle/
│       │   └── index.tsx          # 标题组件
│       ├── context/
│       │   └── ThemedLayoutContext.tsx  # 布局上下文
│       ├── hooks/
│       │   └── useThemedLayoutContext.ts  # 上下文 Hook
│       ├── types.ts               # 类型定义
│       └── index.ts               # 导出文件
└── types/
    └── resource.ts                # 资源类型定义
```

## 核心组件

### ThemedLayout

主布局组件，提供完整的应用布局结构。

**属性：**

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| children | ReactNode | 否 | - | 子元素 |
| Sider | React.FC | 否 | ThemedSider | 侧边栏组件 |
| Header | React.FC | 否 | ThemedHeader | 头部组件 |
| Title | React.FC | 否 | ThemedTitle | 标题组件 |
| Footer | React.FC | 否 | - | 底部组件 |
| OffLayoutArea | React.FC | 否 | - | 布局外区域组件 |
| initialSiderCollapsed | boolean | 否 | false | 初始侧边栏折叠状态 |
| onSiderCollapsed | (collapsed: boolean) => void | 否 | - | 侧边栏折叠状态变化回调 |

### ThemedSider

侧边栏组件，提供响应式导航菜单。

**属性：**

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| Title | React.FC | 否 | ThemedTitle | 标题组件 |
| render | (props) => ReactNode | 否 | - | 自定义渲染函数 |
| meta | Record<string, unknown> | 否 | - | 元数据 |
| fixed | boolean | 否 | false | 是否固定侧边栏 |
| activeItemDisabled | boolean | 否 | false | 是否禁用激活项 |
| siderItemsAreCollapsed | boolean | 否 | true | 侧边栏项是否折叠 |
| menuItems | MenuItem[] | 否 | [] | 菜单项列表 |
| selectedKey | string | 否 | - | 当前选中的菜单项 |
| defaultOpenKeys | string[] | 否 | [] | 默认展开的菜单项 |
| onLogout | () => void | 否 | - | 登出回调 |
| showLogout | boolean | 否 | false | 是否显示登出按钮 |

### ThemedHeader

头部组件，显示用户信息。

**属性：**

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| sticky | boolean | 否 | false | 是否固定头部 |
| user | UserIdentity | 否 | - | 用户信息 |

### ThemedTitle

标题组件，显示应用标题和图标。

**属性：**

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| collapsed | boolean | 是 | - | 是否折叠 |
| icon | ReactNode | 否 | - | 图标元素 |
| text | ReactNode | 否 | 'Refine Project' | 文本内容 |
| wrapperStyles | CSSProperties | 否 | - | 包装器样式 |

## 使用示例

### 基础使用

```tsx
import React from 'react';
import { ThemedLayout } from '@/components/layout';
import { AppstoreOutlined } from '@ant-design/icons';

function App() {
  return (
    <ThemedLayout
      initialSiderCollapsed={false}
      onSiderCollapsed={(collapsed) => {
        console.log('侧边栏折叠状态:', collapsed);
      }}
    >
      <div>应用内容</div>
    </ThemedLayout>
  );
}

export default App;
```

### 自定义标题

```tsx
import React from 'react';
import { ThemedLayout, ThemedTitle } from '@/components/layout';
import { AppstoreOutlined } from '@ant-design/icons';

const CustomTitle = ({ collapsed }: { collapsed: boolean }) => {
  return (
    <ThemedTitle
      collapsed={collapsed}
      icon={<AppstoreOutlined />}
      text="我的应用"
    />
  );
};

function App() {
  return (
    <ThemedLayout Title={CustomTitle}>
      <div>应用内容</div>
    </ThemedLayout>
  );
}

export default App;
```

### 配置菜单项

```tsx
import React from 'react';
import { ThemedLayout, ThemedSider } from '@/components/layout';
import type { MenuItem } from '@/components/layout';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    name: '仪表盘',
    label: '仪表盘',
    icon: <DashboardOutlined />,
    route: '/dashboard',
    children: [],
  },
  {
    key: 'users',
    name: '用户管理',
    label: '用户管理',
    icon: <UserOutlined />,
    route: '/users',
    children: [],
  },
  {
    key: 'settings',
    name: '设置',
    label: '设置',
    icon: <SettingOutlined />,
    route: '/settings',
    children: [],
  },
];

const CustomSider = (props: any) => {
  return (
    <ThemedSider
      {...props}
      menuItems={menuItems}
      selectedKey="dashboard"
      showLogout={true}
      onLogout={() => {
        console.log('用户登出');
      }}
    />
  );
};

function App() {
  return (
    <ThemedLayout Sider={CustomSider}>
      <div>应用内容</div>
    </ThemedLayout>
  );
}

export default App;
```

### 嵌套菜单

```tsx
const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    name: '仪表盘',
    label: '仪表盘',
    icon: <DashboardOutlined />,
    route: '/dashboard',
    children: [],
  },
  {
    key: 'system',
    name: '系统管理',
    label: '系统管理',
    icon: <SettingOutlined />,
    route: '/system',
    children: [
      {
        key: 'users',
        name: '用户管理',
        label: '用户管理',
        icon: <UserOutlined />,
        route: '/system/users',
        children: [],
      },
      {
        key: 'roles',
        name: '角色管理',
        label: '角色管理',
        icon: <TeamOutlined />,
        route: '/system/roles',
        children: [],
      },
    ],
  },
];
```

### 自定义头部

```tsx
import React from 'react';
import { ThemedLayout, ThemedHeader } from '@/components/layout';

const CustomHeader = () => {
  const user = {
    name: '张三',
    avatar: 'https://example.com/avatar.jpg',
  };

  return <ThemedHeader sticky={true} user={user} />;
};

function App() {
  return (
    <ThemedLayout Header={CustomHeader}>
      <div>应用内容</div>
    </ThemedLayout>
  );
}

export default App;
```

### 完整示例

```tsx
import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemedLayout, ThemedSider, ThemedHeader } from '@/components/layout';
import type { MenuItem } from '@/components/layout';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';

const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    name: '仪表盘',
    label: '仪表盘',
    icon: <DashboardOutlined />,
    route: '/dashboard',
    children: [],
  },
  {
    key: 'users',
    name: '用户管理',
    label: '用户管理',
    icon: <UserOutlined />,
    route: '/users',
    children: [],
  },
  {
    key: 'settings',
    name: '设置',
    label: '设置',
    icon: <SettingOutlined />,
    route: '/settings',
    children: [],
  },
];

const CustomSider = (props: any) => {
  return (
    <ThemedSider
      {...props}
      menuItems={menuItems}
      selectedKey="dashboard"
      showLogout={true}
      onLogout={() => {
        console.log('用户登出');
        // 执行登出逻辑
      }}
    />
  );
};

const CustomHeader = () => {
  const user = {
    name: '张三',
    avatar: 'https://example.com/avatar.jpg',
  };

  return <ThemedHeader sticky={true} user={user} />;
};

function App() {
  const [siderCollapsed, setSiderCollapsed] = useState(false);

  return (
    <BrowserRouter>
      <ThemedLayout
        Sider={CustomSider}
        Header={CustomHeader}
        initialSiderCollapsed={siderCollapsed}
        onSiderCollapsed={setSiderCollapsed}
      >
        <div>
          <h1>欢迎使用应用</h1>
          <p>这是应用的主要内容区域</p>
        </div>
      </ThemedLayout>
    </BrowserRouter>
  );
}

export default App;
```

## 资源配置

### 资源类型定义

```tsx
import type { ResourceProps } from '@/types/resource';

const resources: ResourceProps[] = [
  {
    name: 'users',
    identifier: 'users',
    list: '/users',
    create: '/users/create',
    edit: '/users/:id/edit',
    show: '/users/:id',
    meta: {
      label: '用户管理',
      icon: <UserOutlined />,
      canDelete: true,
    },
  },
  {
    name: 'posts',
    identifier: 'posts',
    list: '/posts',
    create: '/posts/create',
    edit: '/posts/:id/edit',
    show: '/posts/:id',
    meta: {
      label: '文章管理',
      icon: <FileTextOutlined />,
      parent: 'content',
    },
  },
];
```

## 响应式设计

组件会根据屏幕尺寸自动调整：

- **桌面端（lg 及以上）**：显示可折叠的侧边栏
- **移动端（lg 以下）**：显示抽屉式侧边栏，通过按钮触发

## 主题定制

组件使用 Ant Design 的主题系统，可以通过 ConfigProvider 进行定制：

```tsx
import { ConfigProvider, theme } from 'antd';
import { ThemedLayout } from '@/components/layout';

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          colorBgContainer: '#ffffff',
        },
      }}
    >
      <ThemedLayout>
        <div>应用内容</div>
      </ThemedLayout>
    </ConfigProvider>
  );
}
```

## 注意事项

1. **路由依赖**：组件使用 `react-router-dom` 进行路由导航，确保应用已配置路由
2. **Ant Design 版本**：确保使用 Ant Design 5.x 版本
3. **响应式断点**：默认使用 `lg` 断点（992px）区分桌面端和移动端
4. **类型安全**：所有组件都提供完整的 TypeScript 类型定义

## 与 Refine 的差异

本移植版本与原 Refine 框架的主要差异：

1. **简化依赖**：移除了对 `@refinedev/core` 的依赖
2. **独立使用**：可以在任何 React 应用中独立使用
3. **手动配置**：需要手动传递菜单项和用户信息
4. **保留核心功能**：保留了响应式布局、主题集成等核心功能

## 技术栈

- React 18.3+
- TypeScript 5.8+
- Ant Design 5.25+
- React Router 7.6+

## 相关文档

- [Ant Design 布局组件](https://ant.design/components/layout-cn)
- [React Router 文档](https://reactrouter.com/)
- [Refine 官方文档](https://refine.dev/)
