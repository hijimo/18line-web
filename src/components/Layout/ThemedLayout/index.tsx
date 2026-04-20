import { Layout as AntdLayout, Grid } from 'antd';
import React from 'react';
import { ThemedLayoutContextProvider } from '../context/ThemedLayoutContext';
import { ThemedHeader as DefaultHeader } from '../ThemedHeader';
import { ThemedSider as DefaultSider } from '../ThemedSider';
import type { ThemedLayoutProps } from '../types';

/**
 * 主题布局组件
 * 提供完整的应用布局结构，包括侧边栏、头部、内容区域和底部
 */
export const ThemedLayout: React.FC<ThemedLayoutProps> = ({
  children,
  Header,
  Sider,
  Title,
  Footer,
  OffLayoutArea,
  initialSiderCollapsed,
  onSiderCollapsed,
}) => {
  const breakpoint = Grid.useBreakpoint();
  const SiderToRender = Sider ?? DefaultSider;
  const HeaderToRender = Header ?? DefaultHeader;
  const isSmall = typeof breakpoint.sm === 'undefined' ? true : breakpoint.sm;
  const hasSider = !!SiderToRender({ Title });

  return (
    <ThemedLayoutContextProvider
      initialSiderCollapsed={initialSiderCollapsed}
      onSiderCollapsed={onSiderCollapsed}
    >
      <AntdLayout style={{ minHeight: '100vh' }} hasSider={hasSider}>
        <SiderToRender Title={Title} />
        <AntdLayout>
          <HeaderToRender />
          <AntdLayout.Content>
            <div
              style={{
                minHeight: 360,
                padding: isSmall ? 24 : 12,
              }}
            >
              {children}
            </div>
            {OffLayoutArea && <OffLayoutArea />}
          </AntdLayout.Content>
          {Footer && <Footer />}
        </AntdLayout>
      </AntdLayout>
    </ThemedLayoutContextProvider>
  );
};
