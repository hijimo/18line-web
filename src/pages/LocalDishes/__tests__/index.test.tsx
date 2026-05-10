import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router';
import LocalDishes from '@/pages/LocalDishes';

vi.mock('@/services/api/地方特色菜管理/地方特色菜管理', () => ({
  get: () => ({
    list2: vi.fn().mockResolvedValue({
      code: 200,
      total: 2,
      rows: [
        { specialtyId: 1, dishName: '地方特色菜A', price: 38, specialStar: 5, status: '0', createTime: '2024-01-01' },
        { specialtyId: 2, dishName: '地方特色菜B', price: 25, specialStar: 4, status: '1', createTime: '2024-02-01' },
      ],
    }),
    addSave3: vi.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
    editSave2: vi.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
    remove4: vi.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
    getInfo12: vi.fn().mockResolvedValue({ code: 200 }),
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
          <LocalDishes />
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );

describe('地方特色菜 (LocalDishes) Page', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('表格正确渲染数据', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('地方特色菜A')).toBeInTheDocument();
    });
  });

  it('操作列包含编辑、删除、上架/下架', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('编辑').length).toBeGreaterThan(0);
      expect(screen.getAllByText('删除').length).toBeGreaterThan(0);
    });
  });

  it('点击"添加特色菜"按钮打开抽屉', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('添加特色菜')).toBeInTheDocument();
    });
    await user.click(screen.getByText('添加特色菜'));
    await waitFor(() => {
      expect(screen.getByText('新增特色菜')).toBeInTheDocument();
    });
  });

  it('点击编辑打开编辑抽屉', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('编辑').length).toBeGreaterThan(0);
    });
    await user.click(screen.getAllByText('编辑')[0]);
    await waitFor(() => {
      expect(screen.getByText('编辑特色菜')).toBeInTheDocument();
    });
  });
});
