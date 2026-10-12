/**
 * 达人路线审核页（menu 2230，权限串 `travel18:expertRouteAudit:list|query|audit`）。
 *
 * ## 为什么是独立页，而不是只做 ExpertRoute 里的一个抽屉
 * 1. **可见性天然是两套**：审核菜单/权限**不授予 daren 角色**（`sql/202610121300` 第 5 节
 *    明确不授 2230~2232），而达人路线页是达人自己天天用的。做成独立路由后，
 *    `router.tsx` 里可以直接 `RequireAdmin` + 从菜单资源里排除，
 *    不必在同一个页面里对每一列做角色分支。
 * 2. **列表诉求不同**：审核要「默认只看待审、一眼看到提交时间与上次拒绝意见」，
 *    与运营维护路线的排序/筛选口径不一样；混在一张表里会互相牵制。
 * 3. 同时**保留** `pages/ExpertRoute` 行内的「审核」入口（admin 才可见），
 *    两处共用 `components/ExpertAuditModal`，所以不存在"两套审核逻辑"的维护成本。
 *
 * ⚠️ 审核是资金动作：audit_status='1' 是下单闸门 G2 的必要条件（见 Modal 内文案）。
 */

import { Space, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import CommonTable from '@/components/CommonTable';
import DarenUserSelect from '@/components/DataSelect/DarenUserSelect';
import ExpertAuditModal from '@/components/ExpertAuditModal';
import { useExpertPermission } from '@/hooks/usePermission';
import { formatRegionName, useRegionNameMap } from '@/hooks/useRegionNameMap';
import { useTableRequest } from '@/hooks/useTableRequest';
import { DATE_FORMAT_FULL_TIME } from '@/variables';
import { key, option } from '@/configurify/columns/baseColumns';
import { ExpertAuditStatusColor, ExpertAuditStatusLabel } from '@/enums';
import { EXPERT_AUDIT_STATUS_OPTIONS } from '@/enums/expert';
import { listExpertRoute } from '@/services/expert';
import type { ExpertRoute } from '@/types/expert';

const fmtTime = (v?: string | null) => (v ? dayjs(v).format(DATE_FORMAT_FULL_TIME) : '--');

const ExpertRouteAuditPage: React.FC = () => {
  const actionRef = useRef<{ reload: () => void } | null>(null);
  const perm = useExpertPermission();
  const regionMap = useRegionNameMap();

  const [target, setTarget] = useState<ExpertRoute | null>(null);
  const [decision, setDecision] = useState<'1' | '2'>('1');

  const request = useTableRequest(
    listExpertRoute as (params: Record<string, unknown>) => Promise<{
      code: number;
      msg: string;
      total: number;
      rows: unknown[];
    }>,
  );

  const openAudit = (record: ExpertRoute, next: '1' | '2') => {
    setDecision(next);
    setTarget(record);
  };

  const columns = [
    key,
    { title: '路线ID', dataIndex: 'routeId', width: 90, search: false },
    { title: '标题', dataIndex: 'routeTitle', width: 220, ellipsis: true },
    { title: '达人昵称', dataIndex: 'authorNickname', width: 130, ellipsis: true, search: false },
    {
      title: '达人',
      dataIndex: 'authorUserId',
      hideInTable: true,
      renderFormItem: () => <DarenUserSelect placeholder="按达人筛选" />,
    },
    {
      title: '地区',
      dataIndex: 'regionName',
      width: 180,
      ellipsis: true,
      search: false,
      render: (_: unknown, r: ExpertRoute) => formatRegionName(regionMap, r),
    },
    { title: '天数', dataIndex: 'dayCount', width: 70, search: false },
    { title: '景点数', dataIndex: 'attractionCount', width: 80, search: false },
    {
      title: '审核状态',
      dataIndex: 'auditStatus',
      width: 110,
      valueType: 'select',
      // 审核页默认只看「待审核」；这是 initialValue（用户可改），不是写死的 defaultParams（改不动）
      initialValue: '0',
      fieldProps: { options: EXPERT_AUDIT_STATUS_OPTIONS },
      render: (_: unknown, r: ExpertRoute) => (
        <Tag color={ExpertAuditStatusColor[r.auditStatus ?? ''] ?? 'default'}>
          {ExpertAuditStatusLabel[r.auditStatus as keyof typeof ExpertAuditStatusLabel] ??
            r.auditStatus ??
            '--'}
        </Tag>
      ),
    },
    {
      title: '上次审核意见',
      dataIndex: 'auditRemark',
      width: 200,
      ellipsis: true,
      search: false,
      render: (_: unknown, r: ExpertRoute) =>
        r.auditRemark ? (
          <Tooltip title={r.auditRemark}>
            <Typography.Text type="secondary">{r.auditRemark}</Typography.Text>
          </Tooltip>
        ) : (
          '--'
        ),
    },
    {
      title: '提交时间',
      dataIndex: 'createTime',
      width: 170,
      search: false,
      render: (_: unknown, r: ExpertRoute) => fmtTime(r.updateTime ?? r.createTime),
    },
    {
      ...option,
      width: 140,
      render: (_: unknown, record: ExpertRoute) =>
        perm.canAuditRoute ? (
          <Space>
            <a onClick={() => openAudit(record, '1')}>通过</a>
            <a onClick={() => openAudit(record, '2')}>拒绝</a>
          </Space>
        ) : (
          <Typography.Text type="secondary">无审核权限</Typography.Text>
        ),
    },
  ];

  return (
    <>
      <CommonTable
        actionRef={actionRef}
        rowKey="routeId"
        request={request as never}
        columns={columns as never}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        columnsState={{ persistenceKey: 'expert-route-audit', persistenceType: 'localStorage' }}
      />
      <ExpertAuditModal
        route={target}
        initialDecision={decision}
        onClose={() => setTarget(null)}
        onAudited={() => actionRef.current?.reload()}
      />
    </>
  );
};

export default ExpertRouteAuditPage;
