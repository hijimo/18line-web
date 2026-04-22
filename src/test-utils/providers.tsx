import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

export const renderWithProviders = (ui: React.ReactElement) => {
  return {
    queryClient,
    ui: (
      <QueryClientProvider client={queryClient}>
        <ConfigProvider>
          <MemoryRouter>{ui}</MemoryRouter>
        </ConfigProvider>
      </QueryClientProvider>
    ),
  };
};

export { queryClient };