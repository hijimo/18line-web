# Refine 布局组件移植实现文档

## 移植概述

本文档详细说明了从 Refine 框架移植布局组件的实现细节和技术方案。

## 移植的组件

### 1. 核心组件

| 组件 | 源文件 | 目标文件 | 说明 |
|------|--------|----------|------|
| ThemedLayout | `refine-main/packages/antd/src/components/themedLayout/index.tsx` | `src/components/layout/ThemedLayout/index.tsx` | 主布局组件 |
| ThemedSider | `refine-main/packages/antd/src/components/themedLayout/sider/index.tsx` | `src/components/layout/ThemedSider/index.tsx` | 侧边栏组件 |
| ThemedHeader | `refine-main/packages/antd/src/components/themedLayout/header/index.tsx` | `src/components/layout/ThemedHeader/index.tsx` | 头部组件 |
| ThemedTitle | `refine-main/packages/antd/src/components/themedLayout/title/index.tsx` | `src/components/layout/ThemedTitle/index.tsx` | 标题组件 |

### 2. 上下文和 Hooks

| 文件 | 源文件 | 目标文件 | 说明 |
|------|--------|----------|------|
| ThemedLayoutContext | `refine-main/packages/antd/src/contexts/themedLayoutContext/index.tsx` | `src/components/layout/context/ThemedLayoutContext.tsx` | 布局上下文 |
| useThemedLayoutContext | - | `src/components/layout/hooks/useThemedLayoutContext.ts` | 上下文 Hook |

### 3. 类型定义

| 文件 | 源文件 | 目标文件 | 说明 |
|------|--------|----------|------|
| 布局类型 | `refine-main/packages/ui-types/src/types/layout.tsx` | `src/components/layout/types.ts` | 布局组件类型 |
| 资源类型 | `refine-main/packages/core/src/contexts/resource/types.ts` | `src/types/resource.ts` | 资源配置类型 |

## 技术实现

### 1. 依赖简化

**原始依赖：**

```typescript
import { useMenu, useLogout, useIsExistAuthentication } from '@refinedev/core';
```

**移植后：**

```typescript
// 移除了对 @refinedev/core 的依赖
// 通过 props 传递必要的数据和回调函数
interface ThemedSiderProps {
  menuItems?: MenuItem[];
  onLogout?: () => void;
  showLogout?: boolean;
}
```

### 2. 菜单系统

**原始实现：**

- 使用 `useMenu` Hook 自动从 resources 生成菜单
- 集成权限控制 `CanAccess` 组件

**移植后实现：**

- 手动传递 `menuItems` 配置
- 简化权限控制逻辑
- 保留树形菜单结构

```typescript
export interface MenuItem {
  key: string;
  name: string;
  label?: string;
  icon?: React.ReactNode;
  route?: string;
  children: MenuItem[];
  meta?: {
    label?: string;
    icon?: React.ReactNode;
    parent?: string;
    [key: string]: any;
  };
}
```

### 3. 用户认证

**原始实现：**

- 使用 `useGetIdentity` Hook 获取用户信息
- 使用 `useIsExistAuthentication` 检查认证状态

**移植后实现：**

- 通过 props 传递用户信息
- 简化认证逻辑

```typescript
interface ThemedHeaderProps {
  user?: {
    name?: string;
    avatar?: string;
  };
}
```

### 4. 路由集成

**原始实现：**

- 使用 `useLink` Hook 创建链接
- 集成 Refine 的路由系统

**移植后实现：**

- 直接使用 `react-router-dom` 的 `Link` 组件
- 保持路由功能完整

```typescript
import { Link } from 'react-router-dom';

<Link to={route ?? ''} style={linkStyle}>
  {label}
</Link>
```

### 5. 国际化

**原始实现：**

- 使用 `useTranslate` Hook 进行翻译

**移植后实现：**

- 直接使用中文文本
- 可以集成 i18n 库进行国际化

```typescript
// 原始
translate("buttons.logout", "Logout")

// 移植后
"退出登录"
```

## 保留的功能

### 1. 响应式设计

✅ 完全保留了响应式布局功能

- 桌面端：可折叠侧边栏
- 移动端：抽屉式侧边栏

```typescript
const isMobile = typeof breakpoint.lg === 'undefined' ? false : !breakpoint.lg;

if (isMobile) {
  return renderDrawerSider();
}
```

### 2. 主题集成

✅ 完全保留了 Ant Design 主题集成

- 使用 `theme.useToken()` 获取主题变量
- 支持自定义主题配置

```typescript
const { token } = theme.useToken();

const headerStyles: React.CSSProperties = {
  backgroundColor: token.colorBgElevated,
  // ...
};
```

### 3. 布局状态管理

✅ 完全保留了布局状态管理

- 侧边栏折叠状态
- 移动端抽屉状态
- 状态变化回调

