import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import Attractions from '@/pages/Attractions';
import { get as getAttractionApi } from '@/services/api/景点管理/景点管理';

vi.mock('@/services/api/景点管理/景点管理', () => ({
  get: () => ({
    list7: vi.fn().mockResolvedValue({
      code: 200,
      data: {
        data: [
          { id: 1, name: '老街', openTime: '全天', relaxIndex: '中等', playDuration: 2, location: '松阳', isFamily: true, classicIndex: 4, ticketPrice: 0, checkinCount: 5, status: '上架' },
        ],
        pageNo: 1,
        pageSize: 10,
        totalCount: 1,
      },
    }),
    addSave7: vi.fn().mockResolvedValue({ code: 200, message: '成功' }),
    editSave7: vi.fn().mockResolvedValue({ code: 200, message: '成功' }),
    remove9: vi.fn().mockResolvedValue({ code: 200, message: '成功' }),
    getInfo11: vi.fn().mockResolvedValue({ code: 200, data: {} }),
    checkinList: vi.fn().mockResolvedValue({ code: 200, data: [] }),
  }),
}));

vi.mock('@/components/Upload', () => ({
  default: () => <div data-testid="upload">Upload Component</div>,
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
    </QueryClientProvider>
  );

describe('Attractions Page', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('renders the page with table', async () => {
    renderAttractions();
    await waitFor(() => {
      expect(screen.getByText('名称')).toBeInTheDocument();
    });
  });

  it('renders the add button', async () => {
    renderAttractions();
    await waitFor(() => {
      expect(screen.getByText('+景点')).toBeInTheDocument();
    });
  });

  it('opens add drawer when clicking add button', async () => {
    renderAttractions();
    await waitFor(() => {
      expect(screen.getByText('+景点')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('+景点'));
    await waitFor(() => {
      expect(screen.getByText('新增景点')).toBeInTheDocument();
    });
  });

  it('renders form fields in add drawer', async () => {
    renderAttractions();
    await waitFor(() => {
      expect(screen.getByText('+景点')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('+景点'));
    await waitFor(() => {
      expect(screen.getByText('景点名称')).toBeInTheDocument();
      expect(screen.getByText('简称')).toBeInTheDocument();
      expect(screen.getByText('描述')).toBeInTheDocument();
      expect(screen.getByText('经典指数')).toBeInTheDocument();
      expect(screen.getByText('休闲指数')).toBeInTheDocument();
    });
  });

  it('renders cancel and confirm buttons in add drawer', async () => {
    renderAttractions();
    await waitFor(() => {
      expect(screen.getByText('+景点')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('+景点'));
    await waitFor(() => {
      expect(screen.getByText('取消')).toBeInTheDocument();
      expect(screen.getByText('确定')).toBeInTheDocument();
    });
  });

  it('closes drawer when clicking cancel', async () => {
    renderAttractions();
    await waitFor(() => {
      expect(screen.getByText('+景点')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('+景点'));
    await waitFor(() => {
      expect(screen.getByText('新增景点')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('取消'));
    await waitFor(() => {
      expect(screen.queryByText('新增景点')).not.toBeInTheDocument();
    });
  });
});