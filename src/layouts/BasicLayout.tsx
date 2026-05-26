import { DashboardOutlined, UserOutlined } from '@ant-design/icons';
import { ProLayout } from '@ant-design/pro-components';
import { useLocation, useNavigate } from 'react-router';
import { useState } from 'react';

const BasicLayout = ({ children }: { children: React.ReactElement }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [pathname, setPathname] = useState(location.pathname);

  const menuItems = [
    {
      path: '/dashboard',
      name: '仪表盘',
      icon: <DashboardOutlined />,
    },
    {
      path: '/users',
      name: '用户管理',
      icon: <UserOutlined />,
    },
  ];

  return (
    <ProLayout
      title="中台系统"
      logo="https://ant.design/assets/logo.1ef800a8.svg"
      siderWidth={200}
      route={{
        path: '/',
        routes: menuItems,
      }}
      location={{ pathname }}
      menu={{
        request: async () => menuItems,
      }}
      onMenuHeaderClick={() => navigate('/')}
      menuItemRender={(item: { path?: string }, dom: React.ReactNode) => (
        <div
          onClick={() => {
            navigate(item.path || '/');
            setPathname(item.path || '/');
          }}
        >
          {dom}
        </div>
      )}
      // rightContentRender={() => (
      //   <div style={{ marginRight: 16 }}>欢迎你，Admin</div>
      // )}
    >
      {children}
    </ProLayout>
  );
};

export default BasicLayout;
