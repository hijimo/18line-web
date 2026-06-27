/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { useDebounceFn } from 'ahooks';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import React, { useMemo, useState } from 'react';
import { get as getPhotographyApi } from '@/services/api/跟拍管理/跟拍管理';

const api = getPhotographyApi();

export const PhotographySelect: React.FC<SelectProps> = (props) => {
  const [keyword, setKeyword] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['photography-select', keyword],
    queryFn: () => api.list1({ pageNum: 1, pageSize: 50, nickname: keyword } as any),
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
      ((data as any)?.rows || []).map((r: any) => ({ value: r.photographyId, label: r.nickname })),
    [data],
  );

  return (
    <Select
      {...props}
      loading={isLoading}
      options={options}
      placeholder={props.placeholder || '请选择跟拍'}
      allowClear
      showSearch
      filterOption={false}
      onSearch={handleSearch}
    />
  );
};

export default PhotographySelect;
