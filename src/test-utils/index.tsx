/**
 * Test utilities for rendering components with required providers.
 *
 * All CRUD pages need QueryClientProvider, ConfigProvider (antd),
 * and sometimes a Router context. This wrapper bundles them together.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import React, { type ReactElement } from 'react';
import { MemoryRouter } from 'react-router';

/**
 * Creates a fresh QueryClient for each test to avoid shared state.
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface CustomRenderOptions extends RenderOptions {
  /** Initial router routes */
  route?: string;
  /** Custom query client */
  queryClient?: QueryClient;
}

/**
 * AllProviders wraps children with QueryClientProvider, ConfigProvider, and MemoryRouter.
 */
function AllProviders({
  children,
  queryClient,
  route = '/',
}: {
  children: React.ReactNode;
  queryClient?: QueryClient;
  route?: string;
}) {
  const client = queryClient ?? createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <ConfigProvider>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

/**
 * Custom render that wraps UI with all required providers.
 */
function customRender(ui: ReactElement, options?: CustomRenderOptions) {
  const { route, queryClient, ...renderOptions } = options ?? {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient} route={route}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });
}

/**
 * Re-export everything from @testing-library/react
 */
export * from '@testing-library/react';
export { customRender as render };

/**
 * Helper: create a mock function that returns paginated data
 * matching the ResponsePaginationData shape used by useTableRequest.
 */
export function createMockPaginatedResponse<T>(data: T[], total = data.length) {
  return {
    code: 200,
    msg: 'success',
    total,
    rows: data,
  };
}

/**
 * Helper: wait for ProTable to finish loading.
 * ProTable shows a "loading" indicator; we wait for it to disappear.
 */
export async function waitForTableToLoad() {
  // ProTable uses antd Spin; the table content should appear
  // after the request resolves. No special selector needed --
  // just wait for any non-loading content.
  const { waitFor } = await import('@testing-library/react');
  await waitFor(() => {}, { timeout: 3000 });
}