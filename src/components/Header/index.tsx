import { BankOutlined, LogoutOutlined } from '@ant-design/icons';
import {
  Layout as AntdLayout,
  Avatar,
  Button,
  Dropdown,
  Layout,
  Space,
  theme,
  Typography,
  type LayoutProps,
} from 'antd';
import type { MenuProps } from 'antd';
import React, { useEffect, useState } from 'react';
import type { ThemedLayoutHeaderProps } from '@/components/Layout';
import { useAuthStore } from '@/stores/authStore';
import { getCompanyInfoFromStorage, getUserInfoFromStorage } from '@/utils/userData';
import type { User } from '@/types/api';
import type { CompanyInfo } from '@/types/user';

const { Text } = Typography;
const { useToken } = theme;
const { Header: AntdHeader } = Layout;

const Header: React.FC<ThemedLayoutHeaderProps> = ({ sticky = true }) => {
  const { token } = useToken();

  const { logout } = useAuthStore();
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  useEffect(() => {
    // 从 localStorage 获取用户数据
    setUserInfo(getUserInfoFromStorage());
    setCompanyInfo(getCompanyInfoFromStorage());
  }, []);

  // 处理退出登录
  const handleLogout = () => {
    logout();
  };

  // 下拉菜单配置
  const menuItems: MenuProps['items'] = [
    {
      key: 'company',
      icon: <BankOutlined />,
      label: (
        <div style={{ padding: '8px 0' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {companyInfo?.co_name || '未知公司'}
          </div>
          {/* {companyInfo?.co_name_short && (
            <div style={{ fontSize: '12px', color: token.colorTextSecondary }}>
              {companyInfo.co_name_short}
            </div>
          )} */}
        </div>
      ),
      disabled: true, // 公司信息不可点击
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const headerStyles: React.CSSProperties = {
    backgroundColor: token.colorBgElevated,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '0px 24px',
    height: '64px',
  };

  if (sticky) {
    headerStyles.position = 'sticky';
    headerStyles.top = 0;
    headerStyles.zIndex = 1;
  }

  return (
    <AntdLayout.Header style={headerStyles}>
      <Space>
        <Space style={{ marginLeft: '8px' }} size="middle">
          <Dropdown menu={{ items: menuItems }} placement="bottomRight" arrow>
            <Button
              type="text"
              style={{
                padding: '4px 8px',
                height: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Avatar style={{ backgroundColor: '#14b8a6' }}>
                {userInfo?.u_name?.charAt(0) || 'U'}
              </Avatar>
              {userInfo?.u_name && <Text type="secondary">{userInfo.u_name}</Text>}
            </Button>
          </Dropdown>
        </Space>
      </Space>
    </AntdLayout.Header>
  );
};

export default Header;
