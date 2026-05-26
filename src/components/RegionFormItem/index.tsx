import { Form } from 'antd';
import React from 'react';
import RegionSelect from '@/components/RegionSelect';

type RegionFormItemProps = {
  label?: string;
  required?: boolean;
};

const RegionFormItem: React.FC<RegionFormItemProps> = ({ label = '地区', required = false }) => (
  <Form.Item
    name="region"
    label={label}
    rules={required ? [{ required: true, message: `请选择${label}` }] : undefined}
  >
    <RegionSelect />
  </Form.Item>
);

export default RegionFormItem;
