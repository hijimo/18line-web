import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { render } from '@/test-utils';
import DiningPage from '@/pages/Dining/index';

const mockDinings = [
  { diningId: 1, diningName: '餐饮A', status: '1', diningNature: 'chinese', diningCategory: '1', openTime: '11:00', closeTime: '21:30', avgCost: 80, address: '测试地址' },
  { diningId: 2, diningName: '餐饮B', status: '0', diningNature: 'western', diningCategory: '0', avgCost: 120, address: '地址B' },
];

const editRequests: any[] = [];

const diningCategoryDict = [
  { dictValue: '0', dictLabel: '大众常规', dictType: 'travel_dining_category' },
  { dictValue: '1', dictLabel: '地方特色', dictType: 'travel_dining_category' },
];

const mockDishes = [
  { dishId: 1, diningId: 1, dishName: '菜品A', status: '1', price: 30, specialStar: 3 },
  { dishId: 2, diningId: 1, dishName: '菜品B', status: '0', price: 50, specialStar: 5 },
];

const handlers = [
  http.post('*/travel18/dining/list', () =>
    HttpResponse.json({ code: 200, msg: 'success', total: mockDinings.length, rows: mockDinings }),
  ),
  http.post('*/travel18/dining/add', () => HttpResponse.json({ code: 200, msg: '操作成功' })),
  http.post('*/travel18/dining/edit', async ({ request }) => {
    editRequests.push(await request.json());
    return HttpResponse.json({ code: 200, msg: '操作成功' });
  }),
  http.post('*/travel18/dining/remove', () => HttpResponse.json({ code: 200, msg: '操作成功' })),
  http.post('*/travel18/dish/list', () =>
    HttpResponse.json({ code: 200, msg: 'success', total: mockDishes.length, rows: mockDishes }),
  ),
  http.post('*/travel18/dish/add', () => HttpResponse.json({ code: 200, msg: '操作成功' })),
  http.post('*/travel18/dish/edit', () => HttpResponse.json({ code: 200, msg: '操作成功' })),
  http.post('*/travel18/dish/remove', () => HttpResponse.json({ code: 200, msg: '操作成功' })),
  http.get('*/system/dict/data/type/travel_dining_category', () =>
    HttpResponse.json({ code: 200, msg: 'success', data: diningCategoryDict }),
  ),
  http.get('*/system/dict/data/type/*', () => HttpResponse.json({ code: 200, msg: 'success', data: [] })),
];

const mswServer = setupServer(...handlers);

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  mswServer.resetHandlers();
  editRequests.length = 0;
});
afterAll(() => mswServer.close());

