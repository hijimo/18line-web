/**
 * 达人路线管理（列表 + 新增/编辑）。
 *
 * 对应后端菜单 2210（`travel18:expertRoute:*`）。为什么是**新建独立页**而不是给
 * `pages/Routes` 加字段：设计文档 §7.1 的方案 A —— 商家线路页只有 144 行、
 * 根本没有景点编排能力，而达人路线的字段集（intro/days/分天景点+讲解/审核态/推荐权重）
 * 与商家线路差异太大，塞进同一个 Drawer 会有一堆 `lineType==='1' &&` 条件渲染。
 * `pages/Routes/index.tsx` 本次**一行未动**。
 *
 * 数据隔离：daren 角色只能看到 `author_user_id = 自己` 的行，由后端 `@AuthorDataScope`
 * 强制（非 admin 非 daren → `AND 1=0`）。前端**不**传 authorUserId 来"帮"后端过滤。
 *
 * ⚠️ 本页**没有导出按钮**：契约 §2 的 A1 没有 export 接口（只有 A4 鼓励订单、A7 对账单有）。
 *    不凭空造一个前端拼 CSV 的导出 —— 那会绕过 @AuthorDataScope，达人就能导出别人的路线。
 */

import { PlusOutlined } from '@ant-design/icons';
import { Button, message, Popconfirm, Space, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import CommonTable from '@/components/CommonTable';
import DarenUserSelect from '@/components/DataSelect/DarenUserSelect';
import ExpertAuditModal from '@/components/ExpertAuditModal';
import RegionSelect from '@/components/RegionSelect';
import { useExpertPermission } from '@/hooks/usePermission';
import { formatRegionName, useRegionNameMap } from '@/hooks/useRegionNameMap';
import { useTableRequest } from '@/hooks/useTableRequest';
import { DATE_FORMAT_FULL_TIME } from '@/variables';
import { key, option } from '@/configurify/columns/baseColumns';
import {
  ExpertAuditStatusColor,
  ExpertAuditStatusLabel,
  ExpertRewardEnabledLabel,
  StatusLabel,
} from '@/enums';
import { EXPERT_AUDIT_STATUS_OPTIONS } from '@/enums/expert';
import { listExpertRoute, removeExpertRoute } from '@/services/expert';
import type { ExpertRoute } from '@/types/expert';
import ExpertRouteEditDrawer from './ExpertRouteEditDrawer';

const STATUS_OPTIONS = Object.entries(StatusLabel).map(([value, label]) => ({ label, value }));

const fmtTime = (v?: string | null) => (v ? dayjs(v).format(DATE_FORMAT_FULL_TIME) : '--');

const ExpertRoutePage: React.FC = () => {
  const actionRef = useRef<{ reload: () => void } | null>(null);
  const perm = useExpertPermission();
  const regionMap = useRegionNameMap();

  const [editOpen, setEditOpen] = useState(false);
  const [editRouteId, setEditRouteId] = useState<number | null>(null);
  const [auditTarget, setAuditTarget] = useState<ExpertRoute | null>(null);

  /**
   * 列表请求。
   * 「城市」筛选用的是既有 `RegionSelect`（省/市/区三级对象），
   * 契约 A1 list query 只认 `city` 一个 6 位编码，这里做翻译并把 region 从 query 里摘掉。
   */
  const request = useTableRequest(
    listExpertRoute as (params: Record<string, unknown>) => Promise<{
      code: number;
      msg: string;
      total: number;
      rows: unknown[];
    }>,
    undefined,
    (params) => {
      const region = params.region as { city?: string } | undefined;
      return {
        region: undefined,
        city: region?.city || undefined,
      };
    },
  );

  const openEdit = (routeId: number | null) => {
    setEditRouteId(routeId);
    setEditOpen(true);
  };

  const handleDelete = async (record: ExpertRoute) => {
    try {
      await removeExpertRoute(record.routeId);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示（后端 AuthorGuard 会以「无权操作该路线」拒绝越权删除）
    }
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
      width: 200,
      ellipsis: true,
      search: false,
      // 后端只下发 6 位编码（selectRouteList 没有 regionName 列），
      // 直接渲染就是设计文档 §2.8 的既有缺陷 B6，这里在前端解析成名称
      render: (_: unknown, r: ExpertRoute) => formatRegionName(regionMap, r),
    },
    {
      title: '城市',
      dataIndex: 'region',
      hideInTable: true,
      renderFormItem: () => <RegionSelect />,
    },
    { title: '天数', dataIndex: 'dayCount', width: 70, search: false },
    { title: '景点数', dataIndex: 'attractionCount', width: 80, search: false },
    {
      title: '审核状态',
      dataIndex: 'auditStatus',
      width: 110,
      valueType: 'select',
      fieldProps: { options: EXPERT_AUDIT_STATUS_OPTIONS },
      render: (_: unknown, r: ExpertRoute) => {
        const label =
          ExpertAuditStatusLabel[r.auditStatus as keyof typeof ExpertAuditStatusLabel] ??
          r.auditStatus ??
          '--';
        const tag = (
          <Tag color={ExpertAuditStatusColor[r.auditStatus ?? ''] ?? 'default'}>{label}</Tag>
        );
        // 拒绝原因必须一眼可见：达人不知道被拒理由就没法改，只会反复提交
        return r.auditRemark ? <Tooltip title={`审核意见：${r.auditRemark}`}>{tag}</Tooltip> : tag;
      },
    },
    {
      title: '上架状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      fieldProps: { options: STATUS_OPTIONS },
      valueEnum: undefined,
      render: (_: unknown, r: ExpertRoute) =>
        StatusLabel[r.status as keyof typeof StatusLabel] ?? r.status ?? '--',
    },
    {
      title: '鼓励开关',
      dataIndex: 'rewardEnabled',
      width: 100,
      search: false,
      render: (_: unknown, r: ExpertRoute) =>
        r.rewardEnabled === '1' ? (
          <Tag color="gold">
            {ExpertRewardEnabledLabel[r.rewardEnabled as keyof typeof ExpertRewardEnabledLabel]}
          </Tag>
        ) : (
          <Tag>
            {ExpertRewardEnabledLabel[r.rewardEnabled as keyof typeof ExpertRewardEnabledLabel] ??
              '--'}
          </Tag>
        ),
    },
    { title: '推荐权重', dataIndex: 'recommendWeight', width: 100, search: false },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 170,
      search: false,
      render: (_: unknown, r: ExpertRoute) => fmtTime(r.createTime),
    },
    {
      ...option,
      width: 200,
      render: (_: unknown, record: ExpertRoute) => (
        <Space>
          {perm.canEditRoute ? <a onClick={() => openEdit(record.routeId)}>编辑</a> : null}
          {/* 达人看不到「审核」：既没有 travel18:expertRouteAudit:audit 权限串，
              又在 useExpertPermission 里叠了 isDaren 判定（前端 gate + 后端 @PreAuthorize 双保险） */}
          {perm.canAuditRoute ? <a onClick={() => setAuditTarget(record)}>审核</a> : null}
          {perm.canRemoveRoute ? (
            <Popconfirm title="确定删除该达人路线吗？" onConfirm={() => handleDelete(record)}>
              <a>删除</a>
            </Popconfirm>
          ) : null}
        </Space>
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
        toolBarRender={() => [
          perm.canEditRoute ? (
            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => openEdit(null)}>
              新增达人路线
            </Button>
          ) : null,
        ]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        columnsState={{ persistenceKey: 'expert-route', persistenceType: 'localStorage' }}
      />

      <ExpertRouteEditDrawer
        open={editOpen}
        routeId={editRouteId}
        onClose={() => setEditOpen(false)}
        onSaved={() => actionRef.current?.reload()}
      />

      <ExpertAuditModal
        route={auditTarget}
        onClose={() => setAuditTarget(null)}
        onAudited={() => actionRef.current?.reload()}
      />
    </>
  );
};

export default ExpertRoutePage;
