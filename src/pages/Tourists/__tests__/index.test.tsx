import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router';
import Tourists from '@/pages/Tourists';

vi.mock('@/services/api/游客管理/游客管理', () => ({
  get: () => ({
    list11: vi.fn().mockResolvedValue({
      code: 200,
      total: 1,
      rows: [
        { touristId: 1, nickname: '测试游客', phone: '13800138000', gender: '1', realName: '张三', status: '0', createTime: '2024-01-01' },
      ],
    }),
    edit1: vi.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
    getInfo2: vi.fn().mockResolvedValue({ code: 200 }),
    remove12: vi.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
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
          <Tourists />
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );

describe('游客管理 (Tourists) Page', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('没有新增按钮（游客由小程序注册）', async () => {
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
      expect(screen.getByText('游客详情')).toBeInTheDocument();
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
      expect(screen.getByText('编辑游客')).toBeInTheDocument();
    });
  });
});
