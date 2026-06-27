/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { useDebounceFn } from 'ahooks';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import React, { useMemo, useState } from 'react';
import { get as getAccommodationApi } from '@/services/api/住宿管理/住宿管理';

const api = getAccommodationApi();

export const AccommodationSelect: React.FC<SelectProps> = (props) => {
  const [keyword, setKeyword] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['accommodation-select', keyword],
    queryFn: () => api.list9({ pageNum: 1, pageSize: 50, accommodationName: keyword } as any),
    staleTime: 30 * 1000,
  });

  const { run: handleSearch } = useDebounceFn(
    (value: string) => {
      setKeyword(value);
    },
    { wait: 300 },
  );

  const options = useMemo(
    () =>
      ((data as any)?.rows || []).map((r: any) => ({
        value: r.accommodationId,
        label: r.accommodationName,
      })),
    [data],
  );

  return (
    <Select
      {...props}
      loading={isLoading}
      options={options}
      placeholder={props.placeholder || '请选择住宿'}
      allowClear
      showSearch
      filterOption={false}
      onSearch={handleSearch}
    />
  );
};

export default AccommodationSelect;
