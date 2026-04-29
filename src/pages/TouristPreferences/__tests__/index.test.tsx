import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router';
import TouristPreferences from '@/pages/TouristPreferences';

vi.mock('@/services/api/游客喜好管理/游客喜好管理', () => ({
  get: () => ({
    list13: vi.fn().mockResolvedValue({
      code: 200,
      total: 1,
      rows: [
        { preferenceId: 1, touristId: 100, gender: '1', birthYear: 1990, stamina: '1', travelLikes: '自然风光', foodLikes: '辣味', stayPref: '民宿', healthTags: '无', createTime: '2024-01-01' },
      ],
    }),
    edit2: vi.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
    getInfo5: vi.fn().mockResolvedValue({ code: 200 }),
    remove13: vi.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const renderPage = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <MemoryRouter>
          <TouristPreferences />
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );

describe('游客喜好管理 (TouristPreferences) Page', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('没有新增按钮', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.queryByText('+新增')).not.toBeInTheDocument();
    });
  });

  it('操作列包含详情、编辑、删除', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('详情')).toBeInTheDocument();
      expect(screen.getByText('编辑')).toBeInTheDocument();
      expect(screen.getByText('删除')).toBeInTheDocument();
    });
  });

  it('点击详情打开详情抽屉', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('详情')).toBeInTheDocument();
    });
    await user.click(screen.getByText('详情'));
    await waitFor(() => {
      expect(screen.getByText('游客喜好详情')).toBeInTheDocument();
    });
  });

  it('点击编辑打开编辑抽屉', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('编辑')).toBeInTheDocument();
    });
    await user.click(screen.getByText('编辑'));
    await waitFor(() => {
      expect(screen.getByText('编辑游客喜好')).toBeInTheDocument();
    });
  });
});
