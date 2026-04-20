# 快速开始

## 安装依赖

确保你的项目已安装以下依赖：

```bash
# 使用 yarn
yarn add react react-dom react-router-dom antd @ant-design/icons

# 使用 pnpm
pnpm add react react-dom react-router-dom antd @ant-design/icons
```

## 基础使用

### 1. 最简单的布局

```tsx
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemedLayout } from '@/components/layout';

function App() {
  return (
    <BrowserRouter>
      <ThemedLayout>
        <div>
          <h1>欢迎使用</h1>
          <p>这是你的应用内容</p>
        </div>
      </ThemedLayout>
    </BrowserRouter>
  );
}

export default App;
```

### 2. 添加菜单

```tsx
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemedLayout, ThemedSider } from '@/components/layout';
import type { MenuItem } from '@/components/layout';
import { DashboardOutlined, UserOutlined } from '@ant-design/icons';

// 定义菜单项
const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    name: 'dashboard',
    label: '仪表盘',
    icon: <DashboardOutlined />,
    route: '/dashboard',
    children: [],
  },
  {
    key: 'users',
    name: 'users',
    label: '用户管理',
    icon: <UserOutlined />,
    route: '/users',
    children: [],
  },
];

// 自定义侧边栏
const CustomSider = (props: any) => {
  return (
    <ThemedSider
      {...props}
      menuItems={menuItems}
      selectedKey="dashboard"
    />
  );
};

function App() {
  return (
    <BrowserRouter>
      <ThemedLayout Sider={CustomSider}>
        <div>应用内容</div>
      </ThemedLayout>
    </BrowserRouter>
  );
}

export default App;
```

### 3. 添加用户信息

```tsx
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemedLayout, ThemedSider, ThemedHeader } from '@/components/layout';

// 自定义头部
const CustomHeader = () => {
  const user = {
    name: '张三',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  };

  return <ThemedHeader sticky={true} user={user} />;
};

function App() {
  return (
    <BrowserRouter>
      <ThemedLayout
        Sider={CustomSider}
        Header={CustomHeader}
      >
        <div>应用内容</div>
      </ThemedLayout>
    </BrowserRouter>
  );
}

export default App;
```

### 4. 自定义标题和图标

```tsx
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemedLayout, ThemedTitle } from '@/components/layout';
import { AppstoreOutlined } from '@ant-design/icons';

// 自定义标题
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
    <BrowserRouter>
      <ThemedLayout Title={CustomTitle}>
        <div>应用内容</div>
      </ThemedLayout>
    </BrowserRouter>
  );
}

export default App;
```

## 完整示例

这是一个包含所有功能的完整示例：

```tsx
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { ThemedLayout, ThemedSider, ThemedHeader, ThemedTitle } from '@/components/layout';
import type { MenuItem } from '@/components/layout';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';

// 菜单配置
const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    name: 'dashboard',
    label: '仪表盘',
    icon: <DashboardOutlined />,
    route: '/dashboard',
    children: [],
  },
  {
    key: 'users',
    name: 'users',
    label: '用户管理',
    icon: <UserOutlined />,
    route: '/users',
    children: [],
  },
  {
    key: 'settings',
    name: 'settings',
    label: '系统设置',
    icon: <SettingOutlined />,
    route: '/settings',
    children: [],
  },
];

// 自定义侧边栏
const CustomSider = (props: any) => {
  const location = useLocation();
  const selectedKey = location.pathname.split('/')[1] || 'dashboard';

  return (
    <ThemedSider
      {...props}
      menuItems={menuItems}
      selectedKey={selectedKey}
      showLogout={true}
      onLogout={() => {
        console.log('用户登出');
        // 执行登出逻辑
      }}
    />
  );
};

// 自定义头部
const CustomHeader = () => {
  const user = {
    name: '张三',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  };

  return <ThemedHeader sticky={true} user={user} />;
};

// 自定义标题
const CustomTitle = ({ collapsed }: { collapsed: boolean }) => {
  return (
    <ThemedTitle
      collapsed={collapsed}
      icon={<AppstoreOutlined />}
      text="数据管理平台"
    />
  );
};

// 页面组件
const Dashboard = () => <div><h1>仪表盘</h1></div>;
const Users = () => <div><h1>用户管理</h1></div>;
const Settings = () => <div><h1>系统设置</h1></div>;

// 布局包装器
function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [siderCollapsed, setSiderCollapsed] = useState(() => {
    const saved = localStorage.getItem('siderCollapsed');
    return saved === 'true';
  });

  return (
    <ThemedLayout
      Sider={CustomSider}
      Header={CustomHeader}
      Title={CustomTitle}
      initialSiderCollapsed={siderCollapsed}
      onSiderCollapsed={(collapsed) => {
        setSiderCollapsed(collapsed);
        localStorage.setItem('siderCollapsed', String(collapsed));
      }}
    >
      {children}
    </ThemedLayout>
  );
}

// 主应用
function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <LayoutWrapper>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </LayoutWrapper>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
```

## 下一步

- 查看 [API 文档](./api.md) 了解详细的组件属性
- 查看 [README](./README.md) 了解更多使用场景
- 查看 [示例代码](../../src/examples/LayoutExample.tsx) 获取完整示例

## 常见配置

### 主题配置

```tsx
import { ConfigProvider } from 'antd';

<ConfigProvider
  theme={{
    token: {
      colorPrimary: '#1890ff',
      colorBgContainer: '#ffffff',
    },
  }}
>
  <ThemedLayout>
    <YourContent />
  </ThemedLayout>
</ConfigProvider>
```

### 国际化配置

```tsx
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';

<ConfigProvider locale={zhCN}>
  <ThemedLayout>
    <YourContent />
  </ThemedLayout>
</ConfigProvider>
```

### 路由集成

```tsx
import { useLocation } from 'react-router-dom';

function CustomSider(props: any) {
  const location = useLocation();
  const selectedKey = location.pathname;

  return (
    <ThemedSider
      {...props}
      selectedKey={selectedKey}
    />
  );
}
```

## 故障排除

### 问题：侧边栏不显示

**解决方案**：确保传递了 `menuItems` 属性

```tsx
<ThemedSider menuItems={menuItems} />
```

### 问题：路由跳转不工作

**解决方案**：确保应用被 `BrowserRouter` 包裹

```tsx
<BrowserRouter>
  <ThemedLayout>
    <YourContent />
  </ThemedLayout>
</BrowserRouter>
```

### 问题：样式不正确

**解决方案**：确保导入了 Ant Design 的样式

```tsx
import 'antd/dist/reset.css';
```

### 问题：TypeScript 类型错误

**解决方案**：确保安装了类型定义

```bash
yarn add -D @types/react @types/react-dom @types/react-router-dom
```
