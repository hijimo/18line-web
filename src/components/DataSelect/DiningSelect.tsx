/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { useDebounceFn } from 'ahooks';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import React, { useMemo, useState } from 'react';
import { get as getDiningApi } from '@/services/api/餐饮管理/餐饮管理';

const api = getDiningApi();

export const DiningSelect: React.FC<SelectProps> = (props) => {
  const [keyword, setKeyword] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['dining-select', keyword],
    queryFn: () => api.list5({ pageNum: 1, pageSize: 50, diningName: keyword } as any),
    staleTime: 30 * 1000,
  });

  const { run: handleSearch } = useDebounceFn(
    (value: string) => {
      setKeyword(value);
    },
    { wait: 300 },
  );

  const options = useMemo(
    () => ((data as any)?.rows || []).map((r: any) => ({ value: r.diningId, label: r.diningName })),
    [data],
  );

  return (
    <Select
      {...props}
      loading={isLoading}
      options={options}
      placeholder={props.placeholder || '请选择餐饮'}
      allowClear
      showSearch
      filterOption={false}
      onSearch={handleSearch}
    />
  );
};

export default DiningSelect;
