import React, { useMemo } from 'react';
import RegionSelect from '@/components/RegionSelect';

type RegionCodeSelectProps = {
  value?: string;
  onChange?: (value: string | undefined) => void;
};

type RegionValue = {
  province?: string;
  city?: string;
  district?: string;
};

/**
 * 将单个行政区划编码解析为省/市/县三级值
 * 330000 → 省级；331100 → 市级；331124 → 县级
 */
export const parseRegionCode = (regionCode?: string): RegionValue => {
  if (!regionCode || regionCode.length < 6) return {};
  const province = `${regionCode.substring(0, 2)}0000`;
  if (regionCode.endsWith('0000')) {
    return { province };
  }
  const city = `${regionCode.substring(0, 4)}00`;
  if (regionCode.endsWith('00')) {
    return { province, city };
  }
  return { province, city, district: regionCode };
};

/**
 * 行政区划编码选择器
 * 内部复用 RegionSelect 三级联动，对外只暴露最末级非空编码（省 > 市 > 县取最深一级）
 */
const RegionCodeSelect: React.FC<RegionCodeSelectProps> = ({ value, onChange }) => {
  const regionValue = useMemo(() => parseRegionCode(value), [value]);

  const handleChange = (region: RegionValue) => {
    onChange?.(region.district ?? region.city ?? region.province);
  };

  return <RegionSelect value={regionValue} onChange={handleChange} />;
};

export default RegionCodeSelect;
