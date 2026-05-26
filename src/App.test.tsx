import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { vi } from 'vitest';
import React from 'react';
import { server } from '../mocks/server';
import App from './App';

test('Work App Component without error', () => {
  render(<App />);

  expect(screen.getByText("I'm REACT_APP_TEXT from .234")).toBeInTheDocument();
});

test('Working Counter', async () => {
  const user = userEvent.setup();
  const { getByText } = render(<App />);
  expect(getByText('count is: 0')).toBeInTheDocument();

  const button = getByText(/count is: \d/);

  await user.click(button);
  expect(getByText('count is: 1')).toBeInTheDocument();

  await user.click(button);
  expect(getByText('count is: 2')).toBeInTheDocument();

  await user.click(button);
  expect(getByText('count is: 3')).toBeInTheDocument();
});

test('working with msw', async () => {
  const currentUserRequest = vi.fn();
  server.use(
    http.get('*/system/user/', () => {
      currentUserRequest();
      return HttpResponse.json({ code: 200, roles: [], posts: [] });
    }),
  );

  render(<App />);

  await waitFor(() => {
    expect(currentUserRequest).toHaveBeenCalled();
  });
  expect(screen.getByText("I'm REACT_APP_TEXT from .234")).toBeInTheDocument();
});