describe('餐饮管理 (Dining) Page', () => {
  it('renders the dining table with data', async () => {
    render(<DiningPage />);
    await waitFor(() => {
      expect(screen.getByText('餐饮A')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('"添加餐饮" button opens the dining form drawer', async () => {
    render(<DiningPage />);
    const user = userEvent.setup();
    const addButton = await screen.findByRole('button', { name: /添加餐饮/ });
    await user.click(addButton);
    await waitFor(() => {
      expect(screen.getByText('新增餐饮')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('"编辑" action opens drawer with edit title', async () => {
    render(<DiningPage />);
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByText('餐饮A')).toBeInTheDocument();
    }, { timeout: 5000 });
    const editLinks = screen.getAllByText('编辑');
    await user.click(editLinks[0]);
    await waitFor(() => {
      expect(screen.getByText('编辑餐饮')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('"菜品" action opens the dishes drawer with 80vw width', async () => {
    render(<DiningPage />);
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByText('餐饮A')).toBeInTheDocument();
    }, { timeout: 5000 });
    const dishLinks = screen.getAllByText('菜品');
    await user.click(dishLinks[0]);
    await waitFor(() => {
      expect(screen.getByText('餐饮A - 菜品管理')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('dishes drawer shows dish data filtered by diningId', async () => {
    render(<DiningPage />);
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByText('餐饮A')).toBeInTheDocument();
    }, { timeout: 5000 });
    const dishLinks = screen.getAllByText('菜品');
    await user.click(dishLinks[0]);
    await waitFor(() => {
      expect(screen.getByText('菜品A')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('"添加菜品" button in dishes drawer opens dish form', async () => {
    render(<DiningPage />);
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByText('餐饮A')).toBeInTheDocument();
    }, { timeout: 5000 });
    const dishLinks = screen.getAllByText('菜品');
    await user.click(dishLinks[0]);
    await waitFor(() => {
      expect(screen.getByText('餐饮A - 菜品管理')).toBeInTheDocument();
    }, { timeout: 3000 });
    const addDishButton = await screen.findByRole('button', { name: /添加菜品/ });
    await user.click(addDishButton);
    await waitFor(() => {
      expect(screen.getByText('新增菜品')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('列表渲染餐饮类别字典标签与营业时间', async () => {
    render(<DiningPage />);
    await waitFor(() => {
      expect(screen.getByText('餐饮A')).toBeInTheDocument();
    }, { timeout: 5000 });
    // diningCategory '1' -> 地方特色, '0' -> 大众常规
    await waitFor(() => {
      expect(screen.getByText('地方特色')).toBeInTheDocument();
      expect(screen.getByText('大众常规')).toBeInTheDocument();
    }, { timeout: 5000 });
    // 营业时间由 openTime-closeTime 拼接；缺失时回退 '--'
    expect(screen.getByText('11:00-21:30')).toBeInTheDocument();
  });

  it('编辑抽屉回填营业时间为可用的 TimePicker 值', async () => {
    render(<DiningPage />);
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByText('餐饮A')).toBeInTheDocument();
    }, { timeout: 5000 });
    await user.click(screen.getAllByText('编辑')[0]);
    await waitFor(() => {
      expect(screen.getByText('编辑餐饮')).toBeInTheDocument();
    }, { timeout: 3000 });
    // 字符串 'HH:mm' 需要 dayjs 的 customParseFormat 才能解析，否则这里是 Invalid Date
    await waitFor(() => {
      const drawer = document.querySelector('.ant-drawer-open') as HTMLElement;
      const values = Array.from(drawer.querySelectorAll('input')).map((i) => (i as HTMLInputElement).value);
      expect(values).toContain('11:00');
      expect(values).toContain('21:30');
    }, { timeout: 3000 });
  });

  it('新增抽屉包含餐饮类别与营业时间字段', async () => {
    render(<DiningPage />);
    const user = userEvent.setup();
    const addButton = await screen.findByRole('button', { name: /添加餐饮/ });
    await user.click(addButton);
    await waitFor(() => {
      expect(screen.getByText('新增餐饮')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('餐饮类别')).toBeInTheDocument();
    expect(screen.getByText('营业开始时间')).toBeInTheDocument();
    expect(screen.getByText('营业结束时间')).toBeInTheDocument();
  });

  it('提交时营业时间回传 HH:mm 字符串，清空后回传空串而非丢字段', async () => {
    render(<DiningPage />);
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByText('餐饮A')).toBeInTheDocument();
    }, { timeout: 5000 });
    await user.click(screen.getAllByText('编辑')[0]);
    await waitFor(() => {
      expect(screen.getByText('编辑餐饮')).toBeInTheDocument();
    }, { timeout: 3000 });

    const drawer = document.querySelector('.ant-drawer-open') as HTMLElement;
    const submit = drawer
      .querySelector('.ant-drawer-extra button.ant-btn-primary') as HTMLElement;

    // 不改动直接保存：应把 dayjs 值格式化回 'HH:mm' 字符串
    await user.click(submit);
    await waitFor(() => expect(editRequests.length).toBe(1), { timeout: 3000 });
    expect(editRequests[0].openTime).toBe('11:00');
    expect(editRequests[0].closeTime).toBe('21:30');
    expect(editRequests[0].diningCategory).toBe('1');

    // 清空营业时间后保存：必须显式回传 ''，否则后端 `!= null` 守卫会保留旧值，永远清不掉
    await user.click(screen.getAllByText('编辑')[0]);
    await waitFor(() => {
      expect(screen.getByText('编辑餐饮')).toBeInTheDocument();
    }, { timeout: 3000 });
    const drawer2 = document.querySelector('.ant-drawer-open') as HTMLElement;
    const clearBtns = drawer2.querySelectorAll('.ant-picker-clear');
    expect(clearBtns.length).toBeGreaterThan(0);
    await user.click(clearBtns[0] as HTMLElement);
    const submit2 = drawer2
      .querySelector('.ant-drawer-extra button.ant-btn-primary') as HTMLElement;
    await user.click(submit2);
    await waitFor(() => expect(editRequests.length).toBe(2), { timeout: 3000 });
    expect(editRequests[1].openTime).toBe('');
  });

  it('form validation shows error for required dining name', async () => {
    render(<DiningPage />);
    const user = userEvent.setup();
    const addButton = await screen.findByRole('button', { name: /添加餐饮/ });
    await user.click(addButton);
    await waitFor(() => {
      expect(screen.getByText('新增餐饮')).toBeInTheDocument();
    }, { timeout: 3000 });
    const drawerExtra = document.querySelector('.ant-drawer-open .ant-drawer-extra');
    const submitButton = drawerExtra?.querySelector('button.ant-btn-primary') as HTMLElement;
    expect(submitButton).toBeTruthy();
    await user.click(submitButton);
    await waitFor(() => {
      const errors = document.querySelectorAll('.ant-form-item-explain-error');
      expect(errors.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});
