import { Layout as AntdLayout, Avatar, Space, theme, Typography } from 'antd';
import React from 'react';
import type { ThemedLayoutHeaderProps } from '../types';

/**
 * 用户信息接口
 */
interface UserIdentity {
  name?: string;
  avatar?: string;
}

/**
 * 主题头部组件属性
 */
interface ThemedHeaderProps extends ThemedLayoutHeaderProps {
  /** 用户信息 */
  user?: UserIdentity;
}

/**
 * 主题头部组件
 * 显示用户信息和头像
 */
export const ThemedHeader: React.FC<ThemedHeaderProps> = ({ sticky, user }) => {
  const { token } = theme.useToken();

  const shouldRenderHeader = user && (user.name || user.avatar);

  if (!shouldRenderHeader) {
    return null;
  }

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
        <Space size="middle">
          {user?.name && <Typography.Text strong>{user.name}</Typography.Text>}
          {user?.avatar && <Avatar src={user?.avatar} alt={user?.name} />}
        </Space>
      </Space>
    </AntdLayout.Header>
  );
};
