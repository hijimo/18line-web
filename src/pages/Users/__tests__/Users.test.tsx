import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import Users from '@/pages/Users';

vi.mock('@/services/api/游客管理/游客管理', () => ({
  get: () => ({
    list11: vi.fn().mockResolvedValue({
      code: 200,
      data: {
        data: [
          { touristId: 103818, nickname: '白晶晶', phone: '13957185819', gender: '女', birthYear: 1992, registerTime: '2019-09-17', physicalStrength: '强', recentRoute: '松阳', travelDate: '2025-10-16', travelMode: '全明' },
        ],
        pageNo: 1,
        pageSize: 10,
        totalCount: 1,
      },
    }),
    getInfo2: vi.fn().mockResolvedValue({ code: 200 }),
    edit1: vi.fn().mockResolvedValue({ code: 200 }),
    remove12: vi.fn().mockResolvedValue({ code: 200 }),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const renderUsers = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <MemoryRouter>
          <Users />
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );

describe('Users Page', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('renders the table', async () => {
    renderUsers();
    await waitFor(() => {
      expect(screen.getByText('昵称')).toBeInTheDocument();
      expect(screen.getByText('会员ID')).toBeInTheDocument();
    });
  });

  it('has no add button (detail only)', async () => {
    renderUsers();
    await waitFor(() => {
      expect(screen.queryByText('+新增')).not.toBeInTheDocument();
    });
  });

  it('opens detail drawer when clicking detail', async () => {
    renderUsers();
    await waitFor(() => {
      expect(screen.getByText('昵称')).toBeInTheDocument();
    });
  });
});