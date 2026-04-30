import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import { get as getCarApi } from '@/services/api/包车管理/包车管理';

const api = getCarApi();

export const CarSelect: React.FC<SelectProps> = (props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['car-select'],
    queryFn: () => api.list6({ pageNum: 1, pageSize: 500 } as any),
    staleTime: 30 * 1000,
  });
  const options = useMemo(() => ((data as any)?.rows || []).map((r: any) => ({ value: r.carId, label: r.nickname })), [data]);
  return <Select {...props} loading={isLoading} options={options} placeholder={props.placeholder || '请选择包车'} allowClear showSearch filterOption={(input, opt) => (opt?.label as string)?.includes(input)} />;
};

export default CarSelect;
