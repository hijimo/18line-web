import { Space, theme, Typography } from 'antd';
import { Link } from 'react-router-dom';
import React from 'react';
import type { LayoutThemedTitleProps } from '../types';

/**
 * 主题标题组件
 * 用于显示应用的标题和图标
 */
export const ThemedTitle: React.FC<LayoutThemedTitleProps> = ({
  collapsed,
  icon,
  text = '',
  wrapperStyles,
}) => {
  const { token } = theme.useToken();

  return (
    <Link
      to="/"
      style={{
        display: 'inline-block',
        textDecoration: 'none',
      }}
    >
      <Space
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: 'inherit',
          ...wrapperStyles,
        }}
      >
        {icon && (
          <div
            style={{
              height: '24px',
              width: '24px',
              color: token.colorPrimary,
            }}
          >
            {icon}
          </div>
        )}

        {!collapsed && (
          <Typography.Title
            style={{
              fontSize: 'inherit',
              marginBottom: 0,
              fontWeight: 700,
            }}
          >
            {text}
          </Typography.Title>
        )}
      </Space>
    </Link>
  );
};
