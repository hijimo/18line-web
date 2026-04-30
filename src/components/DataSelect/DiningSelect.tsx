import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import { get as getDiningApi } from '@/services/api/餐饮管理/餐饮管理';

const api = getDiningApi();

export const DiningSelect: React.FC<SelectProps> = (props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['dining-select'],
    queryFn: () => api.list4({ pageNum: 1, pageSize: 500 } as any),
    staleTime: 30 * 1000,
  });
  const options = useMemo(() => ((data as any)?.rows || []).map((r: any) => ({ value: r.diningId, label: r.diningName })), [data]);
  return <Select {...props} loading={isLoading} options={options} placeholder={props.placeholder || '请选择餐饮'} allowClear showSearch filterOption={(input, opt) => (opt?.label as string)?.includes(input)} />;
};

export default DiningSelect;
