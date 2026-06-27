/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { useDebounceFn } from 'ahooks';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import React, { useMemo, useState } from 'react';
import { get as getCarApi } from '@/services/api/包车管理/包车管理';

const api = getCarApi();

export const CarSelect: React.FC<SelectProps> = (props) => {
  const [keyword, setKeyword] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['car-select', keyword],
    queryFn: () => api.list7({ pageNum: 1, pageSize: 50, nickname: keyword } as any),
    staleTime: 30 * 1000,
  });

  const { run: handleSearch } = useDebounceFn(
    (value: string) => {
      setKeyword(value);
    },
    { wait: 300 },
  );

  const options = useMemo(
    () => ((data as any)?.rows || []).map((r: any) => ({ value: r.carId, label: r.nickname })),
    [data],
  );

  return (
    <Select
      {...props}
      loading={isLoading}
      options={options}
      placeholder={props.placeholder || '请选择包车'}
      allowClear
      showSearch
      filterOption={false}
      onSearch={handleSearch}
    />
  );
};

export default CarSelect;
