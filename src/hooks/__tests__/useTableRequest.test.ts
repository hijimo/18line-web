import { renderHook } from '@testing-library/react';
import { useTableRequest } from '../useTableRequest';
import type { ResponsePaginationData } from '@/types';

describe('useTableRequest', () => {
  const mockDataLoader = vi.fn();
  const mockPaginatedResponse: ResponsePaginationData = {
    code: 200,
    message: 'success',
    data: {
      data: [{ id: 1, name: 'test' }],
      pageNo: 1,
      pageSize: 10,
      totalCount: 1,
      totalPage: 1,
    },
    sessionId: 'mock-session',
  };

  beforeEach(() => {
    mockDataLoader.mockReset();
  });

  describe('pagination transformation', () => {
    it('transforms current/pageSize to pageNo/pageSize params', async () => {
      mockDataLoader.mockResolvedValue(mockPaginatedResponse);
      const request = useTableRequest(mockDataLoader);

      await request(
        { current: 2, pageSize: 20 },
        {} as Record<string, 'ascend' | 'descend' | null>,
      );

      expect(mockDataLoader).toHaveBeenCalledWith(
        expect.objectContaining({
          pageNo: 2,
          pageSize: 20,
        }),
      );
    });

    it('returns data, total, success, pageSize, current from response', async () => {
      mockDataLoader.mockResolvedValue(mockPaginatedResponse);
      const request = useTableRequest(mockDataLoader);

      const result = await request(
        { current: 1, pageSize: 10 },
        {} as Record<string, 'ascend' | 'descend' | null>,
      );

      expect(result).toEqual({
        data: [{ id: 1, name: 'test' }],
        total: 1,
        success: true,
        pageSize: 10,
        current: 1,
      });
    });

    it('sets success to false when code is not 200', async () => {
      const errorResponse: ResponsePaginationData = {
        ...mockPaginatedResponse,
        code: 500,
        message: 'error',
      };
      mockDataLoader.mockResolvedValue(errorResponse);
      const request = useTableRequest(mockDataLoader);

      const result = await request(
        { current: 1, pageSize: 10 },
        {} as Record<string, 'ascend' | 'descend' | null>,
      );

      expect(result.success).toBe(false);
    });
  });

  describe('sort transformation', () => {
    it('transforms ascend sort to ASC order_by', async () => {
      mockDataLoader.mockResolvedValue(mockPaginatedResponse);
      const request = useTableRequest(mockDataLoader);

      await request(
        { current: 1, pageSize: 10 },
        { name: 'ascend' },
      );

      expect(mockDataLoader).toHaveBeenCalledWith(
        expect.objectContaining({
          order_by: { field: 'name', order: 'ASC' },
        }),
      );
    });

    it('transforms descend sort to DESC order_by', async () => {
      mockDataLoader.mockResolvedValue(mockPaginatedResponse);
      const request = useTableRequest(mockDataLoader);

      await request(
        { current: 1, pageSize: 10 },
        { created: 'descend' },
      );

      expect(mockDataLoader).toHaveBeenCalledWith(
        expect.objectContaining({
          order_by: { field: 'created', order: 'DESC' },
        }),
      );
    });

    it('uses first sort field when multiple sorts provided', async () => {
      mockDataLoader.mockResolvedValue(mockPaginatedResponse);
      const request = useTableRequest(mockDataLoader);

      await request(
        { current: 1, pageSize: 10 },
        { name: 'ascend', created: 'descend' },
      );

      expect(mockDataLoader).toHaveBeenCalledWith(
        expect.objectContaining({
          order_by: expect.objectContaining({ field: 'name' }),
        }),
      );
    });
  });

  describe('default params merge', () => {
    it('merges defaultParams into request params', async () => {
      mockDataLoader.mockResolvedValue(mockPaginatedResponse);
      const request = useTableRequest(mockDataLoader, { status: '1' });

      await request(
        { current: 1, pageSize: 10 },
        {} as Record<string, 'ascend' | 'descend' | null>,
      );

      expect(mockDataLoader).toHaveBeenCalledWith(
        expect.objectContaining({
          status: '1',
          pageNo: 1,
          pageSize: 10,
        }),
      );
    });

    it('calls getParams hook to add custom params', async () => {
      mockDataLoader.mockResolvedValue(mockPaginatedResponse);
      const getParams = vi.fn().mockReturnValue({ customField: 'customValue' });
      const request = useTableRequest(mockDataLoader, undefined, getParams);

      await request(
        { current: 1, pageSize: 10 },
        {} as Record<string, 'ascend' | 'descend' | null>,
      );

      expect(mockDataLoader).toHaveBeenCalledWith(
        expect.objectContaining({
          customField: 'customValue',
        }),
      );
    });

    it('applies custom transform function', async () => {
      mockDataLoader.mockResolvedValue(mockPaginatedResponse);
      const customTransform = vi.fn().mockReturnValue({ custom: 'result' });
      const request = useTableRequest(
        mockDataLoader,
        undefined,
        undefined,
        customTransform,
      );

      const result = await request(
        { current: 1, pageSize: 10 },
        {} as Record<string, 'ascend' | 'descend' | null>,
      );

      expect(customTransform).toHaveBeenCalledWith(mockPaginatedResponse);
      expect(result).toEqual({ custom: 'result' });
    });
  });

  describe('edge cases', () => {
    it('returns undefined data when dataLoader is not provided', async () => {
      const request = useTableRequest(undefined);

      const result = await request(
        { current: 1, pageSize: 10 },
        {} as Record<string, 'ascend' | 'descend' | null>,
      );

      expect(result).toBeUndefined();
    });

    it('preserves current and pageSize in params alongside pageNo', async () => {
      mockDataLoader.mockResolvedValue(mockPaginatedResponse);
      const request = useTableRequest(mockDataLoader);

      await request(
        { current: 3, pageSize: 25 },
        {} as Record<string, 'ascend' | 'descend' | null>,
      );

      expect(mockDataLoader).toHaveBeenCalledWith(
        expect.objectContaining({
          current: 3,
          pageNo: 3,
          pageSize: 25,
        }),
      );
    });
  });
});