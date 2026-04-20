import {
  BarsOutlined,
  LeftOutlined,
  LogoutOutlined,
  RightOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Button, ConfigProvider, Drawer, Grid, Layout, Menu, theme } from 'antd';
import { Link } from 'react-router-dom';
import React from 'react';
import { useMenu, type TreeMenuItem } from '@/hooks/menu';
import { useThemedLayoutContext } from '../hooks/useThemedLayoutContext';
import { ThemedTitle } from '../ThemedTitle';
import type { ThemedLayoutSiderProps } from '../types';
import { drawerButtonStyles } from './styles';

/**
 * 菜单项接口
 * @deprecated 使用 TreeMenuItem 代替
 */
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

/**
 * 侧边栏组件属性
 */
interface ThemedSiderProps extends ThemedLayoutSiderProps {
  /** 菜单项列表（已废弃，使用 resources 代替） */
  menuItems?: MenuItem[];
  /** 当前选中的菜单项（已废弃，自动从路由计算） */
  selectedKey?: string;
  /** 默认展开的菜单项（已废弃，自动从路由计算） */
  defaultOpenKeys?: string[];
  /** 登出回调 */
  onLogout?: () => void;
  /** 是否显示登出按钮 */
  showLogout?: boolean;
}

/**
 * 主题侧边栏组件
 * 提供响应式的侧边栏导航
 */