```typescript
const {
  siderCollapsed,
  setSiderCollapsed,
  mobileSiderOpen,
  setMobileSiderOpen,
} = useThemedLayoutContext();
```

### 4. 树形菜单

✅ 完全保留了树形菜单功能

- 支持多级嵌套
- 支持图标显示
- 支持展开/折叠

```typescript
const renderTreeView = (tree: MenuItem[], selectedKey?: string) => {
  return tree.map((item: MenuItem) => {
    if (children.length > 0) {
      return (
        <Menu.SubMenu key={item.key} title={label}>
          {renderTreeView(children, selectedKey)}
        </Menu.SubMenu>
      );
    }
    // ...
  });
};
```

## 移除的功能

### 1. 权限控制

❌ 移除了 `CanAccess` 组件

- 原因：依赖 Refine 的权限系统
- 替代方案：在传递 `menuItems` 前进行权限过滤

```typescript
// 替代方案
const filteredMenuItems = menuItems.filter(item => 
  hasPermission(item.key)
);
```

### 2. 自动菜单生成

❌ 移除了从 resources 自动生成菜单

- 原因：依赖 Refine 的资源系统
- 替代方案：手动配置 `menuItems`

### 3. 审计日志

❌ 移除了审计日志功能

- 原因：依赖 Refine 的审计日志系统
- 替代方案：在业务层实现审计功能

### 4. 实时更新

❌ 移除了实时更新功能

- 原因：依赖 Refine 的 Live Provider
- 替代方案：使用 WebSocket 或轮询实现

## 扩展建议

### 1. 权限控制集成

```typescript
// src/utils/permission.ts
export const hasPermission = (key: string): boolean => {
  const permissions = getUserPermissions();
  return permissions.includes(key);
};

// 使用
const filteredMenuItems = menuItems.filter(item => 
  hasPermission(item.key)
);
```

### 2. 国际化集成

```typescript
// 使用 react-i18next
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

<Menu.Item key="logout">
  {t('buttons.logout')}
</Menu.Item>
```

### 3. 状态持久化

```typescript
// 使用 localStorage
const [collapsed, setCollapsed] = useState(() => {
  const saved = localStorage.getItem('siderCollapsed');
  return saved === 'true';
});

const handleCollapse = (collapsed: boolean) => {
  setCollapsed(collapsed);
  localStorage.setItem('siderCollapsed', String(collapsed));
};
```

### 4. 路由守卫

```typescript
// 使用 React Router 的路由守卫
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = checkAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};
```

## 性能优化

### 1. 菜单渲染优化

```typescript
// 使用 useMemo 缓存菜单渲染结果
const renderedMenu = useMemo(
  () => renderTreeView(menuItems, selectedKey),
  [menuItems, selectedKey]
);
```

### 2. 上下文优化

```typescript
// 拆分上下文，避免不必要的重渲染
const SiderContext = React.createContext<SiderContextType>({});
const HeaderContext = React.createContext<HeaderContextType>({});
```

### 3. 懒加载

```typescript
// 懒加载页面组件
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
```

## 测试建议

### 1. 单元测试

```typescript
import { render, screen } from '@testing-library/react';
import { ThemedTitle } from '@/components/layout';

test('renders title when not collapsed', () => {
  render(<ThemedTitle collapsed={false} text="Test App" />);
  expect(screen.getByText('Test App')).toBeInTheDocument();
});
```

### 2. 集成测试

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemedLayout } from '@/components/layout';

test('toggles sider collapse', () => {
  render(
    <BrowserRouter>
      <ThemedLayout>Content</ThemedLayout>
    </BrowserRouter>
  );
  
  const collapseButton = screen.getByRole('button');
  fireEvent.click(collapseButton);
  // 验证折叠状态
});
```

## 兼容性

### 浏览器支持

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

### React 版本

- React >= 18.0.0
- React DOM >= 18.0.0

### Ant Design 版本

- Ant Design >= 5.0.0

## 总结

本次移植成功将 Refine 的布局组件系统独立出来，保留了核心功能的同时简化了依赖关系。移植后的组件可以在任何 React 应用中独立使用，不再依赖 Refine 框架。

### 优势

1. ✅ 独立使用，无需 Refine 框架
2. ✅ 保留核心功能（响应式、主题、状态管理）
3. ✅ 简化依赖，减少包体积
4. ✅ 完整的 TypeScript 类型支持
5. ✅ 灵活的配置方式

### 注意事项

1. ⚠️ 需要手动配置菜单项
2. ⚠️ 需要手动处理权限控制
3. ⚠️ 需要手动集成用户认证
4. ⚠️ 需要手动实现国际化

### 适用场景

- 需要快速搭建管理后台
- 需要响应式布局
- 使用 Ant Design 作为 UI 框架
- 不想依赖完整的 Refine 框架
