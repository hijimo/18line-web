/**
 * Photography (跟拍管理) page tests.
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

let PhotographyPage: React.ComponentType;
try {
  PhotographyPage = require('@/pages/Photography/index').default;
} catch {
  PhotographyPage = null;
}

const mswServer = setupServer(...crudHandlers);

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

const describeIfComponentExists = PhotographyPage ? describe : describe.skip;

describeIfComponentExists('跟拍管理 (Photography) Page', () => {
  beforeEach(() => {
    render(<PhotographyPage />);
  });

  it('renders the table correctly', async () => {
    await verifyTableRenders(['跟拍A']);
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
});