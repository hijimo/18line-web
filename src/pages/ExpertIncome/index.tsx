/**
 * 达人收入对账页（menu 2260，`travel18:expertPayable:list|query|export`）。
 *
 * ## 三条口径红线（都来自设计文档 §8.2~§8.5，前端只负责"别把它显示错"）
 * 1. **安卓 / iOS 必须分开展示**：iOS 的钱要自然月结束后 45~60 天才到平台账，安卓 T+3。
 *    合并成一个总数会让达人在 iOS 部分未到账时认为平台少结算 —— 所以汇总卡片是
 *    **每个 terminal_group 一张**，不做合计。
 * 2. **作废/退款单列**：退款会把 payable 置 `pay_status='3'` 并写 `void_reason`。
 *    达人看到"收入减少"时，这一列是唯一能自解释的东西，不能混进应付金额里。
 * 3. 🔴 **账期口径是 `payable.create_time`（记账时间），不是 `order.paid_time`**。
 *    这是**刻意偏离**设计文档 §8.2 的 `o.paid_time`，以后端为准（取证 2026-10-12，
 *    `travel18-core/src/main/resources/mapper/travel18/TravelExpertRewardMapper.xml`）：
 *      - `incomeWhere`：`AND p.create_time >= #{beginTime}` / `AND p.create_time <= #{endTime}`；
 *      - `selectIncomeDetail`：`order by p.create_time desc, p.payable_id desc`；
 *      - 该文件红线 3 注释说明：真正决定钱怎么走的结算批次 `claimForBatch` /
 *        `sumPendingForBatch` 都按 `payable.create_time` 归集，收入页必须与批次**同口径**，
 *        否则「达人收入页某月合计 ≠ 该月批次金额」，跨月支付的单两边各算一次。
 *    `o.paid_time` 后端仍然 SELECT 出来放进 VO（`paidTime`），目的是让差异**可见可解释**，
 *    但不参与过滤与排序 —— 所以本页筛选 label 是「记账时间（账期）」，表格另有一列「支付时间」。
 *    ⚠️ 别和 A4 达人鼓励订单页搞混：**A4 的账期口径是 `t.paid_time`**（订单视角，用户何时付钱），
 *       A7/A10 是结算视角（这笔应付何时记账）。两页口径不同是有意为之，不是 bug。
 *
 * ## 达人「只看自己」靠后端
 * `author_user_id` 过滤在后端 SQL 层（`WHERE p.author_user_id = 当前登录用户`，
 * admin 时由 @AuthorDataScope 置空）。前端**不**用 `useIsAdmin()` 决定传不传 authorUserId
 * ——前端传的参数后端一律不信（设计文档 §7.4 原文）。达人登录时这里只是**隐藏**达人筛选控件，
 * 因为传了也没用，摆着反而让人以为能查别人。
 *
 * ⚠️ 导出（A7 `/travel18/expertPayable/export`）**不授予 daren**（menu_id=2262）：
 *    达人只看流水，对账单是发给入驻商家的交付物，收回 admin（§13.14.4）。
 */

import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  message,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import CommonTable from '@/components/CommonTable';
import BindableMerchantSelect from '@/components/DataSelect/BindableMerchantSelect';
import DarenUserSelect from '@/components/DataSelect/DarenUserSelect';
import { useExpertPermission } from '@/hooks/usePermission';
import { useTableRequest } from '@/hooks/useTableRequest';
import { DATE_FORMAT_FULL_TIME } from '@/variables';
import {
  fenToYuan,
  PAYABLE_PAY_STATUS_OPTIONS,
  PayablePayStatusColor,
  PayablePayStatusLabel,
  TerminalGroupLabel,
  TerminalGroupOptions,
} from '@/enums';
import {
  exportExpertPayable,
  getExpertIncomeSummary,
  listExpertIncomeDetail,
} from '@/services/expert';
import type { ExpertIncomeDetail, ExpertIncomeQuery } from '@/types/expert';

const fmtTime = (v?: string | null) => (v ? dayjs(v).format(DATE_FORMAT_FULL_TIME) : '--');

const Money: React.FC<{ fen?: number | null; suffix?: string }> = ({ fen, suffix = '元' }) => (
  <span className="nowrap">
    {fen === null || fen === undefined ? '--' : `${fenToYuan(fen)} ${suffix}`}
  </span>
);

type FilterValues = {
  /** 账期区间 = **记账时间** payable.create_time（不是支付时间），故命名 accountRange */
  accountRange?: [Dayjs, Dayjs] | null;
  merchantId?: number;
  authorUserId?: number;
  terminalGroup?: string;
  payStatus?: string;
};

