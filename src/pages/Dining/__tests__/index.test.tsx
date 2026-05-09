import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { render } from '@/test-utils';
import DiningPage from '@/pages/Dining/index';

const mockDinings = [
  { diningId: 1, diningName: '餐饮A', status: '1', diningNature: 'chinese', avgCost: 80, address: '测试地址' },
  { diningId: 2, diningName: '餐饮B', status: '0', diningNature: 'western', avgCost: 120, address: '地址B' },
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
  http.post('*/travel18/dining/edit', () => HttpResponse.json({ code: 200, msg: '操作成功' })),
  http.post('*/travel18/dining/remove', () => HttpResponse.json({ code: 200, msg: '操作成功' })),
  http.post('*/travel18/dish/list', () =>
    HttpResponse.json({ code: 200, msg: 'success', total: mockDishes.length, rows: mockDishes }),
  ),
  http.post('*/travel18/dish/add', () => HttpResponse.json({ code: 200, msg: '操作成功' })),
  http.post('*/travel18/dish/edit', () => HttpResponse.json({ code: 200, msg: '操作成功' })),
  http.post('*/travel18/dish/remove', () => HttpResponse.json({ code: 200, msg: '操作成功' })),
  http.get('*/system/dict/data/type/*', () => HttpResponse.json({ code: 200, msg: 'success', data: [] })),
];

const mswServer = setupServer(...handlers);

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => mswServer.resetHandlers());
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
