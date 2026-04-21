import {
  BookOutlined,
  CarOutlined,
  CameraOutlined,
  GiftOutlined,
  HomeOutlined,
  UserOutlined,
  EnvironmentOutlined,
  BankOutlined,
  CoffeeOutlined,
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
import Index from './pages/Index';
import Login from './pages/Login';
import Notfound from './pages/Notfound';
import Attractions from './pages/Attractions';
import CheckinPoints from './pages/CheckinPoints';
import LocalDishes from './pages/LocalDishes';
import Accommodation from './pages/Accommodation';
import Dining from './pages/Dining';
import Dishes from './pages/Dishes';
import Photography from './pages/Photography';
import CharteredCar from './pages/CharteredCar';
import Users from './pages/Users';
import Routes from './pages/Routes';
import EasterEgg from './pages/EasterEgg';
import type { ResourceProps } from './types/resource';

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
    name: 'attractions',
    list: '/attractions',
    meta: {
      label: '景点管理',
      icon: <EnvironmentOutlined />,
    },
  },
  {
    name: 'checkin',
    list: '/checkin',
    meta: {
      label: '打卡点',
      icon: <EnvironmentOutlined />,
      parent: 'attractions',
    },
  },
  {
    name: 'local-dishes',
    list: '/local-dishes',
    meta: {
      label: '地方特色菜',
      icon: <CoffeeOutlined />,
    },
  },
  {
    name: 'accommodation',
    list: '/accommodation',
    meta: {
      label: '住宿',
      icon: <BankOutlined />,
    },
  },
  {
    name: 'dining',
    list: '/dining',
    meta: {
      label: '餐饮',
      icon: <BankOutlined />,
    },
  },
  {
    name: 'dishes',
    list: '/dishes',
    meta: {
      label: '菜品',
      icon: <CoffeeOutlined />,
      parent: 'dining',
    },
  },
  {
    name: 'photography',
    list: '/photography',
    meta: {
      label: '跟拍',
      icon: <CameraOutlined />,
    },
  },
  {
    name: 'chartered-car',
    list: '/chartered-car',
    meta: {
      label: '包车',
      icon: <CarOutlined />,
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
    name: 'routes',
    list: '/routes',
    meta: {
      label: '线路信息',
      icon: <BookOutlined />,
    },
  },
  {
    name: 'easter-egg',
    list: '/easter-egg',
    meta: {
      label: '彩蛋',
      icon: <GiftOutlined />,
    },
  },
];

const renderTitle: React.FC<LayoutThemedTitleProps> = ({ collapsed }: { collapsed: boolean }) => (
  <ThemedTitle
    collapsed={collapsed}
    text="十八线"
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
    render={({ items }) => items}
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
            path: '/attractions',
            element: (
              <Layout>
                <Attractions />
              </Layout>
            ),
          },
          {
            path: '/checkin',
            element: (
              <Layout>
                <CheckinPoints />
              </Layout>
            ),
          },
          {
            path: '/local-dishes',
            element: (
              <Layout>
                <LocalDishes />
              </Layout>
            ),
          },
          {
            path: '/accommodation',
            element: (
              <Layout>
                <Accommodation />
              </Layout>
            ),
          },
          {
            path: '/dining',
            element: (
              <Layout>
                <Dining />
              </Layout>
            ),
          },
          {
            path: '/dishes',
            element: (
              <Layout>
                <Dishes />
              </Layout>
            ),
          },
          {
            path: '/photography',
            element: (
              <Layout>
                <Photography />
              </Layout>
            ),
          },
          {
            path: '/chartered-car',
            element: (
              <Layout>
                <CharteredCar />
              </Layout>
            ),
          },
          {
            path: '/users',
            element: (
              <Layout>
                <Users />
              </Layout>
            ),
          },
          {
            path: '/routes',
            element: (
              <Layout>
                <Routes />
              </Layout>
            ),
          },
          {
            path: '/easter-egg',
            element: (
              <Layout>
                <EasterEgg />
              </Layout>
            ),
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