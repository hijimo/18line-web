# API 文档

## 组件 API

### ThemedLayout

主布局组件，提供完整的应用布局结构。

#### Props

```typescript
interface RefineThemedLayoutProps {
  children?: ReactNode;
  Sider?: React.FC<RefineThemedLayoutSiderProps>;
  Header?: React.FC<RefineThemedLayoutHeaderProps>;
  Title?: React.FC<RefineLayoutThemedTitleProps>;
  Footer?: React.FC;
  OffLayoutArea?: React.FC;
  initialSiderCollapsed?: boolean;
  onSiderCollapsed?: (collapsed: boolean) => void;
}
```

#### 示例

```tsx
<ThemedLayout
  initialSiderCollapsed={false}
  onSiderCollapsed={(collapsed) => console.log(collapsed)}
>
  <YourContent />
</ThemedLayout>
```

---

### ThemedSider

侧边栏组件，提供响应式导航菜单。

#### Props

```typescript
interface ThemedSiderProps extends RefineThemedLayoutSiderProps {
  Title?: React.FC<TitleProps>;
  render?: (props: SiderRenderProps) => React.ReactNode;
  meta?: Record<string, unknown>;
  fixed?: boolean;
  activeItemDisabled?: boolean;
  siderItemsAreCollapsed?: boolean;
  menuItems?: MenuItem[];
  selectedKey?: string;
  defaultOpenKeys?: string[];
  onLogout?: () => void;
  showLogout?: boolean;
}
```

#### MenuItem 类型

```typescript
interface MenuItem {
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

#### 示例

```tsx
const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    name: 'dashboard',
    label: '仪表盘',
    icon: <DashboardOutlined />,
    route: '/dashboard',
    children: [],
  },
];

<ThemedSider
  menuItems={menuItems}
  selectedKey="dashboard"
  showLogout={true}
  onLogout={() => console.log('logout')}
/>
```

---

### ThemedHeader

头部组件，显示用户信息。

#### Props

```typescript
interface ThemedHeaderProps extends RefineThemedLayoutHeaderProps {
  sticky?: boolean;
  user?: UserIdentity;
}

interface UserIdentity {
  name?: string;
  avatar?: string;
}
```

#### 示例

```tsx
const user = {
  name: '张三',
  avatar: 'https://example.com/avatar.jpg',
};

<ThemedHeader sticky={true} user={user} />
```

---

### ThemedTitle

标题组件，显示应用标题和图标。

#### Props

```typescript
interface RefineLayoutThemedTitleProps extends TitleProps {
  icon?: React.ReactNode;
  text?: React.ReactNode;
  wrapperStyles?: React.CSSProperties;
}

interface TitleProps {
  collapsed: boolean;
}
```

#### 示例

```tsx
<ThemedTitle
  collapsed={false}
  icon={<AppstoreOutlined />}
  text="我的应用"
/>
```

---

## Hooks API

### useThemedLayoutContext

获取布局上下文的 Hook。

#### 返回值

```typescript
interface IThemedLayoutContext {
  siderCollapsed: boolean;
  setSiderCollapsed: (visible: boolean) => void;
  mobileSiderOpen: boolean;
  setMobileSiderOpen: (visible: boolean) => void;
  onSiderCollapsed?: (collapsed: boolean) => void;
}
```

#### 示例

```tsx
import { useThemedLayoutContext } from '@/components/layout';

function MyComponent() {
  const { siderCollapsed, setSiderCollapsed } = useThemedLayoutContext();

  return (
    <button onClick={() => setSiderCollapsed(!siderCollapsed)}>
      切换侧边栏
    </button>
  );
}
```

---

## Context API

### ThemedLayoutContextProvider

布局上下文提供者。

#### Props

```typescript
interface ThemedLayoutContextProviderProps {
  children: ReactNode;
  initialSiderCollapsed?: boolean;
  onSiderCollapsed?: (collapsed: boolean) => void;
}
```

#### 示例

```tsx
<ThemedLayoutContextProvider
  initialSiderCollapsed={false}
  onSiderCollapsed={(collapsed) => console.log(collapsed)}
>
  <YourApp />
</ThemedLayoutContextProvider>
```

---

## 类型定义

### ResourceProps

资源配置类型。

```typescript
interface ResourceProps extends IResourceComponents {
  name: string;
  identifier?: string;
  meta?: ResourceMeta;
}

