import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import { get as getPhotographyApi } from '@/services/api/跟拍管理/跟拍管理';

const api = getPhotographyApi();

export const PhotographySelect: React.FC<SelectProps> = (props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['photography-select'],
    queryFn: () => api.list1({ pageNum: 1, pageSize: 500 } as any),
    staleTime: 30 * 1000,
  });
  const options = useMemo(() => ((data as any)?.rows || []).map((r: any) => ({ value: r.photographyId, label: r.nickname })), [data]);
  return <Select {...props} loading={isLoading} options={options} placeholder={props.placeholder || '请选择跟拍'} allowClear showSearch filterOption={(input, opt) => (opt?.label as string)?.includes(input)} />;
};

export default PhotographySelect;
