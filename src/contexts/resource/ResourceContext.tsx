import React, { createContext, useContext, useMemo } from 'react';
import type { IResourceContext, IResourceItem, ResourceProps } from '@/types/resource';

/**
 * 资源上下文
 */
export const ResourceContext = createContext<IResourceContext>({
  resources: [],
});

/**
 * 资源上下文 Provider 属性
 */
interface ResourceContextProviderProps {
  /** 资源配置列表 */
  resources: ResourceProps[];
  /** 子组件 */
  children: React.ReactNode;
}

/**
 * 资源上下文 Provider
 * 提供资源配置给整个应用
 */
export const ResourceContextProvider: React.FC<ResourceContextProviderProps> = ({
  resources: providedResources,
  children,
}) => {
  const resources: IResourceItem[] = useMemo(() => {
    return providedResources ?? [];
  }, [providedResources]);

  return <ResourceContext.Provider value={{ resources }}>{children}</ResourceContext.Provider>;
};

/**
 * 使用资源上下文
 * @returns 资源上下文
 */
export const useResourceContext = () => {
  const context = useContext(ResourceContext);
  if (!context) {
    throw new Error('useResourceContext must be used within ResourceContextProvider');
  }
  return context;
};
