import { useResourceContext } from '@/contexts/resource';
import { useLocation } from 'react-router';
import React, { useMemo } from 'react';
import type { IResourceItem } from '@/types/resource';

/**
 * 扁平树项
 */
export interface FlatTreeItem {
  key: string;
  name: string;
  identifier: string;
  list?: string;
  create?: string;
  edit?: string;
  show?: string;
  clone?: string;
  meta?: Record<string, any>;
  children: FlatTreeItem[];
}

/**
 * 树形菜单项
 */
export interface TreeMenuItem extends Omit<FlatTreeItem, 'children'> {
  route?: string;
  icon?: React.ReactNode;
  label?: string;
  children: TreeMenuItem[];
}

/**
 * useMenu 返回类型
 */
export interface UseMenuReturnType {
  /** 默认展开的菜单键 */
  defaultOpenKeys: string[];
  /** 当前选中的菜单键 */
  selectedKey: string;
  /** 菜单项列表 */
  menuItems: TreeMenuItem[];
}

/**
 * useMenu 参数
 */
export interface UseMenuProps {
  /** 元数据 */
  meta?: Record<string, any>;
  /** 当缺少参数时是否隐藏 */
  hideOnMissingParameter?: boolean;
}

/**
 * 创建资源键
 */
const createResourceKey = (resource: IResourceItem): string => {
  return resource.identifier ?? resource.name;
};

/**
 * 获取父资源
 */
const getParentResource = (
  resource: IResourceItem,
  resources: IResourceItem[],
): IResourceItem | undefined => {
  if (!resource.meta?.parent) return undefined;
  return resources.find(
    (r) => r.name === resource.meta?.parent || r.identifier === resource.meta?.parent,
  );
};

/**
 * 创建树形结构
 */
const createTree = (resources: IResourceItem[]): FlatTreeItem[] => {
  const tree: FlatTreeItem[] = [];
  const resourceMap = new Map<string, FlatTreeItem>();

  // 创建所有节点
  resources.forEach((resource) => {
    const key = createResourceKey(resource);
    const node: FlatTreeItem = {
      key,
      name: resource.name,
      identifier: resource.identifier ?? resource.name,
      list: resource.list,
      create: resource.create,
      edit: resource.edit,
      show: resource.show,
      clone: resource.clone,
      meta: resource.meta,
      children: [],
    };
    resourceMap.set(key, node);
  });

  // 构建树形结构
  resources.forEach((resource) => {
    const key = createResourceKey(resource);
    const node = resourceMap.get(key);
    if (!node) return;

    const parentName = resource.meta?.parent;
    if (parentName) {
      const parent = resources.find((r) => r.name === parentName || r.identifier === parentName);
      if (parent) {
        const parentKey = createResourceKey(parent);
        const parentNode = resourceMap.get(parentKey);
        if (parentNode) {
          parentNode.children.push(node);
          return;
        }
      }
    }

    tree.push(node);
  });

  return tree;
};

/**
 * 清理路径
 */
const getCleanPath = (pathname: string): string => {
  return pathname
    .split('?')[0]
    .split('#')[0]
    .replace(/(.+)(\/$)/, '$1');
};

/**
 * useMenu Hook
 * 用于获取菜单项，这些项包括指向仪表板页面的链接（如果存在）
 * 以及指向用户定义资源的链接
 */
export const useMenu = ({
  meta,
  hideOnMissingParameter = true,
}: UseMenuProps = {}): UseMenuReturnType => {
  const { resources } = useResourceContext();
  const location = useLocation();

  const cleanPathname = location.pathname ? getCleanPath(location.pathname) : undefined;
  const cleanRoute = `/${(cleanPathname ?? '').replace(/^\//, '')}`;

  // 查找当前资源
  const currentResource = useMemo(() => {
    return resources.find((resource) => {
      if (resource.list === cleanRoute) return true;
      if (resource.create === cleanRoute) return true;
      if (resource.edit && cleanRoute.startsWith(resource.edit.replace(':id', ''))) return true;
      if (resource.show && cleanRoute.startsWith(resource.show.replace(':id', ''))) return true;
      if (resource.clone && cleanRoute.startsWith(resource.clone.replace(':id', ''))) return true;
      return false;
    });
  }, [resources, cleanRoute]);

  const selectedKey = currentResource ? createResourceKey(currentResource) : cleanRoute;

  // 计算默认展开的键
  const defaultOpenKeys = useMemo(() => {
    if (!currentResource) return [];
    let parent = getParentResource(currentResource, resources);
    const keys = [createResourceKey(currentResource)];
    while (parent) {
      keys.push(createResourceKey(parent));
      parent = getParentResource(parent, resources);
    }
    return keys;
  }, [currentResource, resources]);

  // 准备菜单项
  const prepareItem = React.useCallback(
    (item: FlatTreeItem): TreeMenuItem | undefined => {
      if (item?.meta?.hide) {
        return undefined;
      }
      if (!item?.list && item.children.length === 0) return undefined;

      const route = item.list;

      // 如果路由包含参数且需要隐藏，则返回 undefined
      if (hideOnMissingParameter && route && route.match(/(\/|^):(.+?)(\/|$){1}/)) {
        return undefined;
      }

      return {
        ...item,
        route,
        icon: item.meta?.icon,
        label: item?.meta?.label ?? item.name,
        children: [],
      };
    },
    [meta, hideOnMissingParameter],
  );

  // 创建树形菜单
  const treeItems = useMemo(() => {
    const treeMenuItems = createTree(resources);

    // 递归准备菜单项
    const prepare = (items: FlatTreeItem[]): TreeMenuItem[] => {
      return items.flatMap((item) => {
        const preparedNodes = prepare(item.children);
        const newItem = prepareItem({
          ...item,
          children: preparedNodes,
        });

        if (!newItem) return [];

        return [{ ...newItem, children: preparedNodes }];
      });
    };

    return prepare(treeMenuItems);
  }, [resources, prepareItem]);

  return {
    defaultOpenKeys,
    selectedKey,
    menuItems: treeItems,
  };
};
