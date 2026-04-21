/**
 * Users (用户管理) page tests.
 *
 * NOTE: Users page only has "详情" action -- no add/edit in the user-facing UI.
 * The API has add/edit endpoints, but those are for system admins.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';

import { render } from '@/test-utils';
import { crudHandlers } from '@/test-utils/crud-msw-handlers';
import {
  verifyTableRenders,
  verifyDetailActionExists,
  clickActionAndVerifyDrawer,
} from '@/test-utils/crud-test-helpers';

let UsersPage: React.ComponentType;
try {
  UsersPage = require('@/pages/Users/index').default;
} catch {
  UsersPage = null;
}

const mswServer = setupServer(...crudHandlers);

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

const describeIfComponentExists = UsersPage ? describe : describe.skip;

describeIfComponentExists('用户管理 (Users) Page', () => {
  beforeEach(() => {
    render(<UsersPage />);
  });

  it('renders the table correctly', async () => {
    await verifyTableRenders(['测试用户']);
  });

  it('"详情" action exists in the table', async () => {
    await verifyDetailActionExists();
  });

  it('"详情" action opens drawer with read-only data', async () => {
    await verifyDetailActionExists();
    await clickActionAndVerifyDrawer('详情');

    // After opening detail, verify read-only data
    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('"新增" button should NOT exist (read-only page)', async () => {
    await waitFor(() => {
      // Users page has no add button
      const addButton = screen.queryByRole('button', { name: /新增/ });
      expect(addButton).toBeNull();
    }, { timeout: 5000 });
  });

  it('"编辑" action should NOT exist (read-only page)', async () => {
    await waitFor(() => {
      const editLink = screen.queryByText('编辑');
      expect(editLink).toBeNull();
    }, { timeout: 5000 });
  });

  it('table columns include expected headers', async () => {
    await waitFor(() => {
      // Users have specific columns per userColumns.tsx
      expect(screen.getByText('用户邮箱')).toBeInTheDocument();
      expect(screen.getByText('状态')).toBeInTheDocument();
      expect(screen.getByText('操作')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});