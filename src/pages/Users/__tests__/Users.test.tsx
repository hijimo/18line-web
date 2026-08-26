import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router';
import Users from '@/pages/Users';

const { add4, edit3, getInfo23, list25, provinceList1, cityList1, districtList1, regionTree } =
  vi.hoisted(() => ({
  add4: vi.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
  edit3: vi.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
  getInfo23: vi.fn(),
  list25: vi.fn(),
  provinceList1: vi.fn(),
  cityList1: vi.fn(),
  districtList1: vi.fn(),
  regionTree: vi.fn(),
}));

vi.mock('@/services/api/用户管理/用户管理', () => ({
  get: () => ({
    list24: vi.fn().mockResolvedValue({
      code: 200,
      total: 1,
      rows: [
        {
          userId: 2,
          userName: 'syline',
          nickName: '松阳管理员',
          phonenumber: '13800138000',
          email: 'syline@test.com',
          sex: '0',
          status: '0',
          regionCode: '331124',
          dept: { deptName: '研发部' },
          createTime: '2024-01-01',
        },
      ],
    }),
    add4,
    edit3,
    getInfo22: vi.fn().mockResolvedValue({ code: 200 }),
    getInfo23,
    remove15: vi.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
    changeStatus: vi.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
    resetPwd: vi.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
  }),
}));

beforeEach(() => {
  getInfo23.mockResolvedValue({ code: 200, data: {}, roleIds: [2] });
  list25.mockResolvedValue({
    code: 200,
    rows: [{ roleId: 2, roleName: '区域管理员', roleKey: 'region', status: '0' }],
  });
  provinceList1.mockResolvedValue({
    code: 200,
    data: [{ regionCode: '330000', regionName: '浙江省' }],
  });
  cityList1.mockResolvedValue({
    code: 200,
    data: [{ regionCode: '331100', regionName: '丽水市' }],
  });
  districtList1.mockResolvedValue({
    code: 200,
    data: [{ regionCode: '331124', regionName: '松阳县' }],
  });
  regionTree.mockResolvedValue({
    code: 200,
    data: [
      {
        regionCode: '330000',
        regionName: '浙江省',
        children: [
          {
            regionCode: '331100',
            regionName: '丽水市',
            children: [{ regionCode: '331124', regionName: '松阳县', children: [] }],
          },
        ],
      },
    ],
  });
});

vi.mock('@/services/api/省市区编码管理/省市区编码管理', () => ({
  get: () => ({ provinceList1, cityList1, districtList1, regionTree }),
}));

vi.mock('@/services/api/角色管理/角色管理', () => ({
  get: () => ({ list25 }),
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

/** 打开指定占位符的下拉框并选中同名选项（抽屉内下拉顺序：性别、状态、角色、省、市、区） */
const REGION_COMBO_INDEX: Record<string, number> = { 角色: 2, 省: 3, 市: 4, 区: 5 };
const selectOption = async (
  user: ReturnType<typeof userEvent.setup>,
  placeholder: string,
  optionText: string,
) => {
  const drawer = await screen.findByRole('dialog');
  const combo = within(drawer).getAllByRole('combobox')[REGION_COMBO_INDEX[placeholder]];
  await user.click(combo);
  // 可见下拉项带 title 属性；role=option 命中的是隐藏 a11y listbox
  const option = await screen.findByTitle(optionText);
  await user.click(option);
};

describe('用户管理 (Users) Page', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('列表展示"区域"列并将编码渲染为中文名', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: '区域' })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('松阳县')).toBeInTheDocument();
    });
    expect(regionTree).toHaveBeenCalledTimes(1);
  });

  it('新增抽屉包含省/市/区三级联动，提交时携带最末级 regionCode', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /添加用户/ }));
    await screen.findByText('新增用户');
    const drawer = await screen.findByRole('dialog');

    // 抽屉内表单顺序：用户名、昵称、密码、手机号、邮箱（均为同一占位符）
    const drawerInputs = within(drawer).getAllByPlaceholderText('请输入');
    await user.type(drawerInputs[0], 'testline');
    await user.type(drawerInputs[1], '测试区域账号');
    await user.type(drawerInputs[2], '18line');

    await selectOption(user, '角色', '区域管理员');

    await selectOption(user, '省', '浙江省');
    expect(cityList1).toHaveBeenCalledWith({ provinceCode: '330000' });

    await selectOption(user, '市', '丽水市');
    expect(districtList1).toHaveBeenCalledWith({ cityCode: '331100' });

    await selectOption(user, '区', '松阳县');

    // antd 会给两个汉字的按钮文案插入空格
    await user.click(screen.getByRole('button', { name: /确\s*定/ }));

    await waitFor(() => {
      expect(add4).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: 'testline',
          nickName: '测试区域账号',
          regionCode: '331124',
          roleIds: [2],
        }),
      );
    });
  }, 15000);

  it('编辑时回显三级区域与已授角色', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText('编辑'));
    await screen.findByText('编辑用户');

    expect(getInfo23).toHaveBeenCalledWith({ userId: 2 });

    const drawer = await screen.findByRole('dialog');
    await waitFor(() => {
      expect(within(drawer).getAllByText('浙江省').length).toBeGreaterThan(0);
      expect(within(drawer).getAllByText('丽水市').length).toBeGreaterThan(0);
      expect(within(drawer).getAllByText('松阳县').length).toBeGreaterThan(0);
      expect(within(drawer).getAllByText('区域管理员').length).toBeGreaterThan(0);
    });

    expect(cityList1).toHaveBeenCalledWith({ provinceCode: '330000' });
    expect(districtList1).toHaveBeenCalledWith({ cityCode: '331100' });
  });
});
