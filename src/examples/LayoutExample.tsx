import {
  AppstoreOutlined,
  BarChartOutlined,
  DashboardOutlined,
  FileTextOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import React, { useState } from 'react';
import { ThemedHeader, ThemedLayout, ThemedSider, ThemedTitle } from '@/components/layout';
import type { MenuItem } from '@/components/layout';

/**
 * 菜单配置
 */
const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    name: 'dashboard',
    label: '仪表盘',
    icon: <DashboardOutlined />,
    route: '/dashboard',
    children: [],
    meta: {
      label: '仪表盘',
      icon: <DashboardOutlined />,
    },
  },
  {
    key: 'users',
    name: 'users',
    label: '用户管理',
    icon: <UserOutlined />,
    route: '/users',
    children: [],
    meta: {
      label: '用户管理',
      icon: <UserOutlined />,
    },
  },
  {
    key: 'content',
    name: 'content',
    label: '内容管理',
    icon: <FileTextOutlined />,
    route: '/content',
    children: [
      {
        key: 'posts',
        name: 'posts',
        label: '文章管理',
        icon: <FileTextOutlined />,
        route: '/content/posts',
        children: [],
        meta: {
          label: '文章管理',
          icon: <FileTextOutlined />,
          parent: 'content',
        },
      },
      {
        key: 'categories',
        name: 'categories',
        label: '分类管理',
        icon: <AppstoreOutlined />,
        route: '/content/categories',
        children: [],
        meta: {
          label: '分类管理',
          icon: <AppstoreOutlined />,
          parent: 'content',
        },
      },
    ],
    meta: {
      label: '内容管理',
      icon: <FileTextOutlined />,
    },
  },
  {
    key: 'system',
    name: 'system',
    label: '系统管理',
    icon: <SettingOutlined />,
    route: '/system',
    children: [
      {
        key: 'roles',
        name: 'roles',
        label: '角色管理',
        icon: <TeamOutlined />,
        route: '/system/roles',
        children: [],
        meta: {
          label: '角色管理',
          icon: <TeamOutlined />,
          parent: 'system',
        },
      },
      {
        key: 'permissions',
        name: 'permissions',
        label: '权限管理',
        icon: <SettingOutlined />,
        route: '/system/permissions',
        children: [],
        meta: {
          label: '权限管理',
          icon: <SettingOutlined />,
          parent: 'system',
        },
      },
    ],
    meta: {
      label: '系统管理',
      icon: <SettingOutlined />,
    },
  },
  {
    key: 'reports',
    name: 'reports',
    label: '报表统计',
    icon: <BarChartOutlined />,
    route: '/reports',
    children: [],
    meta: {
      label: '报表统计',
      icon: <BarChartOutlined />,
    },
  },
];

/**
 * 自定义侧边栏组件
 */
const CustomSider = (props: any) => {
  return (
    <ThemedSider
      {...props}
      menuItems={menuItems}
      selectedKey="dashboard"
      defaultOpenKeys={['content', 'system']}
      showLogout={true}
      onLogout={() => {
        console.log('用户登出');
        // 这里可以添加登出逻辑
        // 例如：清除 token、跳转到登录页等
      }}
    />
  );
};

/**
 * 自定义头部组件
 */
const CustomHeader = () => {
  // 模拟用户信息
  const user = {
    name: '张三',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  };

  return <ThemedHeader sticky={true} user={user} />;
};

/**
 * 自定义标题组件
 */
const CustomTitle = ({ collapsed }: { collapsed: boolean }) => {
  return <ThemedTitle collapsed={collapsed} icon={<AppstoreOutlined />} text="数据管理平台" />;
};

/**
 * 布局示例组件
 */
export const LayoutExample: React.FC = () => {
  const [siderCollapsed, setSiderCollapsed] = useState(false);

  return (
    <ThemedLayout
      Sider={CustomSider}
      Header={CustomHeader}
      Title={CustomTitle}
      initialSiderCollapsed={siderCollapsed}
      onSiderCollapsed={(collapsed) => {
        console.log('侧边栏折叠状态变化:', collapsed);
        setSiderCollapsed(collapsed);
      }}
    >
      <div style={{ padding: '24px' }}>
        <h1>欢迎使用数据管理平台</h1>
        <p>这是一个基于 布局组件的示例应用</p>

        <div style={{ marginTop: '24px' }}>
          <h2>功能特性</h2>
          <ul>
            <li>✅ 响应式布局设计</li>
            <li>✅ 可折叠侧边栏</li>
            <li>✅ 移动端抽屉式导航</li>
            <li>✅ 树形菜单结构</li>
            <li>✅ 用户信息显示</li>
            <li>✅ 主题集成</li>
          </ul>
        </div>

        <div style={{ marginTop: '24px' }}>
          <h2>当前状态</h2>
          <p>侧边栏折叠状态: {siderCollapsed ? '已折叠' : '未折叠'}</p>
        </div>
      </div>
    </ThemedLayout>
  );
};

export default LayoutExample;
