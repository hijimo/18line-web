import type { ReactNode } from 'react';

/**
 * 资源路由路径
 */
export type ResourceRoutePath = string;

/**
 * 资源组件路径配置
 */
export interface IResourceComponents {
  /** 列表页路径 */
  list?: ResourceRoutePath;
  /** 创建页路径 */
  create?: ResourceRoutePath;
  /** 克隆页路径 */
  clone?: ResourceRoutePath;
  /** 编辑页路径 */
  edit?: ResourceRoutePath;
  /** 详情页路径 */
  show?: ResourceRoutePath;
}

/**
 * 资源元数据
 */
export interface ResourceMeta {
  /**
   * 资源标签
   * 用于设置文档标题、面包屑和侧边栏组件中显示的文本
   */
  label?: string;
  /**
   * 是否在侧边栏中隐藏该资源
   */
  hide?: boolean;
  /**
   * 专用数据提供者名称
   * 如果未设置，将使用默认数据提供者
   */
  dataProviderName?: string;
  /**
   * 父资源名称
   * 用于嵌套资源
   */
  parent?: string;
  /**
   * 是否可以删除
   */
  canDelete?: boolean;
  /**
   * 图标
   */
  icon?: ReactNode;
  /**
   * 其他自定义元数据
   */
  [key: string]: any;
}

/**
 * 资源属性
 */
export interface ResourceProps extends IResourceComponents {
  /** 资源名称 */
  name: string;
  /**
   * 资源标识符
   * 在某些情况下，资源的 name 可能会重复
   * 为避免冲突，可以传递 identifier 属性作为资源的键
   * @default name
   */
  identifier?: string;
  /**
   * 资源元数据
   * 可以使用 meta 存储与资源相关的任何数据
   */
  meta?: ResourceMeta;
}

/**
 * 资源项
 */
export interface IResourceItem extends IResourceComponents, ResourceProps {}

/**
 * 资源上下文
 */
export interface IResourceContext {
  resources: IResourceItem[];
}
