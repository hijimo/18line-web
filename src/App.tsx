import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { RouterProvider } from 'react-router';
import React from 'react';
import useTheme, { ThemeProvider } from '@/hooks/useTheme';
import { getThemeConfig } from '@/theme';
import ErrorBoundary from './components/ErrorBoundary';
import router from './router';

// 创建QueryClient实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 1000, // 5秒钟内不重新获取
      // gcTime: 10 * 60 * 1000, // 10分钟后清除缓存
      // retry: 1,
      // retryDelay: 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // 避免组件挂载时重复请求
      refetchOnReconnect: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const App: React.FC = () => {
  const { themeMode, colorName } = useTheme();
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={getThemeConfig(themeMode, colorName)}>
          <RouterProvider router={router} />
        </ConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
App.displayName = 'App';
export default App;
