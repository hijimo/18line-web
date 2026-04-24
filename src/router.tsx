import {
  BookOutlined,
  CarOutlined,
  CameraOutlined,
  CalendarOutlined,
  GiftOutlined,
  HomeOutlined,
  SettingOutlined,
  UserOutlined,
  EnvironmentOutlined,
  BankOutlined,
  CoffeeOutlined,
  ShopOutlined,
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
import AlgorithmConfig from './pages/AlgorithmConfig';
import Template from './pages/Template';
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
    name: 'local-service',
    meta: {
      label: '本地服务',
      icon: <ShopOutlined />,
    },
  },
  {
    name: 'accommodation',
    list: '/accommodation',
    meta: {
      label: '住宿',
      icon: <BankOutlined />,
      parent: 'local-service',
    },
  },
  {
    name: 'chartered-car',
    list: '/chartered-car',
    meta: {
      label: '包车',
      icon: <CarOutlined />,
      parent: 'local-service',
    },
  },
  {
    name: 'photography',
    list: '/photography',
    meta: {
      label: '跟拍',
      icon: <CameraOutlined />,
      parent: 'local-service',
    },
  },
  {
    name: 'dishes',
    list: '/dishes',
    meta: {
      label: '菜品',
      icon: <CoffeeOutlined />,
      parent: 'local-service',
    },
  },
  {
    name: 'dining',
    list: '/dining',
    meta: {
      label: '餐饮',
      icon: <BankOutlined />,
      parent: 'local-service',
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
  {
    name: 'algorithm-config',
    list: '/algorithm-config',
    meta: {
      label: '算法配置',
      icon: <SettingOutlined />,
    },
  },
  {
    name: 'template',
    list: '/template',
    meta: {
      label: '行程模板',
      icon: <CalendarOutlined />,
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
              
                <Index />
              
            ),
          },
          {
            path: '/attractions',
            element: (
              
                <Attractions />
              
            ),
          },
          {
            path: '/checkin',
            element: (
              
                <CheckinPoints />
              
            ),
          },
          {
            path: '/local-dishes',
            element: (
              
                <LocalDishes />
              
            ),
          },
          {
            path: '/accommodation',
            element: (
              
                <Accommodation />
              
            ),
          },
          {
            path: '/dining',
            element: (
              
                <Dining />
              
            ),
          },
          {
            path: '/dishes',
            element: (
                <Dishes />
            ),
          },
          {
            path: '/photography',
            element: (
              
                <Photography />
              
            ),
          },
          {
            path: '/chartered-car',
            element: (
              
                <CharteredCar />
              
            ),
          },
          {
            path: '/users',
            element: (
              
                <Users />
              
            ),
          },
          {
            path: '/routes',
            element: (
              
                <Routes />
              
            ),
          },
          {
            path: '/easter-egg',
            element: (
                <EasterEgg />
            ),
          },
          {
            path: '/algorithm-config',
            element: <AlgorithmConfig />,
          },
          {
            path: '/template',
            element: <Template />,
          },
          {
            path: '*',
            element: (
              
                <Notfound />
              
            ),
          },
        ],
      },
    ],
  },
]);

export default router;