export const ThemedSider: React.FC<ThemedSiderProps> = ({
  Title: TitleFromProps,
  render,
  meta,
  fixed,
  activeItemDisabled = false,
  siderItemsAreCollapsed = true,
  menuItems: deprecatedMenuItems,
  selectedKey: deprecatedSelectedKey,
  defaultOpenKeys: deprecatedDefaultOpenKeys,
  onLogout,
  showLogout = false,
}) => {
  const { token } = theme.useToken();
  const { siderCollapsed, setSiderCollapsed, mobileSiderOpen, setMobileSiderOpen } =
    useThemedLayoutContext();

  const direction = React.useContext(ConfigProvider.ConfigContext)?.direction;
  const breakpoint = Grid.useBreakpoint();

  const isMobile = typeof breakpoint.lg === 'undefined' ? false : !breakpoint.lg;

  const RenderToTitle = TitleFromProps ?? ThemedTitle;

  // 使用 useMenu hook 从 resources 生成菜单
  const {
    menuItems: resourceMenuItems,
    selectedKey: resourceSelectedKey,
    defaultOpenKeys: resourceDefaultOpenKeys,
  } = useMenu({ meta });

  // 兼容旧的 menuItems 属性，优先使用 resources
  // 将旧的 MenuItem 转换为 TreeMenuItem（递归转换）
  const convertMenuItem = (item: MenuItem): TreeMenuItem => ({
    ...item,
    identifier: item.key,
    list: item.route,
    children: item.children.map(convertMenuItem),
  });

  const convertedMenuItems: TreeMenuItem[] =
    deprecatedMenuItems && deprecatedMenuItems.length > 0
      ? deprecatedMenuItems.map(convertMenuItem)
      : [];

  const menuItems = convertedMenuItems.length > 0 ? convertedMenuItems : resourceMenuItems;
  const selectedKey = deprecatedSelectedKey ?? resourceSelectedKey;
  const defaultOpenKeys =
    deprecatedDefaultOpenKeys && deprecatedDefaultOpenKeys.length > 0
      ? deprecatedDefaultOpenKeys
      : resourceDefaultOpenKeys;

  /**
   * 渲染树形菜单
   */
  const renderTreeView = (tree: TreeMenuItem[], selectedKey?: string) => {
    return tree.map((item: TreeMenuItem) => {
      const { key, name, children, meta } = item;
      const parentName = meta?.parent;
      const label = item?.label ?? meta?.label ?? name;
      const icon = meta?.icon;
      const route = item.route;

      if (children.length > 0) {
        return (
          <Menu.SubMenu key={item.key} icon={icon ?? <UnorderedListOutlined />} title={label}>
            {renderTreeView(children, selectedKey)}
          </Menu.SubMenu>
        );
      }

      const isSelected = key === selectedKey;
      const isRoute = !(parentName !== undefined && children.length === 0);

      const linkStyle: React.CSSProperties =
        activeItemDisabled && isSelected ? { pointerEvents: 'none' } : {};

      return (
        <Menu.Item
          key={item.key}
          icon={icon ?? (isRoute && <UnorderedListOutlined />)}
          style={linkStyle}
        >
          <Link to={route ?? ''} style={linkStyle}>
            {label}
          </Link>
          {!siderCollapsed && isSelected && <div className="ant-menu-tree-arrow" />}
        </Menu.Item>
      );
    });
  };

  /**
   * 处理登出
   */
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  /**
   * 登出菜单项
   */
  const logout = showLogout && (
    <Menu.Item key="logout" onClick={() => handleLogout()} icon={<LogoutOutlined />}>
      退出登录
    </Menu.Item>
  );

  /**
   * 默认展开的菜单项
   */
  const defaultExpandMenuItems = (() => {
    if (siderItemsAreCollapsed) return [];
    return menuItems.map(({ key }) => key);
  })();

  const items = renderTreeView(menuItems, selectedKey);

  /**
   * 渲染侧边栏内容
   */
  const renderSider = () => {
    if (render) {
      return render({
        items,
        logout,
        collapsed: siderCollapsed,
      });
    }
    return [...items, logout].filter(Boolean);
  };

  /**
   * 渲染菜单
   */
  const renderMenu = () => {
    return (
      <Menu
        selectedKeys={selectedKey ? [selectedKey] : []}
        defaultOpenKeys={[...defaultOpenKeys, ...defaultExpandMenuItems]}
        mode="inline"
        style={{
          paddingTop: '8px',
          border: 'none',
          overflow: 'auto',
          height: 'calc(100% - 72px)',
        }}
        onClick={() => {
          setMobileSiderOpen(false);
        }}
      >
        {renderSider()}
      </Menu>
    );
  };

  /**
   * 渲染抽屉侧边栏（移动端）
   */
  const renderDrawerSider = () => {
    return (
      <>
        <Drawer
          open={mobileSiderOpen}
          onClose={() => setMobileSiderOpen(false)}
          placement={direction === 'rtl' ? 'right' : 'left'}
          closable={false}
          width={200}
          styles={{
            body: {
              padding: 0,
            },
          }}
          maskClosable={true}
        >
          <Layout>
            <Layout.Sider
              style={{
                height: '100vh',
                backgroundColor: token.colorBgContainer,
                borderRight: `1px solid ${token.colorBgElevated}`,
              }}
            >
              <div
                style={{
                  width: '200px',
                  padding: '0 16px',
                  display: 'flex',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  height: '64px',
                  backgroundColor: token.colorBgElevated,
                }}
              >
                <RenderToTitle collapsed={false} />
              </div>
              {renderMenu()}
            </Layout.Sider>
          </Layout>
        </Drawer>
        <Button
          style={drawerButtonStyles}
          size="large"
          onClick={() => setMobileSiderOpen(true)}
          icon={<BarsOutlined />}
        />
      </>
    );
  };

  if (isMobile) {
    return renderDrawerSider();
  }

  const siderStyles: React.CSSProperties = {
    backgroundColor: token.colorBgContainer,
    borderRight: `1px solid ${token.colorBgElevated}`,
  };

  if (fixed) {
    siderStyles.position = 'fixed';
    siderStyles.top = 0;
    siderStyles.height = '100vh';
    siderStyles.zIndex = 999;
  }

  /**
   * 渲染折叠图标
   */
  const renderClosingIcons = () => {
    const iconProps = { style: { color: token.colorPrimary } };
    const OpenIcon = direction === 'rtl' ? RightOutlined : LeftOutlined;
    const CollapsedIcon = direction === 'rtl' ? LeftOutlined : RightOutlined;
    const IconComponent = siderCollapsed ? CollapsedIcon : OpenIcon;

    return <IconComponent {...iconProps} />;
  };

  return (
    <>
      {fixed && (
        <div
          style={{
            width: siderCollapsed ? '80px' : '200px',
            transition: 'all 0.2s',
          }}
        />
      )}
      <Layout.Sider
        style={siderStyles}
        collapsible
        collapsed={siderCollapsed}
        onCollapse={(collapsed, type) => {
          if (type === 'clickTrigger') {
            setSiderCollapsed(collapsed);
          }
        }}
        collapsedWidth={80}
        breakpoint="lg"
        trigger={
          <Button
            type="text"
            style={{
              borderRadius: 0,
              height: '100%',
              width: '100%',
              backgroundColor: token.colorBgElevated,
            }}
          >
            {renderClosingIcons()}
          </Button>
        }
      >
        <div
          style={{
            width: siderCollapsed ? '80px' : '200px',
            padding: siderCollapsed ? '0' : '0 16px',
            display: 'flex',
            justifyContent: siderCollapsed ? 'center' : 'flex-start',
            alignItems: 'center',
            height: '64px',
            backgroundColor: token.colorBgElevated,
            fontSize: '14px',
          }}
        >
          <RenderToTitle collapsed={siderCollapsed} />
        </div>
        {renderMenu()}
      </Layout.Sider>
    </>
  );
};
