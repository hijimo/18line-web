import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import { get as getAccommodationApi } from '@/services/api/住宿管理/住宿管理';

const api = getAccommodationApi();

export const AccommodationSelect: React.FC<SelectProps> = (props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['accommodation-select'],
    queryFn: () => api.list8({ pageNum: 1, pageSize: 500 } as any),
    staleTime: 30 * 1000,
  });
  const options = useMemo(() => ((data as any)?.rows || []).map((r: any) => ({ value: r.accommodationId, label: r.accommodationName })), [data]);
  return <Select {...props} loading={isLoading} options={options} placeholder={props.placeholder || '请选择住宿'} allowClear showSearch filterOption={(input, opt) => (opt?.label as string)?.includes(input)} />;
};

export default AccommodationSelect;
