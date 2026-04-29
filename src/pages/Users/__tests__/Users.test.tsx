import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router';
import Users from '@/pages/Users';

vi.mock('@/services/api/用户管理/用户管理', () => ({
  get: () => ({
    list15: vi.fn().mockResolvedValue({
      code: 200,
      total: 1,
      rows: [
        { userId: 1, userName: 'admin', nickName: '管理员', phonenumber: '13800138000', email: 'admin@test.com', sex: '0', status: '0', dept: { deptName: '研发部' }, createTime: '2024-01-01' },
      ],
    }),
    add3: vi.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
    edit3: vi.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
    getInfo15: vi.fn().mockResolvedValue({ code: 200 }),
    remove14: vi.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
    changeStatus: vi.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
    resetPwd: vi.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
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
          <Users />
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );

describe('用户管理 (Users) Page', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('有新增按钮', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /新增/ })).toBeInTheDocument();
    });
  });

  it('点击新增打开新增抽屉', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /新增/ })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /新增/ }));
    await waitFor(() => {
      expect(screen.getByText('新增用户')).toBeInTheDocument();
    });
  });

  it('操作列包含编辑、删除、停用、重置密码', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('编辑')).toBeInTheDocument();
      expect(screen.getByText('删除')).toBeInTheDocument();
      expect(screen.getByText('停用')).toBeInTheDocument();
      expect(screen.getByText('重置密码')).toBeInTheDocument();
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
      expect(screen.getByText('编辑用户')).toBeInTheDocument();
    });
  });
});
