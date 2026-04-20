import {
  BookOutlined,
  HomeOutlined,
  MessageOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { createBrowserRouter, Outlet } from 'react-router';
import Header from '@/components/Header';
import {
  ThemedLayout,
  ThemedSider,
  ThemedTitle,
  type LayoutThemedTitleProps,
} from '@/components/Layout';
import { AuthProvider } from './components/AuthProvider';
import Layout from './components/Layout/Layout';
import { ResourceContextProvider } from './contexts/resource';
import Chat from './pages/chat';
import Index from './pages/Index';
import KnowledgeEntries from './pages/knowledge/entries';
import KnowledgeSpaces from './pages/knowledge/spaces';
import Login from './pages/Login';
import ModelSettings from './pages/model-settings';
import Notfound from './pages/Notfound';
import Tenants from './pages/tenants';
import Users from './pages/users';
import type { ResourceProps } from './types/resource';

/**
 * 资源配置
 * 定义应用中的所有资源及其路由
 */
const resources: ResourceProps[] = [
  {
    name: 'dashboard',
    list: '/',
    meta: {
      label: '首页',
      icon: <HomeOutlined />,
    },
  },
  {
    name: 'chat',
    list: '/chat',
    meta: {
      label: '聊天会话',
      icon: <MessageOutlined />,
    },
  },
  {
    name: 'tenants',
    list: '/tenants',
    meta: {
      label: '租户管理',
      icon: <TeamOutlined />,
    },
  },
  {
    name: 'users',
    list: '/users',
    meta: {
      label: '用户管理',
      icon: <UserOutlined />,
    },
  },
  {
    name: 'model-settings',
    list: '/model-settings',
    meta: {
      label: '模型设置',
      icon: <SettingOutlined />,
    },
  },
  {
    name: 'knowledge-spaces',
    list: '/knowledge/spaces',
    meta: {
      label: '知识库管理',
      icon: <BookOutlined />,
    },
  },
];

const renderTitle: React.FC<LayoutThemedTitleProps> = ({ collapsed }: { collapsed: boolean }) => (
  <ThemedTitle
    collapsed={collapsed}
    text="聚协云"
    icon={<img src="/logo.png" alt="logo" style={{ width: 24 }} />}
  />
);

const renderSider: React.FC<{
  Title?: React.FC<LayoutThemedTitleProps>;
  render?: (props: {
    items: React.ReactElement[];
    logout: React.ReactNode;
    collapsed: boolean;
  }) => React.ReactNode;
  meta?: Record<string, unknown>;
}> = (props) => (
  <ThemedSider
    {...props}
    render={({ items }) =>
      // 直接渲染不带 logout 的菜单项
      items
    }
    fixed
  />
);

const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      {
        path: '/login',
        element: <Login />,
      },
      {
        element: (
          <ResourceContextProvider resources={resources}>
            <ThemedLayout Header={Header} Title={renderTitle} Sider={renderSider}>
              <Outlet />
            </ThemedLayout>
          </ResourceContextProvider>
        ),
        children: [
          {
            path: '/',
            element: (
              <Layout>
                <Index />
              </Layout>
            ),
          },
          {
            path: '/chat',
            element: <Chat />,
          },
          {
            path: '/tenants',
            element: <Tenants />,
          },
          {
            path: '/users',
            element: <Users />,
          },
          {
            path: '/model-settings',
            element: <ModelSettings />,
          },
          {
            path: '/knowledge/spaces',
            element: <KnowledgeSpaces />,
          },
          {
            path: '/knowledge/spaces/:spaceId',
            element: <KnowledgeEntries />,
          },
          {
            path: '*',
            element: (
              <Layout>
                <Notfound />
              </Layout>
            ),
          },
        ],
      },
    ],
  },
]);

export default router;
