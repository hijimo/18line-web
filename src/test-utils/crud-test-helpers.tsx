/**
 * Shared test helpers for CRUD page tests.
 *
 * Each CRUD page follows a similar pattern:
 * - ProTable with columns, search, and request
 * - Drawer for add/edit/detail modes
 * - Status toggle (上架/下架)
 *
 * This module provides helper functions to reduce duplication.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Verifies that the ProTable renders with data rows.
 * Looks for table rows containing mock data.
 */
export async function verifyTableRenders(mockDataNames: string[]) {
  await waitFor(() => {
    for (const name of mockDataNames) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  }, { timeout: 5000 });
}

/**
 * Verifies the "新增" button exists and is clickable.
 */
export async function verifyAddButtonExistsAndOpensDrawer(buttonText = '新增') {
  const user = userEvent.setup();
  const addButton = screen.getByRole('button', { name: new RegExp(buttonText) });
  expect(addButton).toBeInTheDocument();
  await user.click(addButton);
  // After clicking, a drawer should open -- look for a drawer title or form
  await waitFor(() => {
    // Ant Design Drawer renders a header; look for the drawer mask or title
    expect(document.querySelector('.ant-drawer-open')).toBeTruthy();
  }, { timeout: 3000 });
}

/**
 * Verifies the "详情" action link/button exists in the table.
 */
export async function verifyDetailActionExists() {
  await waitFor(() => {
    expect(screen.getByText('详情')).toBeInTheDocument();
  }, { timeout: 5000 });
}

/**
 * Verifies the "编辑" action link/button exists in the table.
 */
export async function verifyEditActionExists() {
  await waitFor(() => {
    expect(screen.getByText('编辑')).toBeInTheDocument();
  }, { timeout: 5000 });
}

/**
 * Clicks a row action (编辑/详情) and verifies the drawer opens.
 */
export async function clickActionAndVerifyDrawer(actionText: string) {
  const user = userEvent.setup();
  const actionLink = screen.getByText(actionText);
  await user.click(actionLink);
  await waitFor(() => {
    expect(document.querySelector('.ant-drawer-open')).toBeTruthy();
  }, { timeout: 3000 });
}

/**
 * Verifies status toggle (上架/下架) exists in the table rows.
 */
export async function verifyStatusToggleExists() {
  await waitFor(() => {
    // Look for Switch component or status text
    const switches = document.querySelectorAll('.ant-switch');
    expect(switches.length).toBeGreaterThan(0);
  }, { timeout: 5000 });
}

/**
 * Verifies that a ProTable search form renders with expected field labels.
 */
export async function verifySearchFormFields(fieldLabels: string[]) {
  for (const label of fieldLabels) {
    // ProTable search form fields have labels in the form
    expect(screen.getByText(label)).toBeInTheDocument();
  }
}

/**
 * Verifies drawer form fields render after opening the drawer.
 */
export async function verifyDrawerFormFields(fieldLabels: string[]) {
  await waitFor(() => {
    for (const label of fieldLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  }, { timeout: 3000 });
}

/**
 * Verifies form validation: attempts to submit an empty form and checks for error messages.
 */
export async function verifyFormValidation(requiredFieldLabels: string[]) {
  const user = userEvent.setup();
  // Find and click the submit/confirm button in the drawer
  const submitButton = screen.getByRole('button', { name: /确定|提交|保存/ });
  await user.click(submitButton);

  // Ant Design form validation shows error messages
  await waitFor(() => {
    for (const label of requiredFieldLabels) {
      // Look for validation error messages near the field
      const errorTexts = document.querySelectorAll('.ant-form-item-explain-error');
      expect(errorTexts.length).toBeGreaterThan(0);
    }
  }, { timeout: 3000 });
}