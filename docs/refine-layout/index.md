# Refine 布局组件文档索引

欢迎使用 Refine 布局组件系统！这是一套从 Refine 框架移植的完整布局解决方案。

## 📚 文档导航

### 新手入门

1. **[总结文档 (SUMMARY.md)](./SUMMARY.md)** ⭐ 推荐首先阅读
   - 移植完成情况
   - 已创建的文件列表
   - 核心功能概览
   - 快速开始示例

2. **[快速开始 (quick-start.md)](./quick-start.md)**
   - 安装依赖
   - 基础使用
   - 完整示例
   - 常见配置

### 深入了解

3. **[功能概述 (README.md)](./README.md)**
   - 功能特性
   - 核心组件介绍
   - 使用示例
   - 响应式设计
   - 主题定制

4. **[API 文档 (api.md)](./api.md)**
   - 组件 API
   - Hooks API
   - Context API
   - 类型定义
   - 事件处理

5. **[实现文档 (implementation.md)](./implementation.md)**
   - 移植概述
   - 技术实现
   - 保留的功能
   - 移除的功能
   - 扩展建议

## 🚀 快速开始

### 最简单的使用

```tsx
import { ThemedLayout } from '@/components/layout';

function App() {
  return (
    <ThemedLayout>
      <div>你的内容</div>
    </ThemedLayout>
  );
}
```

### 完整配置

```tsx
import { ThemedLayout, ThemedSider, ThemedHeader } from '@/components/layout';
import type { MenuItem } from '@/components/layout';
import { DashboardOutlined, UserOutlined } from '@ant-design/icons';

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

const CustomSider = (props: any) => (
  <ThemedSider
    {...props}
    menuItems={menuItems}
    selectedKey="dashboard"
    showLogout={true}
    onLogout={() => console.log('logout')}
  />
);

const CustomHeader = () => (
  <ThemedHeader
    sticky={true}
    user={{ name: '张三', avatar: 'https://example.com/avatar.jpg' }}
  />
);

function App() {
  return (
    <ThemedLayout
      Sider={CustomSider}
      Header={CustomHeader}
    >
      <div>你的内容</div>
    </ThemedLayout>
  );
}
```

## 📦 组件列表

### 核心组件

| 组件 | 说明 | 文档 |
|------|------|------|
| `ThemedLayout` | 主布局组件 | [API](./api.md#themedlayout) |
| `ThemedSider` | 侧边栏组件 | [API](./api.md#themedsider) |
| `ThemedHeader` | 头部组件 | [API](./api.md#themedheader) |
| `ThemedTitle` | 标题组件 | [API](./api.md#themedtitle) |

### Hooks

| Hook | 说明 | 文档 |
|------|------|------|
| `useThemedLayoutContext` | 获取布局上下文 | [API](./api.md#usethemedlayoutcontext) |

### Context

| Context | 说明 | 文档 |
|---------|------|------|
| `ThemedLayoutContextProvider` | 布局上下文提供者 | [API](./api.md#themedlayoutcontextprovider) |

## 🎯 核心功能

- ✅ 响应式布局设计
- ✅ 可折叠侧边栏
- ✅ 移动端抽屉式导航
- ✅ 自定义标题和图标
- ✅ 用户信息显示
- ✅ 树形菜单结构
- ✅ 主题集成（Ant Design）
- ✅ TypeScript 类型支持

## 📖 示例代码

查看完整示例：[src/examples/LayoutExample.tsx](../../src/examples/LayoutExample.tsx)

## 🔧 技术栈

- React 18.3+
- TypeScript 5.8+
- Ant Design 5.25+
- React Router 7.6+

## 📝 文件结构

```
src/components/layout/
├── ThemedLayout/
│   └── index.tsx                    # 主布局组件
├── ThemedSider/
│   ├── index.tsx                    # 侧边栏组件
│   └── styles.ts                    # 样式定义
├── ThemedHeader/
│   └── index.tsx                    # 头部组件
├── ThemedTitle/
│   └── index.tsx                    # 标题组件
├── context/
│   └── ThemedLayoutContext.tsx      # 布局上下文
├── hooks/
│   └── useThemedLayoutContext.ts    # 上下文 Hook
├── types.ts                         # 类型定义
└── index.ts                         # 导出文件
```

## 🎨 主题定制

```tsx
import { ConfigProvider } from 'antd';

<ConfigProvider
  theme={{
    token: {
      colorPrimary: '#1890ff',
      colorBgContainer: '#ffffff',
      colorBgElevated: '#f5f5f5',
    },
  }}
>
  <ThemedLayout>
    <YourContent />
  </ThemedLayout>
</ConfigProvider>
```

## 🌍 国际化

```tsx
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

<ConfigProvider locale={zhCN}>
  <ThemedLayout>
    <YourContent />
  </ThemedLayout>
</ConfigProvider>
```

## 🔗 相关链接

- [Refine 官方文档](https://refine.dev/)
- [Ant Design 文档](https://ant.design/)
- [React Router 文档](https://reactrouter.com/)

## ❓ 常见问题

### 如何修改主题颜色？

使用 Ant Design 的 ConfigProvider 组件。详见 [API 文档](./api.md#样式定制)。

### 如何根据路由高亮菜单？

使用 `useLocation` Hook 获取当前路由。详见 [快速开始](./quick-start.md#路由集成)。

### 如何添加权限控制？

在传递 menuItems 前进行过滤。详见 [实现文档](./implementation.md#扩展建议)。

### 如何持久化侧边栏状态？

使用 localStorage 保存状态。详见 [API 文档](./api.md#事件处理)。

## 📞 技术支持

如有问题，请：

1. 查看相关文档
2. 查看示例代码
3. 提交 Issue

## 📄 许可证

本项目基于 Refine 框架移植，遵循 MIT 许可证。

---

**最后更新**: 2025-10-23

**版本**: v1.0.0

**状态**: ✅ 生产就绪
