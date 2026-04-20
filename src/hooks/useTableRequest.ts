import _first from 'lodash-es/first';
import _upperCase from 'lodash-es/upperCase';
import { useCallback } from 'react';
import type { ResponsePaginationData } from '@/types';

const transformDataToProTable = (result: ResponsePaginationData) => {
  return {
    data: (result as ResponsePaginationData).data.data,
    total: (result as ResponsePaginationData)?.data.totalCount,
    success: result?.code === 200,
    pageSize: result?.data.pageSize,
    current: result?.data.pageNo,
  };
};

const transformOrderBy = (orders: Record<string, 'ascend' | 'descend' | null>) => {
  return _first(
    Object.keys(orders).map((key) => ({
      field: key,
      order: _upperCase(orders[key]?.replace('end', '') || ''),
    })),
  );
};

export type DataLoaderParams = Record<string, unknown>;
export const useTableRequest = (
  dataLoader?: (params: DataLoaderParams) => Promise<ResponsePaginationData>,
  defaultParams?: Record<string, unknown>,
  getParams?: (params: Record<string, unknown>) => Record<string, unknown>,
  transform?: (result: ResponsePaginationData) => unknown,
) => {
  const request = useCallback(
    async (
      params: Record<string, unknown>,
      sort: Record<string, 'ascend' | 'descend' | null>,
      // filter: Record<string, unknown>,
    ) => {
      const newParams = {
        ...params,
        // current: undefined,
        order_by: transformOrderBy(sort),
        pageNo: params.current as number,
        pageSize: params.pageSize as number,
        ...defaultParams, // 合并默认参数
        ...getParams?.(params),
      };
      const result = await dataLoader?.(newParams);
      const transformedResult =
        transform?.(result as ResponsePaginationData) ||
        transformDataToProTable(result as ResponsePaginationData);
      return Promise.resolve(transformedResult);
    },
    [dataLoader, defaultParams, getParams, transform],
  );
  return request;
};
