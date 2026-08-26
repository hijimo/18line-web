import {
  BankOutlined,
  BookOutlined,
  CalendarOutlined,
  CameraOutlined,
  CarOutlined,
  CoffeeOutlined,
  EnvironmentOutlined,
  HeartOutlined,
  HomeOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { useMemo } from 'react';
import Header from '@/components/Header';
import {
  ThemedLayout,
  ThemedSider,
  ThemedTitle,
  type LayoutThemedTitleProps,
} from '@/components/Layout';
import { useAuthStore } from '@/stores/authStore';
import { AuthProvider } from './components/AuthProvider';
import Layout from './components/Layout/Layout';
import { ResourceContextProvider } from './contexts/resource';
import Accommodation from './pages/Accommodation';
import AlgorithmConfig from './pages/AlgorithmConfig';
import Attractions from './pages/Attractions';
import CharteredCar from './pages/CharteredCar';
import CheckinPoints from './pages/CheckinPoints';
import DictType from './pages/DictType';
import Dining from './pages/Dining';
import Index from './pages/Index';
import LocalDishes from './pages/LocalDishes';
import Login from './pages/Login';
import Notfound from './pages/Notfound';
import Photography from './pages/Photography';
import Routes from './pages/Routes';
import Template from './pages/Template';
import TouristPreferences from './pages/TouristPreferences';
import Tourists from './pages/Tourists';
import Users from './pages/Users';
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
    name: 'tourists',
    list: '/tourists',
    meta: {
      label: '游客管理',
      icon: <TeamOutlined />,
    },
  },
  {
    name: 'tourist-preferences',
    list: '/tourist-preferences',
    meta: {
      label: '游客喜好',
      icon: <HeartOutlined />,
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
  {
    name: 'dict-type',
    list: '/dict-type',
    meta: {
      label: '数据字典',
      icon: <BookOutlined />,
    },
  },
];

/** 仅 admin 可见的资源名（与后端 sys_role_menu 删除的菜单保持一致） */
const ADMIN_ONLY_RESOURCES = ['users', 'algorithm-config', 'dict-type'];

/**
 * 当前登录用户是否 admin。
 * /getInfo 的 roles 未返回前按可见处理，避免管理员侧菜单闪烁。
 */
const useIsAdmin = (): boolean => {
  const roles = useAuthStore((state) => state.user?.roles) as string[] | undefined;
  return !roles || roles.length === 0 || roles.includes('admin');
};

/** 按当前用户角色过滤侧边菜单资源后再渲染布局 */
const AuthResourceProvider: React.FC = () => {
  const isAdmin = useIsAdmin();
  const visibleResources = useMemo(
    () =>
      isAdmin ? resources : resources.filter((item) => !ADMIN_ONLY_RESOURCES.includes(item.name)),
    [isAdmin],
  );
  return (
    <ResourceContextProvider resources={visibleResources}>
      <ThemedLayout Header={Header} Title={renderTitle} Sider={renderSider}>
        <Outlet />
      </ThemedLayout>
    </ResourceContextProvider>
  );
};

/** 非 admin 直接访问受控路由时重定向回首页 */
const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAdmin = useIsAdmin();
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

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
}> = (props) => <ThemedSider {...props} render={({ items }) => items} fixed />;

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
        element: <AuthResourceProvider />,
        children: [
          {
            path: '/',
            element: <Index />,
          },
          {
            path: '/attractions',
            element: <Attractions />,
          },
          {
            path: '/checkin',
            element: <CheckinPoints />,
          },
          {
            path: '/local-dishes',
            element: <LocalDishes />,
          },
          {
            path: '/accommodation',
            element: <Accommodation />,
          },
          {
            path: '/dining',
            element: <Dining />,
          },
          {
            path: '/photography',
            element: <Photography />,
          },
          {
            path: '/chartered-car',
            element: <CharteredCar />,
          },
          {
            path: '/users',
            element: (
              <RequireAdmin>
                <Users />
              </RequireAdmin>
            ),
          },
          {
            path: '/tourists',
            element: <Tourists />,
          },
          {
            path: '/tourist-preferences',
            element: <TouristPreferences />,
          },
          {
            path: '/routes',
            element: <Routes />,
          },
          {
            path: '/algorithm-config',
            element: (
              <RequireAdmin>
                <AlgorithmConfig />
              </RequireAdmin>
            ),
          },
          {
            path: '/template',
            element: <Template />,
          },
          {
            path: '/dict-type',
            element: (
              <RequireAdmin>
                <DictType />
              </RequireAdmin>
            ),
          },
          {
            path: '*',
            element: <Notfound />,
          },
        ],
      },
    ],
  },
]);

export default router;
