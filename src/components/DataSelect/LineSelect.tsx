import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'ahooks';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import React, { useMemo, useState } from 'react';
import { get as getLineApi } from '@/services/api/线路管理/线路管理';

const lineApi = getLineApi();

/**
 * 线路选择组件
 */
export const LineSelect: React.FC<SelectProps> = (selectProps) => {
  const [keyword, setKeyword] = useState<string>();
  const debouncedKeyword = useDebounce(keyword, { wait: 800 });

  const { data, isLoading, error } = useQuery({
    queryKey: ['lines', debouncedKeyword],
    queryFn: () =>
      lineApi.list3({
        line: { lineName: debouncedKeyword || '' },
        pageNo: 1,
        pageSize: 200,
      } as TODO),
    staleTime: 5 * 1000,
  });

  const options = useMemo(() => {
    const rows = (data as TODO)?.rows || [];
    return rows.map((line: TODO) => ({
      value: line.lineId,
      label: line.lineName,
    }));
  }, [data]);

  return (
    <Select
      {...selectProps}
      loading={isLoading}
      options={options}
      placeholder={selectProps.placeholder || '请选择线路'}
      showSearch
      filterOption={false}
      notFoundContent={error ? '加载失败' : '暂无数据'}
      onSearch={setKeyword}
      allowClear
      onClear={() => setKeyword(undefined)}
    />
  );
};

export default LineSelect;
