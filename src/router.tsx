import {
  AccountBookOutlined,
  AuditOutlined,
  BankOutlined,
  BookOutlined,
  CalendarOutlined,
  CameraOutlined,
  CarOutlined,
  CoffeeOutlined,
  CompassOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  FundOutlined,
  GiftOutlined,
  HeartOutlined,
  HomeOutlined,
  PayCircleOutlined,
  SettingOutlined,
  ShopOutlined,
  StarOutlined,
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
import ExpertAttraction from './pages/ExpertAttraction';
import ExpertIncome from './pages/ExpertIncome';
import ExpertRewardOrder from './pages/ExpertRewardOrder';
import ExpertRoute from './pages/ExpertRoute';
import ExpertRouteAudit from './pages/ExpertRouteAudit';
import Index from './pages/Index';
import LocalDishes from './pages/LocalDishes';
import Login from './pages/Login';
import MerchantExpert from './pages/MerchantExpert';
import Notfound from './pages/Notfound';
import Photography from './pages/Photography';
import RewardBill from './pages/RewardBill';
import RewardConfig from './pages/RewardConfig';
import RewardMerchant from './pages/RewardMerchant';
import RewardNotifyLog from './pages/RewardNotifyLog';
import RewardOrder from './pages/RewardOrder';
import RewardSettlement from './pages/RewardSettlement';
import RewardTier from './pages/RewardTier';
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
    // 达人管理：与「打赏管理」平级的独立目录（后端 sys_menu 2200，挂在 1061 旅游管理下）。
    // ⚠️ 本项目菜单是**前端静态数组**，既不读 sys_menu.component 也不读 sys_menu.path，
    //    所以这里的 name/list 与后端菜单的 path/component 不需要、也不应该对齐。
    //    既有先例写得很明确（travel18/sql/202609281400_reward_menu_visible.sql:16-20）：
    //    sys_menu.component='travel18/reward/order/index' 与 React 路由 /reward-order
    //    不一致是**预期**的，"不要顺手对齐"。真正要与后端对齐的是**权限串**。
    name: 'expert',
    meta: {
      label: '达人管理',
      icon: <StarOutlined />,
    },
  },
  {
    // 达人自己维护的路线（分天编排 + 景点讲解）。daren 角色可见；
    // 行级隔离由后端 @AuthorDataScope 按 author_user_id 强制（非 admin 非 daren → AND 1=0）。
    name: 'expert-route',
    list: '/expert-route',
    meta: {
      label: '达人路线',
      icon: <CompassOutlined />,
      parent: 'expert',
    },
  },
  {
    // 达人私域景点（travel_attraction.owner_user_id = 当前达人）；后置审核，建即可用。
    name: 'expert-attraction',
    list: '/expert-attraction',
    meta: {
      label: '达人景点',
      icon: <EnvironmentOutlined />,
      parent: 'expert',
    },
  },
  {
    // 只展示 expert_route_id IS NOT NULL 的鼓励单，与既有「打赏订单」页（IS NULL）不重叠。
    // daren 可见（只看自己）；导出按钮不授予 daren（menu 2252）。
    name: 'expert-reward-order',
    list: '/expert-reward-order',
    meta: {
      label: '达人鼓励订单',
      icon: <AccountBookOutlined />,
      parent: 'expert',
    },
  },
  {
    // 达人收入流水 + admin 按商家导出对账单。daren 可见（只看自己）；导出收回 admin（menu 2262）。
    name: 'expert-income',
    list: '/expert-income',
    meta: {
      label: '达人收入对账',
      icon: <FundOutlined />,
      parent: 'expert',
    },
  },
  {
    // 先审后发：audit_status='1' 是下单闸门 G2 的必要条件，属资金动作。
    // ⚠️ 不授予 daren（达人不能审自己的路线，menu 2230~2232）。
    name: 'expert-route-audit',
    list: '/expert-route-audit',
    meta: {
      label: '达人路线审核',
      icon: <AuditOutlined />,
      parent: 'expert',
    },
  },
  {
    // 绑定关系是下单闸门 G4 的数据源，解绑会立即让该达人收不到钱。
    // ⚠️ 不授予 daren（menu 2240~2244）。
    name: 'merchant-expert',
    list: '/merchant-expert',
    meta: {
      label: '达人商户绑定',
      icon: <TeamOutlined />,
      parent: 'expert',
    },
  },
  {
    // 打赏是资金相关模块：订单页能发起退款，结算页能对公转账。
    // 后端用 travel18:reward:* / travel18:settle:* 权限守，前端再按 admin 收一层，
    // 避免非财务角色看到菜单点进去全是 403。
    name: 'reward',
    meta: {
      label: '打赏管理',
      icon: <PayCircleOutlined />,
    },
  },
  {
    // 商户＝打赏资金的收款主体：下单时按「线路 > 商户 > 全局」三级解析分成率并写进订单快照，
    // 月结批次按商户维度生成并对公转账。含统一社会信用代码与对公账号，属主体敏感信息，
    // 因此与档位/订单/结算一样只给 admin，且后端绝不可通过 /wx/** 暴露。
    name: 'reward-merchant',
    list: '/reward-merchant',
    meta: {
      label: '打赏商户',
      icon: <ShopOutlined />,
      parent: 'reward',
    },
  },
  {
    // 档位＝微信虚拟支付的「道具」，是打赏的资金入口参数来源：
    // 下单金额、商家分成、平台佣金全部由档位 price_fen 推导，
    // 且上传/发布会真实改变微信侧可售道具，故与订单/结算一样只给 admin。
    name: 'reward-tier',
    list: '/reward-tier',
    meta: {
      label: '打赏档位',
      icon: <GiftOutlined />,
      parent: 'reward',
    },
  },
  {
    name: 'reward-order',
    list: '/reward-order',
    meta: {
      label: '打赏订单',
      icon: <AccountBookOutlined />,
      parent: 'reward',
    },
  },
  {
    name: 'reward-settlement',
    list: '/reward-settlement',
    meta: {
      label: '打赏结算',
      icon: <BankOutlined />,
      parent: 'reward',
    },
  },
  {
    // 推送日志是排障与对账的第一现场，但 raw_body 是解密后的推送明文，
    // 含 openid、金额与微信侧订单号，故与其它三个打赏资源一样只放给 admin。
    // 页面只读：没有「重放推送」入口（重放等于把记账再跑一遍）。
    name: 'reward-notify-log',
    list: '/reward-notify-log',
    meta: {
      label: '推送日志',
      icon: <FileTextOutlined />,
      parent: 'reward',
    },
  },
  {
    // 账单下载会**出网调用微信**，且拿到的地址指向全量交易明细（含 openid、金额、
    // 商户单号），敏感度不低于推送日志，故同样只放给 admin。
    // 列表与详情刻意不返回真实下载地址（后端掩码），真实地址只在点「下载」那一刻
    // 经 /reward/bill/url/{taskPk} 现取——因为日账单地址只有 28 分钟寿命，
    // 渲染到点击之间就可能已经过期。
    name: 'reward-bill',
    list: '/reward-bill',
    meta: {
      label: '账单下载',
      icon: <DownloadOutlined />,
      parent: 'reward',
    },
  },
  {
    // 打赏参数配置：三个上线闸门、分成率/佣金率/渠道费率、沙箱开关全在这里，
    // 改错任意一个都是真实资金后果（打开总开关＝开始收真钱，分成率越线＝商家少拿钱）。
    // 后端已用 travel18:reward:config:* 三档权限守，前端同样只放给 admin。
    // 刻意不复用 RuoYi 原生「参数设置」：那张页能改整张 sys_config 且对值不做校验，
    // 而本页只认后端登记的 23 个键，并且会显示「运行时真正生效的值」。
    name: 'reward-config',
    list: '/reward-config',
    meta: {
      label: '参数配置',
      icon: <SettingOutlined />,
      parent: 'reward',
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
const ADMIN_ONLY_RESOURCES = [
  // 达人模块里只有「审核」与「商户绑定」是 admin 专属，与 sql/202610121300 第 5 节
  // 不授予 daren 的 menu 段一一对应（2230~2232 / 2240~2244）。
  // 达人路线 / 达人景点 / 鼓励订单 / 收入对账**不加进来** → 达人登录可见。
  'expert-route-audit',
  'merchant-expert',
  'users',
  'algorithm-config',
  'dict-type',
  'reward-merchant',
  'reward-tier',
  'reward-order',
  'reward-settlement',
  'reward-notify-log',
  'reward-bill',
  'reward-config',
];

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
            path: '/expert-route',
            element: <ExpertRoute />,
          },
          {
            path: '/expert-attraction',
            element: <ExpertAttraction />,
          },
          {
            // daren 可见：后端 @AuthorDataScope 保证只返回自己的单；导出按钮另按权限串隐藏
            path: '/expert-reward-order',
            element: <ExpertRewardOrder />,
          },
          {
            // daren 可见：只看自己的流水；导出对账单是 admin 专属
            path: '/expert-income',
            element: <ExpertIncome />,
          },
          {
            path: '/expert-route-audit',
            element: (
              <RequireAdmin>
                <ExpertRouteAudit />
              </RequireAdmin>
            ),
          },
          {
            path: '/merchant-expert',
            element: (
              <RequireAdmin>
                <MerchantExpert />
              </RequireAdmin>
            ),
          },
          {
            path: '/reward-merchant',
            element: (
              <RequireAdmin>
                <RewardMerchant />
              </RequireAdmin>
            ),
          },
          {
            path: '/reward-tier',
            element: (
              <RequireAdmin>
                <RewardTier />
              </RequireAdmin>
            ),
          },
          {
            path: '/reward-order',
            element: (
              <RequireAdmin>
                <RewardOrder />
              </RequireAdmin>
            ),
          },
          {
            path: '/reward-settlement',
            element: (
              <RequireAdmin>
                <RewardSettlement />
              </RequireAdmin>
            ),
          },
          {
            path: '/reward-notify-log',
            element: (
              <RequireAdmin>
                <RewardNotifyLog />
              </RequireAdmin>
            ),
          },
          {
            path: '/reward-bill',
            element: (
              <RequireAdmin>
                <RewardBill />
              </RequireAdmin>
            ),
          },
          {
            path: '/reward-config',
            element: (
              <RequireAdmin>
                <RewardConfig />
              </RequireAdmin>
            ),
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
