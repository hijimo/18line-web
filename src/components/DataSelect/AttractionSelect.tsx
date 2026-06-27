/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { useDebounceFn } from 'ahooks';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import React, { useMemo, useState } from 'react';
import { get as getAttractionApi } from '@/services/api/景点管理/景点管理';

const api = getAttractionApi();

export const AttractionSelect: React.FC<SelectProps> = (props) => {
  const [keyword, setKeyword] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['attractions-select', keyword],
    queryFn: () => api.list8({ pageNum: 1, pageSize: 50, attractionName: keyword } as any),
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
        value: String(r.attractionId),
        label: r.attractionName,
      })),
    [data],
  );

  return (
    <Select
      {...props}
      loading={isLoading}
      options={options}
      placeholder={props.placeholder || '请选择景点'}
      allowClear
      showSearch
      filterOption={false}
      onSearch={handleSearch}
    />
  );
};

export default AttractionSelect;
