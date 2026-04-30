import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import { get as getAttractionApi } from '@/services/api/景点管理/景点管理';

const api = getAttractionApi();

export const AttractionSelect: React.FC<SelectProps> = (props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['attractions-select'],
    queryFn: () => api.list7({ pageNum: 1, pageSize: 500 } as any),
    staleTime: 30 * 1000,
  });
  const options = useMemo(() => ((data as any)?.rows || []).map((r: any) => ({ value: String(r.attractionId), label: r.attractionName })), [data]);
  return <Select {...props} loading={isLoading} options={options} placeholder={props.placeholder || '请选择景点'} allowClear showSearch filterOption={(input, opt) => (opt?.label as string)?.includes(input)} />;
};

export default AttractionSelect;
