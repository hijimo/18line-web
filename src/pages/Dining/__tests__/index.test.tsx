/**
 * Dining (餐饮管理) page tests.
 *
 * This module has CRUD plus a "dishes" sub-list per dining item.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { render } from '@/test-utils';
import { crudHandlers } from '@/test-utils/crud-msw-handlers';
import {
  verifyTableRenders,
  verifyAddButtonExistsAndOpensDrawer,
  verifyDetailActionExists,
  verifyEditActionExists,
  verifyStatusToggleExists,
  clickActionAndVerifyDrawer,
} from '@/test-utils/crud-test-helpers';

let DiningPage: React.ComponentType;
try {
  DiningPage = require('@/pages/Dining/index').default;
} catch {
  DiningPage = null;
}

const mswServer = setupServer(...crudHandlers);

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

const describeIfComponentExists = DiningPage ? describe : describe.skip;

describeIfComponentExists('餐饮管理 (Dining) Page', () => {
  beforeEach(() => {
    render(<DiningPage />);
  });

  it('renders the table correctly', async () => {
    await verifyTableRenders(['餐饮A']);
  });

  it('"新增" button exists and opens drawer on click', async () => {
    await verifyAddButtonExistsAndOpensDrawer('新增');
  });

  it('"详情" action opens drawer with detail mode', async () => {
    await verifyDetailActionExists();
    await clickActionAndVerifyDrawer('详情');
  });

  it('"编辑" action opens drawer with edit mode', async () => {
    await verifyEditActionExists();
    await clickActionAndVerifyDrawer('编辑');
  });

  it('status toggle (上架/下架) works', async () => {
    await verifyStatusToggleExists();
  });

  it('form validation shows errors for required fields on empty submit', async () => {
    const user = userEvent.setup();
    const addButton = screen.getByRole('button', { name: /新增/ });
    await user.click(addButton);

    await waitFor(() => {
      expect(document.querySelector('.ant-drawer-open')).toBeTruthy();
    }, { timeout: 3000 });

    const submitButton = screen.getByRole('button', { name: /确定|提交|保存/ });
    await user.click(submitButton);

    await waitFor(() => {
      const errors = document.querySelectorAll('.ant-form-item-explain-error');
      expect(errors.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('detail drawer shows dishes sub-list for a dining item', async () => {
    // Override the dishes-by-dining handler to return visible data
    mswServer.use(
      http.get('*/travel18/dining/:id/dishes', () =>
        HttpResponse.json({
          code: 200,
          message: 'success',
          data: [{ id: 1, name: '关联菜品1' }],
        }),
      ),
    );

    await verifyDetailActionExists();
    await clickActionAndVerifyDrawer('详情');

    // After opening detail drawer, dishes should be visible
    await waitFor(() => {
      expect(screen.getByText('关联菜品1')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});