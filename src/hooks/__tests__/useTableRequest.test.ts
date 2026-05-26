import { renderHook } from '@testing-library/react';
import type { ResponsePaginationData } from '@/types';
import { useTableRequest } from '../useTableRequest';

describe('useTableRequest', () => {
  const mockDataLoader = vi.fn();
  const mockPaginatedResponse: ResponsePaginationData = {
    code: 200,
    msg: 'success',
    total: 1,
    rows: [{ id: 1, name: 'test' }],
  };

  beforeEach(() => {
    mockDataLoader.mockReset();
  });

  describe('pagination transformation', () => {
    it('transforms current/pageSize to pageNo/pageSize params', async () => {
      mockDataLoader.mockResolvedValue(mockPaginatedResponse);
      const { result } = renderHook(() => useTableRequest(mockDataLoader));

      await result.current(
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
      const { result: hookResult } = renderHook(() => useTableRequest(mockDataLoader));

      const result = await hookResult.current(
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
        msg: 'error',
      };
      mockDataLoader.mockResolvedValue(errorResponse);
      const { result: hookResult } = renderHook(() => useTableRequest(mockDataLoader));

      const result = await hookResult.current(
        { current: 1, pageSize: 10 },
        {} as Record<string, 'ascend' | 'descend' | null>,
      );

      expect((result as { success: boolean }).success).toBe(false);
    });
  });

  describe('sort transformation', () => {
    it('transforms ascend sort to ASC order_by', async () => {
      mockDataLoader.mockResolvedValue(mockPaginatedResponse);
      const { result } = renderHook(() => useTableRequest(mockDataLoader));

      await result.current({ current: 1, pageSize: 10 }, { name: 'ascend' });

      expect(mockDataLoader).toHaveBeenCalledWith(
        expect.objectContaining({
          order_by: { field: 'name', order: 'ASC' },
        }),
      );
    });

    it('transforms descend sort to DESC order_by', async () => {
      mockDataLoader.mockResolvedValue(mockPaginatedResponse);
      const { result } = renderHook(() => useTableRequest(mockDataLoader));

      await result.current({ current: 1, pageSize: 10 }, { created: 'descend' });

      expect(mockDataLoader).toHaveBeenCalledWith(
        expect.objectContaining({
          order_by: { field: 'created', order: 'DESC' },
        }),
      );
    });

    it('uses first sort field when multiple sorts provided', async () => {
      mockDataLoader.mockResolvedValue(mockPaginatedResponse);
      const { result } = renderHook(() => useTableRequest(mockDataLoader));

      await result.current({ current: 1, pageSize: 10 }, { name: 'ascend', created: 'descend' });

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
      const { result } = renderHook(() => useTableRequest(mockDataLoader, { status: '1' }));

      await result.current(
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
      const { result } = renderHook(() => useTableRequest(mockDataLoader, undefined, getParams));

      await result.current(
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
      const { result: hookResult } = renderHook(() =>
        useTableRequest(mockDataLoader, undefined, undefined, customTransform),
      );

      const result = await hookResult.current(
        { current: 1, pageSize: 10 },
        {} as Record<string, 'ascend' | 'descend' | null>,
      );

      expect(customTransform).toHaveBeenCalledWith(mockPaginatedResponse);
      expect(result).toEqual({ custom: 'result' });
    });
  });

  describe('edge cases', () => {
    it('returns undefined data when dataLoader is not provided', async () => {
      const { result: hookResult } = renderHook(() => useTableRequest(undefined));

      const result = await hookResult.current(
        { current: 1, pageSize: 10 },
        {} as Record<string, 'ascend' | 'descend' | null>,
      );

      expect(result).toBeUndefined();
    });

    it('preserves current and pageSize in params alongside pageNo', async () => {
      mockDataLoader.mockResolvedValue(mockPaginatedResponse);
      const { result } = renderHook(() => useTableRequest(mockDataLoader));

      await result.current(
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
