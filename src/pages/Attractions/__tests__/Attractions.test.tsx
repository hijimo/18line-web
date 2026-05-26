import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Attractions from '@/pages/Attractions';
import { get as getAttractionApi } from '@/services/api/景点管理/景点管理';

vi.mock('@/services/api/景点管理/景点管理', () => ({
  get: () => ({
    list8: vi.fn().mockResolvedValue({
      code: 200,
      rows: [
        {
          attractionId: 1,
          attractionName: '老街',
          shortName: '老街',
          openTime: '全天',
          relaxIndex: '中等',
          playDuration: 2,
          location: '松阳',
          isFamily: true,
          classicIndex: 4,
          ticketPrice: 0,
          checkinCount: 5,
          status: '0',
        },
      ],
      total: 1,
    }),
    addSave9: vi.fn().mockResolvedValue({ code: 200, message: '成功' }),
    editSave8: vi.fn().mockResolvedValue({ code: 200, message: '成功' }),
    remove10: vi.fn().mockResolvedValue({ code: 200, message: '成功' }),
    getInfo17: vi.fn().mockResolvedValue({ code: 200, data: {} }),
    checkinList: vi.fn().mockResolvedValue({ code: 200, data: [] }),
  }),
}));

vi.mock('@/components/Upload', () => ({
  default: () => <div data-testid="upload">Upload Component</div>,
}));

vi.mock('@/components/RegionFormItem', () => ({
  default: () => <div data-testid="region-form-item">Region Form Item</div>,
}));

vi.mock('@/components/DataSelect/LineSelect', () => ({
  default: () => <div data-testid="line-select">Line Select</div>,
}));

vi.mock('@/components/DataSelect/DictSelect', () => ({
  default: () => <div data-testid="dict-select">Dict Select</div>,
}));

vi.mock('@/hooks/useDictMap', () => ({
  useDictMap: () => ({}),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const renderAttractions = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <MemoryRouter>
          <Attractions />
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );

const getDrawerExtra = () => {
  const extra = document.querySelector('.ant-drawer-open .ant-drawer-extra');
  expect(extra).toBeTruthy();
  return within(extra as HTMLElement);
};

describe('Attractions Page', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('renders the page with table', async () => {
    renderAttractions();
    await waitFor(() => {
      expect(screen.getAllByText('名称').length).toBeGreaterThan(0);
    });
  });

  it('renders the add button', async () => {
    renderAttractions();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /添加景点/ })).toBeInTheDocument();
    });
  });

  it('opens add drawer when clicking add button', async () => {
    renderAttractions();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /添加景点/ })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /添加景点/ }));
    await waitFor(() => {
      expect(screen.getByText('新增景点')).toBeInTheDocument();
    });
  });

  it('renders form fields in add drawer', async () => {
    renderAttractions();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /添加景点/ })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /添加景点/ }));
    await waitFor(() => {
      expect(screen.getByText('景点名称')).toBeInTheDocument();
      expect(screen.getByText('简称')).toBeInTheDocument();
      expect(screen.getByText('描述')).toBeInTheDocument();
      expect(screen.getAllByText('经典指数').length).toBeGreaterThan(0);
      expect(screen.getAllByText('休闲指数').length).toBeGreaterThan(0);
    });
  });

  it('renders cancel and confirm buttons in add drawer', async () => {
    renderAttractions();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /添加景点/ })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /添加景点/ }));
    await waitFor(() => {
      const drawerExtra = getDrawerExtra();
      expect(drawerExtra.getByRole('button', { name: /取\s*消/ })).toBeInTheDocument();
      expect(drawerExtra.getByRole('button', { name: /确\s*定/ })).toBeInTheDocument();
    });
  });

  it('closes drawer when clicking cancel', async () => {
    renderAttractions();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /添加景点/ })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /添加景点/ }));
    await waitFor(() => {
      expect(screen.getByText('新增景点')).toBeInTheDocument();
    });
    await userEvent.click(getDrawerExtra().getByRole('button', { name: /取\s*消/ }));
    await waitFor(() => {
      expect(document.querySelector('.ant-drawer-open')).not.toBeInTheDocument();
    });
  });
});
