import type { ReactNode } from 'react';

/**
 * 标题组件的属性
 */
export interface TitleProps {
  /** 是否折叠 */
  collapsed: boolean;
}

/**
 * 侧边栏渲染属性
 */
export interface SiderRenderProps {
  /** 根据 resources 创建的菜单项 */
  items: React.JSX.Element[];
  /** 登出按钮（如果有 authProvider 且已认证） */
  logout: React.ReactNode;
  /** 侧边栏是否折叠 */
  collapsed: boolean;
}

/**
 * 侧边栏组件属性
 */
export interface ThemedLayoutSiderProps {
  /** 标题组件 */
  Title?: React.FC<TitleProps>;
  /** 自定义渲染函数 */
  render?: (props: SiderRenderProps) => React.ReactNode;
  /** 元数据 */
  meta?: Record<string, unknown>;
  /** 是否固定侧边栏 */
  fixed?: boolean;
  /** 是否禁用激活项 */
  activeItemDisabled?: boolean;
  /** 侧边栏项是否折叠 */
  siderItemsAreCollapsed?: boolean;
}

/**
 * 头部组件属性
 */
export interface ThemedLayoutHeaderProps {
  /** 是否固定头部 */
  sticky?: boolean;
}

/**
 * 标题组件属性
 */
export interface LayoutThemedTitleProps extends TitleProps {
  /** 图标元素 */
  icon?: React.ReactNode;
  /** 文本内容 */
  text?: React.ReactNode;
  /** 包装器样式 */
  wrapperStyles?: React.CSSProperties;
}

/**
 * 布局组件属性
 */
export interface ThemedLayoutProps {
  /** 子元素 */
  children?: ReactNode;
  /** 侧边栏组件 */
  Sider?: React.FC<ThemedLayoutSiderProps>;
  /** 头部组件 */
  Header?: React.FC<ThemedLayoutHeaderProps>;
  /** 标题组件 */
  Title?: React.FC<LayoutThemedTitleProps>;
  /** 底部组件 */
  Footer?: React.FC;
  /** 布局外区域组件 */
  OffLayoutArea?: React.FC;
  /** 初始侧边栏折叠状态 */
  initialSiderCollapsed?: boolean;
  /** 侧边栏折叠状态变化回调 */
  onSiderCollapsed?: (collapsed: boolean) => void;
}

/**
 * 布局上下文接口
 */
export interface IThemedLayoutContext {
  /** 侧边栏是否折叠 */
  siderCollapsed: boolean;
  /** 设置侧边栏折叠状态 */
  setSiderCollapsed: (visible: boolean) => void;
  /** 移动端侧边栏是否打开 */
  mobileSiderOpen: boolean;
  /** 设置移动端侧边栏打开状态 */
  setMobileSiderOpen: (visible: boolean) => void;
  /** 侧边栏折叠状态变化回调 */
  onSiderCollapsed?: (collapsed: boolean) => void;
}