/** 筛选表单值 → 契约 A10/A7 query（纯函数，便于单测覆盖账期口径） */
export const buildIncomeQuery = (values: FilterValues): ExpertIncomeQuery => {
  const range = values.accountRange;
  return {
    merchantId: values.merchantId ?? undefined,
    authorUserId: values.authorUserId ?? undefined,
    terminalGroup: values.terminalGroup || undefined,
    payStatus: values.payStatus || undefined,
    beginTime: range?.[0] ? `${range[0].format('YYYY-MM-DD')} 00:00:00` : undefined,
    endTime: range?.[1] ? `${range[1].format('YYYY-MM-DD')} 23:59:59` : undefined,
  };
};

const ExpertIncomePage: React.FC = () => {
  const actionRef = useRef<{ reload: () => void } | null>(null);
  const perm = useExpertPermission();
  const [filterForm] = Form.useForm<FilterValues>();
  const [query, setQuery] = useState<ExpertIncomeQuery>({});
  const [exporting, setExporting] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ['expert-income-summary', query],
    queryFn: async () => {
      const res = await getExpertIncomeSummary(query);
      return res?.data ?? [];
    },
  });

  const request = useTableRequest(
    listExpertIncomeDetail as (params: Record<string, unknown>) => Promise<{
      code: number;
      msg: string;
      total: number;
      rows: unknown[];
    }>,
  );

  const handleSearch = () => {
    setQuery(buildIncomeQuery(filterForm.getFieldsValue()));
    actionRef.current?.reload();
  };

  const handleReset = () => {
    filterForm.resetFields();
    setQuery({});
    actionRef.current?.reload();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const filename = await exportExpertPayable(query);
      message.success(`已导出：${filename}`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const summary = summaryQuery.data ?? [];

  const columns = [
    { title: '应付流水号', dataIndex: 'payableNo', width: 190, ellipsis: true },
    { title: '业务订单号', dataIndex: 'outTradeNo', width: 190, ellipsis: true },
    {
      title: '达人路线',
      dataIndex: 'routeTitle',
      width: 200,
      ellipsis: true,
      render: (_: unknown, r: ExpertIncomeDetail) =>
        r.routeTitle ?? (r.routeId ? `#${r.routeId}` : '--'),
    },
    {
      title: '达人',
      dataIndex: 'expertName',
      width: 130,
      ellipsis: true,
      render: (_: unknown, r: ExpertIncomeDetail) =>
        r.expertName ?? (r.authorUserId ? `#${r.authorUserId}` : '--'),
    },
    {
      title: '收款商家',
      dataIndex: 'merchantName',
      width: 160,
      ellipsis: true,
      render: (_: unknown, r: ExpertIncomeDetail) =>
        r.merchantName ?? (r.merchantId ? `#${r.merchantId}` : '--'),
    },
    {
      title: '终端',
      dataIndex: 'terminalGroup',
      width: 150,
      render: (_: unknown, r: ExpertIncomeDetail) =>
        TerminalGroupLabel[r.terminalGroup as keyof typeof TerminalGroupLabel] ??
        r.terminalGroup ??
        '--',
    },
    {
      title: '用户实付',
      dataIndex: 'orderAmountFen',
      width: 110,
      align: 'right' as const,
      render: (_: unknown, r: ExpertIncomeDetail) => <Money fen={r.orderAmountFen} />,
    },
    {
      title: '通道费',
      dataIndex: 'channelFeeFen',
      width: 100,
      align: 'right' as const,
      render: (_: unknown, r: ExpertIncomeDetail) => <Money fen={r.channelFeeFen} />,
    },
    {
      title: '平台佣金',
      dataIndex: 'commissionFen',
      width: 100,
      align: 'right' as const,
      render: (_: unknown, r: ExpertIncomeDetail) => <Money fen={r.commissionFen} />,
    },
    {
      title: '分成率快照',
      dataIndex: 'shareRate',
      width: 110,
      render: (_: unknown, r: ExpertIncomeDetail) =>
        r.shareRate === null || r.shareRate === undefined ? '--' : `${r.shareRate}%`,
    },
    {
      title: '商户侧应付',
      dataIndex: 'amountFen',
      width: 120,
      align: 'right' as const,
      render: (_: unknown, r: ExpertIncomeDetail) => <Money fen={r.amountFen} />,
    },
    {
      title: '结算状态',
      dataIndex: 'payStatus',
      width: 120,
      render: (_: unknown, r: ExpertIncomeDetail) =>
        r.payStatus ? (
          <Tag color={PayablePayStatusColor[r.payStatus] ?? 'default'}>
            {PayablePayStatusLabel[r.payStatus as keyof typeof PayablePayStatusLabel] ??
              r.payStatus}
          </Tag>
        ) : (
          '--'
        ),
    },
    { title: '结算批次', dataIndex: 'batchNo', width: 170, ellipsis: true },
    {
      title: '作废原因',
      dataIndex: 'voidReason',
      width: 180,
      ellipsis: true,
      render: (_: unknown, r: ExpertIncomeDetail) =>
        r.voidReason ? (
          <Tooltip title={r.voidReason}>
            <Typography.Text type="danger">{r.voidReason}</Typography.Text>
          </Tooltip>
        ) : (
          '--'
        ),
    },
    {
      // 后端刻意把 o.paid_time SELECT 出来：账期按 create_time 归集，两者跨月时会不一致，
      // 这一列的存在就是为了让差异**可见可解释**（否则达人只会觉得"钱少了"）。
      title: '支付时间',
      dataIndex: 'paidTime',
      tooltip:
        '订单支付时间 o.paid_time，仅用于解释与账期的差异；筛选/账期口径是「记账时间」payable.create_time（与结算批次一致）。',
      width: 170,
      render: (_: unknown, r: ExpertIncomeDetail) => fmtTime(r.paidTime),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card size="small">
        <Form form={filterForm} layout="inline" onFinish={handleSearch}>
          <Form.Item
            // 表单字段名 = accountRange（纯前端内部名，不出网；buildIncomeQuery 会把它
            // 翻译成顶层 beginTime/endTime）。**不要**改回 paidRange：账期口径是记账时间
            // payable.create_time，叫 paid 会让人以为按支付时间过滤（这个坑已经踩过一次）。
            name="accountRange"
            label="记账时间（账期）"
            tooltip="账期口径 = 应付记账时间 payable.create_time，与结算批次归集口径一致（不是订单支付时间 paid_time）。跨月支付的单会按记账月归属；表格同时展示 paidTime 便于解释差异。"
          >
            <DatePicker.RangePicker allowClear />
          </Form.Item>
          <Form.Item name="merchantId" label="收款商家" style={{ minWidth: 220 }}>
            {/* 对账要能查已停用商户的历史流水，所以这里不按 G5 条件筛 */}
            <BindableMerchantSelect includeUnavailable />
          </Form.Item>
          {perm.isAdmin ? (
            <Form.Item name="authorUserId" label="达人" style={{ minWidth: 200 }}>
              <DarenUserSelect placeholder="按达人筛选" />
            </Form.Item>
          ) : null}
          <Form.Item name="terminalGroup" label="终端" style={{ minWidth: 200 }}>
            {/* 安卓 T+3 / iOS 自然月后 45~60 天，必须能分开看 */}
            <Select
              placeholder="全部终端"
              options={TerminalGroupOptions}
              allowClear
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="payStatus" label="结算状态" style={{ minWidth: 160 }}>
            <Select
              placeholder="全部状态"
              options={PAYABLE_PAY_STATUS_OPTIONS}
              allowClear
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} htmlType="submit">
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
              {perm.canExportPayable ? (
                <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
                  导出对账单
                </Button>
              ) : null}
            </Space>
          </Form.Item>
        </Form>
        {perm.isDaren && !perm.isAdmin ? (
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 12 }}
            message="当前为达人视角：只统计归属于你的达人鼓励单（后端按 author_user_id 强制过滤），导出对账单需管理员操作。"
          />
        ) : null}
      </Card>

      {summary.length === 0 ? (
        <Card size="small">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              summaryQuery.isFetching
                ? '汇总加载中…'
                : '当前筛选条件下没有达人鼓励收入（只统计 expert_route_id 非空的单，商家线路打赏不计入）'
            }
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {summary.map((item, idx) => (
            <Col key={item.terminalGroup ?? `group-${idx}`} xs={24} lg={12} xxl={8}>
              <Card
                size="small"
                title={
                  TerminalGroupLabel[item.terminalGroup as keyof typeof TerminalGroupLabel] ??
                  item.terminalGroup ??
                  '未知终端'
                }
                extra={
                  <Typography.Text type="secondary">订单数 {item.orderCount ?? 0}</Typography.Text>
                }
              >
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <Statistic
                      title="打赏总额"
                      value={fenToYuan(item.totalAmountFen)}
                      suffix="元"
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="达人侧应付"
                      value={fenToYuan(item.merchantPayableFen)}
                      suffix="元"
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="通道费"
                      value={fenToYuan(item.totalChannelFeeFen)}
                      suffix="元"
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="平台佣金"
                      value={fenToYuan(item.totalCommissionFen)}
                      suffix="元"
                    />
                  </Col>
                  <Col span={24}>
                    <Statistic
                      title="已作废（退款）"
                      value={fenToYuan(item.voidedFen)}
                      suffix="元"
                      valueStyle={{ color: item.voidedFen ? '#cf1322' : undefined }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <CommonTable
        actionRef={actionRef}
        rowKey="payableNo"
        // 筛选统一由顶部表单驱动：params 变化会自动触发 ProTable 重新请求，
        // 不再给表格开第二套 search 表单（两套筛选互相覆盖是对账页最容易出的 bug）
        params={query as Record<string, unknown>}
        request={request as never}
        columns={columns as never}
        search={false}
        options={false}
        columnsState={{ persistenceKey: 'expert-income', persistenceType: 'localStorage' }}
      />
    </Space>
  );
};

export default ExpertIncomePage;