interface IResourceComponents {
  list?: ResourceRoutePath;
  create?: ResourceRoutePath;
  clone?: ResourceRoutePath;
  edit?: ResourceRoutePath;
  show?: ResourceRoutePath;
}

interface ResourceMeta {
  label?: string;
  hide?: boolean;
  dataProviderName?: string;
  parent?: string;
  canDelete?: boolean;
  icon?: ReactNode;
  [key: string]: any;
}
```

### SiderRenderProps

侧边栏渲染属性。

```typescript
interface SiderRenderProps {
  items: React.JSX.Element[];
  logout: React.ReactNode;
  collapsed: boolean;
}
```

---

## 样式定制

### 主题配置

使用 Ant Design 的 ConfigProvider 进行主题定制：

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

### 自定义样式

通过 `wrapperStyles` 属性自定义标题样式：

```tsx
<ThemedTitle
  collapsed={false}
  text="我的应用"
  wrapperStyles={{
    fontSize: '18px',
    fontWeight: 'bold',
  }}
/>
```

---

## 事件处理

### 侧边栏折叠事件

```tsx
<ThemedLayout
  onSiderCollapsed={(collapsed) => {
    console.log('侧边栏状态:', collapsed);
    // 保存到 localStorage
    localStorage.setItem('siderCollapsed', String(collapsed));
  }}
>
  <YourContent />
</ThemedLayout>
```

### 登出事件

```tsx
<ThemedSider
  showLogout={true}
  onLogout={() => {
    // 清除认证信息
    localStorage.removeItem('token');
    // 跳转到登录页
    window.location.href = '/login';
  }}
/>
```

---

## 响应式断点

组件使用 Ant Design 的 Grid 断点系统：

| 断点 | 尺寸 | 说明 |
|------|------|------|
| xs | < 576px | 超小屏幕 |
| sm | ≥ 576px | 小屏幕 |
| md | ≥ 768px | 中等屏幕 |
| lg | ≥ 992px | 大屏幕（桌面端） |
| xl | ≥ 1200px | 超大屏幕 |
| xxl | ≥ 1600px | 超超大屏幕 |

默认使用 `lg` 断点区分桌面端和移动端。

---

## 最佳实践

### 1. 菜单项配置

建议将菜单项配置独立到单独的文件中：

```tsx
// src/config/menu.tsx
import type { MenuItem } from '@/components/layout';

export const menuItems: MenuItem[] = [
  // 菜单配置
];
```

### 2. 用户信息管理

使用状态管理库（如 Zustand）管理用户信息：

```tsx
import { create } from 'zustand';

interface UserStore {
  user: UserIdentity | null;
  setUser: (user: UserIdentity) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

### 3. 路由集成

与 React Router 集成：

```tsx
import { useLocation } from 'react-router-dom';

function App() {
  const location = useLocation();
  const selectedKey = location.pathname;

  return (
    <ThemedLayout>
      <ThemedSider selectedKey={selectedKey} />
    </ThemedLayout>
  );
}
```

### 4. 权限控制

根据用户权限动态生成菜单：

```tsx
const filterMenuByPermissions = (
  items: MenuItem[],
  permissions: string[]
): MenuItem[] => {
  return items
    .filter((item) => permissions.includes(item.key))
    .map((item) => ({
      ...item,
      children: filterMenuByPermissions(item.children, permissions),
    }));
};
```

---

## 常见问题

### Q: 如何持久化侧边栏折叠状态？

A: 使用 localStorage 保存状态：

```tsx
const [collapsed, setCollapsed] = useState(() => {
  const saved = localStorage.getItem('siderCollapsed');
  return saved === 'true';
});

<ThemedLayout
  initialSiderCollapsed={collapsed}
  onSiderCollapsed={(collapsed) => {
    setCollapsed(collapsed);
    localStorage.setItem('siderCollapsed', String(collapsed));
  }}
/>
```

### Q: 如何自定义侧边栏渲染？

A: 使用 `render` 属性：

```tsx
<ThemedSider
  render={({ items, logout, collapsed }) => (
    <>
      <div>自定义内容</div>
      {items}
      {logout}
    </>
  )}
/>
```

### Q: 如何在移动端隐藏某些菜单项？

A: 使用响应式断点判断：

```tsx
import { Grid } from 'antd';

const breakpoint = Grid.useBreakpoint();
const isMobile = !breakpoint.lg;

const filteredMenuItems = isMobile
  ? menuItems.filter((item) => !item.meta?.hideOnMobile)
  : menuItems;
```
