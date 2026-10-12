/**
 * 达人（`sys_user` 中带 `daren` 角色者）选择器。
 *
 * ⚠️ 达人候选**没有专用接口**：设计文档 §7.3 期望后端提供
 *    `/travel18/expert/binding/candidate-users`，但契约 §2 的 A1~A10 里没有它，
 *    所以这里用既有 RuoYi 接口两步拼：`/system/role/list` 找 role_key='daren' 的 roleId
 *    → `/system/role/authUser/allocatedList`（见 `services/expert/referenceData.ts`）。
 *    后端补出候选接口后应改用它。
 *
 * ⚠️ **找不到 daren 角色时不能静默返回空**：那会让 admin 以为「系统里没有达人」。
 *    此时降级为「全部用户」，并通过 `notFoundContent` / 可选 Alert 明确说出原因
 *    （多半是 `sql/202610121300_expert_menu_dict_role.sql` 还没执行）。
 */

import { useQuery } from '@tanstack/react-query';
import { Alert, Select, Spin } from 'antd';
import type { SelectProps } from 'antd';
import React from 'react';
import { DAREN_ROLE_KEY, listDarenUsers } from '@/services/expert';

type DarenUserSelectProps = Omit<SelectProps, 'options' | 'loading'> & {
  /** 角色缺失时是否在上方显示 Alert（表单里用 true，搜索栏里用 false 免得撑坏布局） */
  showRoleWarning?: boolean;
};

export const DarenUserSelect: React.FC<DarenUserSelectProps> = ({
  showRoleWarning = false,
  ...selectProps
}) => {
  const { data, isFetching, error } = useQuery({
    queryKey: ['daren-user-options'],
    queryFn: () => listDarenUsers(undefined, 200),
    staleTime: 60 * 1000,
  });

  const users = data?.users ?? [];
  const roleMissing = data ? !data.darenRoleFound : false;

  const warningText = `未找到角色 role_key='${DAREN_ROLE_KEY}'（达人角色 SQL 可能尚未执行），当前列出全部正常状态用户，请自行确认对方是达人。`;

  const notFoundContent = error ? (
    '加载失败'
  ) : isFetching ? (
    <Spin size="small" />
  ) : roleMissing ? (
    warningText
  ) : (
    '暂无达人用户'
  );

  return (
    <>
      {showRoleWarning && roleMissing ? (
        <Alert type="warning" showIcon message={warningText} style={{ marginBottom: 8 }} />
      ) : null}
      <Select
        {...selectProps}
        loading={isFetching}
        showSearch
        allowClear
        optionFilterProp="label"
        placeholder={selectProps.placeholder || '请选择达人'}
        notFoundContent={notFoundContent}
        options={users.map((u) => ({
          value: u.userId,
          label: u.nickName ? `${u.nickName}（${u.userName}）` : u.userName,
        }))}
      />
    </>
  );
};

export default DarenUserSelect;
