/**
 * 可绑定的入驻商家选择器。
 *
 * ⚠️ 默认只列 `audit_status='1' && status='0'` 的商户：下单闸门 G5 要求商户「已入驻审核通过
 *    且未停用」，否则绑了也是白绑 —— 用户下单会被拒「商户未通过入驻审核 / 商户已停用」，
 *    表现为"绑定成功但一分钱收不到"，比绑不上更难查。
 *
 * 抽成公共组件是因为两个页面要用：`pages/MerchantExpert`（新建绑定）与
 * `pages/ExpertIncome`（按商家筛选对账单）。两处若各写一份，筛选口径迟早漂移。
 */

import { useQuery } from '@tanstack/react-query';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import React from 'react';
import { listBindableMerchants } from '@/services/expert';

type BindableMerchantSelectProps = Omit<SelectProps, 'options' | 'loading'> & {
  /** true = 不按 G5 条件筛，列出全部商户（仅用于历史数据回显/筛选，不用于新建绑定） */
  includeUnavailable?: boolean;
};

export const BindableMerchantSelect: React.FC<BindableMerchantSelectProps> = ({
  includeUnavailable = false,
  ...selectProps
}) => {
  const { data, isFetching } = useQuery({
    queryKey: ['merchant-options', includeUnavailable],
    // 筛选交给后端（onlyAvailable=false 时才拿得到已停用/未过审商户），
    // 不在前端二次过滤：前端过滤会让"后端返回了但页面不显示"这种问题无从排查
    queryFn: () => listBindableMerchants(undefined, 200, !includeUnavailable),
    staleTime: 60 * 1000,
  });

  const merchants = data ?? [];

  return (
    <Select
      {...selectProps}
      loading={isFetching}
      showSearch
      allowClear
      optionFilterProp="label"
      placeholder={selectProps.placeholder || '请选择入驻商家'}
      notFoundContent={isFetching ? '加载中…' : '没有可用商户（需 audit_status=1 且 status=0）'}
      options={merchants.map((m) => ({ value: m.merchantId, label: m.merchantName }))}
      style={{ width: '100%' }}
    />
  );
};

export default BindableMerchantSelect;
