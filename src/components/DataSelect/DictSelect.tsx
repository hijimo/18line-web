import React, { useMemo } from 'react';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import { useDictData } from '@/hooks/useDictMap';

interface DictSelectProps extends SelectProps {
  /** 字典类型编码 */
  code: string;
}

/**
 * 数据字典下拉组件
 * 根据字典类型编码动态获取选项列表
 */
export const DictSelect: React.FC<DictSelectProps> = ({ code, ...selectProps }) => {
  const { data, isLoading } = useDictData(code);

  const options = useMemo(() => {
    const list = (data as any)?.data || [];
    return list.map((item: any) => ({
      value: item.dictValue,
      label: item.dictLabel,
    }));
  }, [data]);

  return (
    <Select
      {...selectProps}
      loading={isLoading}
      options={options}
      placeholder={selectProps.placeholder || '请选择'}
      allowClear
    />
  );
};

export default DictSelect;
