/**
 * 达人鼓励订单（menu 2250，独立页 F3）。
 *
 * ## 为什么是独立页而不是给既有 `pages/RewardOrder` 加一列
 * 设计文档 §15.6 的 G2 决策：达人单与线路单**同表**（`travel_reward_order`），
 * 但后台要分两页展示，所以**必须有一方加过滤**，否则同一笔单会在两个页面重复出现、
 * 运营对不上账。分工是：
 * - 本页走**新接口** `/travel18/expertRewardOrder/list`，SQL 带 `AND expert_route_id IS NOT NULL`；
 * - 旧页 `/travel18/reward/order/list` 由后端在 `TravelRewardOrderMapper.xml` 的 `<where>` 里加
 *   `AND expert_route_id IS NULL` 默认过滤（后端改动，旧页的**列表与过滤逻辑一行未动**；
 *   旧页唯一的前端改动是把退款弹窗抽成共用组件 `components/RewardRefundModal`）。
 *
 * ⚠️ **达人单的 `line_id` 恒为 NULL**（锚点在 `expert_route_id`）。本页所有涉及 lineId 的
 *    渲染都必须空值防御；反过来，若某行 `expertRouteId` 为空，说明后端过滤没生效，
 *    本页会显式标「数据异常」而不是假装它是达人单（静默错账比报错更难查）。
 *
 * ## 退款入口为什么**必须**在本页（不能只留在「打赏订单」页）
 * 设计文档 §14.17 第 7 条原话是「退款不按来源分页，加来源列区分」——那是**后端接口**口径：
 * `/travel18/reward/refund/*` 按 `outTradeNo` 定位、不分来源，这一点没有变。
 * 但**前端列表**为了「两页互补、每笔单只出现一次」而各自加了硬过滤：
 * 「打赏订单」页的 SQL 带 `expert_route_id IS NULL`，**永远查不到达人单**。
 * 所以若退款入口只留在旧页，达人单就成了「能收钱、没有任何后台入口能退」的死单
 * （旧文案还写着「退款请到打赏订单页操作」，是把运营往死链上引）。
 *
 * 结论：退款**入口**要在两页各有一个，退款**规则**只能有一份
 * ——规则全在共用组件 `components/RewardRefundModal` 里，本页只负责「打开哪一笔」。
 *
 * ⚠️ 权限：`travel18:reward:refund` **不授予 daren**，达人视角连入口都不可见
 *    （`useExpertPermission().canRefundReward` 还额外叠了 `!isDaren` 的 fail-closed 判定）。
 */

import { DownloadOutlined } from '@ant-design/icons';
import {
  Button,
  Descriptions,
  Drawer,
  message,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import CommonTable from '@/components/CommonTable';
import DarenUserSelect from '@/components/DataSelect/DarenUserSelect';
import RewardRefundModal from '@/components/RewardRefundModal';
import type { RewardRefundTarget } from '@/components/RewardRefundModal';
import { isIosPlatform, showIosRefundGuide } from '@/components/RewardRefundModal/iosRefundGuide';
import { useExpertPermission } from '@/hooks/usePermission';
import { useTableRequest } from '@/hooks/useTableRequest';
import { DATE_FORMAT_FULL_TIME } from '@/variables';
import { key, option } from '@/configurify/columns/baseColumns';
import {
  fenToYuan,
  EXPERT_REFUNDABLE_ORDER_STATUS,
  RewardEnvColor,
  RewardEnvLabel,
  RewardOrderStatusColor,
  RewardOrderStatusEnum,
  RewardOrderStatusLabel,
  RewardPlatformLabel,
} from '@/enums';
import { get as getRewardRefundApi } from '@/services/api/打赏订单退款/打赏订单退款';
import {
  exportExpertRewardOrder,
  getExpertRewardOrder,
  listExpertRewardOrder,
} from '@/services/expert';
import type { ExpertRewardOrder, ExpertRewardOrderListQuery } from '@/types/expert';

const rewardRefundApi = getRewardRefundApi();

const ORDER_STATUS_OPTIONS = Object.entries(RewardOrderStatusLabel).map(([value, label]) => ({
  label,
  value,
}));
const PLATFORM_OPTIONS = Object.entries(RewardPlatformLabel).map(([value, label]) => ({
  label,
  value,
}));
const ENV_OPTIONS = Object.entries(RewardEnvLabel).map(([value, label]) => ({ label, value }));

const fmtTime = (v?: string | null) => (v ? dayjs(v).format(DATE_FORMAT_FULL_TIME) : '--');

/** 金额（分）展示：资金数字必须带单位，避免把「分」当「元」 */
const Money: React.FC<{ fen?: number | null }> = ({ fen }) => (
  <span className="nowrap">
    {fen === null || fen === undefined ? '--' : `${fenToYuan(fen)} 元`}
  </span>
);

/**
 * ProTable 的查询参数 → 契约 A4 list query。
 * 纯函数、单独导出：时间区间翻译这类"参数形状"逻辑最容易错，且错了不报错（只是查不到数据）。
 */
export const buildOrderQuery = (
  params: Record<string, unknown>,
): ExpertRewardOrderListQuery & { paidRange?: undefined } => {
  const range = params.paidRange as [string, string] | undefined;
  const next: ExpertRewardOrderListQuery & {
    paidRange?: undefined;
    'params[beginTime]'?: string;
    'params[endTime]'?: string;
  } = { paidRange: undefined };
  // RuoYi 的时间区间走 BaseEntity.params[beginTime]/[endTime]，与既有 RewardOrder 页一致
  if (range && range.length === 2) {
    next['params[beginTime]'] = `${range[0]} 00:00:00`;
    next['params[endTime]'] = `${range[1]} 23:59:59`;
  }
  return next;
};

const ExpertRewardOrderPage: React.FC = () => {
  const actionRef = useRef<{ reload: () => void } | null>(null);
  const perm = useExpertPermission();

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ExpertRewardOrder | null>(null);
  const [exporting, setExporting] = useState(false);
  /** 导出范围 = 当前筛选条件，所以要记住最后一次查询的参数 */
  const lastQuery = useRef<ExpertRewardOrderListQuery>({});

  // ---- 退款弹窗（流程在共用组件 RewardRefundModal 里，本页只管「打开哪一笔」）----
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundTarget, setRefundTarget] = useState<RewardRefundTarget | null>(null);

  const request = useTableRequest(
    listExpertRewardOrder as (params: Record<string, unknown>) => Promise<{
      code: number;
      msg: string;
      total: number;
      rows: unknown[];
    }>,
    undefined,
    (params) => {
      // 记住"当前筛选条件"供导出用（导出范围 = 当前筛选，不是全量）。
      // ⚠️ 必须把 buildOrderQuery 的 patch 合并进来再存：patch 里才有
      //    `params[beginTime]`/`params[endTime]`，只存原始 params 的话时间区间会丢，
      //    导出的账期范围和页面看到的不一致（而 `paidRange` 后端不认，必须摘掉）。
      //    useTableRequest 是 `{...params, ...getParams(params)}` 覆盖式合并，
      //    所以这里存的形状 = 实际发给 list 的形状。
      const patch = buildOrderQuery(params);
      const rest: Record<string, unknown> = { ...params, ...patch };
      delete rest.paidRange;
      delete rest.current;
      lastQuery.current = rest as unknown as ExpertRewardOrderListQuery;
      return patch;
    },
  );

  const openDetail = async (record: ExpertRewardOrder) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(record);
    try {
      const res = await getExpertRewardOrder(record.orderId);
      if (res?.code === 200 && res.data) setDetail(res.data);
    } catch {
      // 拦截器已提示
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const filename = await exportExpertRewardOrder(lastQuery.current);
      message.success(`已导出：${filename}`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  /**
   * 打开退款弹窗。
   *
   * <p>预览、金额闸门、三态结果处理全部在共用组件 {@link RewardRefundModal} 里 ——
   * 那是与「打赏订单」页共用的资金组件，规则只有一份，不允许在两页各写一遍。
   * `sourceLabel` 只是弹窗标题上的来源标识，避免运营在两页之间搞混这笔单是谁的。
   *
   * <p>⚠️ 达人单没有 `lineId`，**不要**在 target 里塞 lineId 做兜底显示，
   * 否则弹窗标题会出现「线路 null」这种把达人单伪装成线路单的文案。
   */
  const openRefund = (record: ExpertRewardOrder) => {
    if (!record.outTradeNo) {
      // 退款的唯一定位键就是 outTradeNo；为空时宁可拦住也不要发一个必然失败的请求
      message.error('该记录缺少业务订单号，无法发起退款');
      return;
    }
    /**
     * iOS（Apple 支付）单：**只弹引导**，不进退款弹窗。理由与「打赏订单」页完全一致，
     * 判定与文案都取自共用模块 `RewardRefundModal/iosRefundGuide`，两页不允许各写一份。
     *
     * ⚠️ 达人单同样会有 iOS 单（打赏终端由下单时的微信客户端决定，与来源无关），
     * 所以这道拦截两个页面都要有，缺一个就留一个「点了必然失败」的入口。
     */
    if (isIosPlatform(record.platform)) {
      showIosRefundGuide(record.outTradeNo);
      return;
    }
    setRefundTarget({ outTradeNo: record.outTradeNo, sourceLabel: '达人鼓励' });
    setRefundOpen(true);
  };

  /**
   * 手工轮询单笔退款终态。
   * 达人单在旧「打赏订单」页查不到（那边硬过滤 `expert_route_id IS NULL`），
   * 所以卡在「退款中」时**只能**在本页排障 —— 这个入口不能省。
   */
  const pollOne = async (record: ExpertRewardOrder) => {
    if (!record.outTradeNo) return;
    try {
      // 生成代码的返回类型是宽泛的 AjaxResult（data: Record<string, unknown>），
      // 这里按后端 RewardRefundPollOneVO 的真实字段窄化，避免再引入一个 any
      const res = (await rewardRefundApi.rewardRefundPollOne({
        outTradeNo: record.outTradeNo,
      })) as { data?: { terminal?: boolean; orderStatus?: string; message?: string } };
      const vo = res?.data ?? {};
      if (vo.terminal) {
        message.success(
          `已到终态：${
            RewardOrderStatusLabel[vo.orderStatus as keyof typeof RewardOrderStatusLabel] ??
            vo.orderStatus
          }`,
        );
        actionRef.current?.reload();
      } else {
        message.info(vo.message || '仍在处理中，稍后可再次查询');
      }
    } catch {
      // 拦截器已提示
    }
  };

  const columns = [
    key,
    {
      title: '业务订单号',
      dataIndex: 'outTradeNo',
      width: 200,
      ellipsis: true,
      render: (_: unknown, r: ExpertRewardOrder) =>
        r.outTradeNo ? (
          <Typography.Text copyable={{ text: r.outTradeNo }}>{r.outTradeNo}</Typography.Text>
        ) : (
          '--'
        ),
    },
    { title: '订单号', dataIndex: 'orderNo', width: 180, ellipsis: true },
    {
      title: '达人路线',
      dataIndex: 'expertRouteId',
      width: 200,
      ellipsis: true,
      // 达人单的 line_id 恒为 NULL，这里**只**认 expertRouteId，不做 lineId 兜底
      render: (_: unknown, r: ExpertRewardOrder) =>
        r.expertRouteId ? (
          (r.expertRouteTitle ?? `路线 #${r.expertRouteId}`)
        ) : (
          <Tag color="error">数据异常：非达人单</Tag>
        ),
    },
    {
      title: '达人',
      dataIndex: 'authorUserId',
      width: 150,
      ellipsis: true,
      renderFormItem: () => <DarenUserSelect placeholder="按达人筛选" />,
      render: (_: unknown, r: ExpertRewardOrder) =>
        r.authorNickname ?? (r.authorUserId ? `#${r.authorUserId}` : '--'),
    },
    {
      title: '收款商家',
      dataIndex: 'merchantId',
      width: 160,
      ellipsis: true,
      render: (_: unknown, r: ExpertRewardOrder) =>
        r.merchantName ?? (r.merchantId ? `#${r.merchantId}` : '--'),
    },
    {
      title: '档位',
      dataIndex: 'tierName',
      width: 130,
      search: false,
      render: (_: unknown, r: ExpertRewardOrder) =>
        r.tierName ?? (r.tierId ? `#${r.tierId}` : '--'),
    },
    {
      title: '实付金额',
      dataIndex: 'actualPriceFen',
      width: 110,
      search: false,
      align: 'right' as const,
      render: (_: unknown, r: ExpertRewardOrder) => <Money fen={r.actualPriceFen} />,
    },
    {
      title: '订单状态',
      dataIndex: 'orderStatus',
      width: 130,
      valueType: 'select',
      fieldProps: { options: ORDER_STATUS_OPTIONS },
      render: (_: unknown, r: ExpertRewardOrder) =>
        r.orderStatus ? (
          <Tag color={RewardOrderStatusColor[r.orderStatus] ?? 'default'}>
            {RewardOrderStatusLabel[r.orderStatus as keyof typeof RewardOrderStatusLabel] ??
              r.orderStatus}
          </Tag>
        ) : (
          '--'
        ),
    },
    {
      title: '支付时间',
      dataIndex: 'paidTime',
      width: 170,
      search: false,
      render: (_: unknown, r: ExpertRewardOrder) => fmtTime(r.paidTime),
    },
    {
      // A4 的时间过滤走后端 `t.paid_time`（TravelExpertRewardMapper.xml 订单 list 的
      // `params.beginTime/endTime` 条件），**订单视角**：用户什么时候付的钱。
      // ⚠️ 与 A7/A10 达人收入页**刻意不同口径**：那边是结算视角，按
      //    `payable.create_time`（记账时间）归集，与结算批次 claimForBatch 对齐。
      //    两页口径不同不是 bug，两边的 tooltip 都写明了，避免运营对不上账时误报。
      title: '支付时间区间',
      dataIndex: 'paidRange',
      tooltip:
        '按订单支付时间 t.paid_time 过滤（订单视角）。注意：达人收入对账页的账期口径是应付记账时间 payable.create_time（结算视角，与结算批次一致），跨月支付的单在两页可能落在不同月份，这是有意为之。',
      valueType: 'dateRange',
      hideInTable: true,
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 110,
      search: false,
      render: (_: unknown, r: ExpertRewardOrder) =>
        r.expertRouteId ? <Tag color="blue">达人路线</Tag> : <Tag>商家线路</Tag>,
    },
    {
      title: '终端',
      dataIndex: 'platform',
      width: 100,
      valueType: 'select',
      fieldProps: { options: PLATFORM_OPTIONS },
      render: (_: unknown, r: ExpertRewardOrder) =>
        RewardPlatformLabel[r.platform as keyof typeof RewardPlatformLabel] ?? r.platform ?? '--',
    },
    {
      title: '环境',
      dataIndex: 'env',
      width: 90,
      valueType: 'select',
      fieldProps: { options: ENV_OPTIONS },
      render: (_: unknown, r: ExpertRewardOrder) =>
        r.env ? (
          <Tag color={RewardEnvColor[r.env]}>
            {RewardEnvLabel[r.env as keyof typeof RewardEnvLabel] ?? r.env}
          </Tag>
        ) : (
          '--'
        ),
    },
    {
      ...option,
      width: 170,
      render: (_: unknown, record: ExpertRewardOrder) => (
        <Space size={4} wrap>
          <a onClick={() => openDetail(record)}>详情</a>
          {/*
            退款入口的两道闸门，缺一不可：
            1) `EXPERT_REFUNDABLE_ORDER_STATUS`（已支付待发货 / 已发货 / 退款失败）——
               ⚠️ 用的是**达人单专用**白名单，不是旧页那份 `REFUNDABLE_ORDER_STATUS`。
               差别就是多一个 `PAID('1')`：达人单卡在 '1'（钱已收、记账未完成）时，
               旧「打赏订单」页因 SQL 硬编码 `expert_route_id IS NULL` 永远查不到它，
               若本页也不放开，运营在**任何**后台页面都找不到退款按钮 → 「能收钱、无处可退」的死单。
               后端本来就放行 '1'，前端不该比后端更严。详见 enums/reward.ts 的注释。
            2) `perm.canRefundReward` —— 权限串 + `!isDaren` fail-closed。
            ⚠️ 只判状态不判权限，daren 就会看到按钮（点了 403，等于把资金动作暴露给不该看到的人）。
          */}
          {record.orderStatus &&
            EXPERT_REFUNDABLE_ORDER_STATUS.includes(record.orderStatus) &&
            perm.canRefundReward && <a onClick={() => openRefund(record)}>退款</a>}
          {record.orderStatus === RewardOrderStatusEnum.REFUNDING && perm.canRefundReward && (
            <Popconfirm title="向微信查询这笔退款的终态？" onConfirm={() => pollOne(record)}>
              <a>查退款结果</a>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <CommonTable
        actionRef={actionRef}
        rowKey="orderId"
        request={request as never}
        columns={columns as never}
        toolBarRender={() => [
          // daren 看不到导出：既没有 :export 权限串，useExpertPermission 里也叠了 isDaren 判定
          perm.canExportRewardOrder ? (
            <Button
              key="export"
              icon={<DownloadOutlined />}
              loading={exporting}
              onClick={handleExport}
            >
              导出当前筛选
            </Button>
          ) : null,
        ]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        columnsState={{ persistenceKey: 'expert-reward-order', persistenceType: 'localStorage' }}
      />

      <Drawer
        title="达人鼓励订单详情"
        width={620}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        <Spin spinning={detailLoading}>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="业务订单号">{detail?.outTradeNo ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="订单号">{detail?.orderNo ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="达人路线">
              {detail?.expertRouteId
                ? (detail?.expertRouteTitle ?? `#${detail.expertRouteId}`)
                : '--'}
            </Descriptions.Item>
            {/* lineId 对达人单恒为 NULL：显示 '--'，不要显示 0 或空白 */}
            <Descriptions.Item label="商家线路ID">{detail?.lineId ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="达人">
              {detail?.authorNickname ?? (detail?.authorUserId ? `#${detail.authorUserId}` : '--')}
            </Descriptions.Item>
            <Descriptions.Item label="收款商家">
              {detail?.merchantName ?? (detail?.merchantId ? `#${detail.merchantId}` : '--')}
            </Descriptions.Item>
            <Descriptions.Item label="档位">
              {detail?.tierName ?? (detail?.tierId ? `#${detail.tierId}` : '--')}
            </Descriptions.Item>
            <Descriptions.Item label="实付金额">
              <Money fen={detail?.actualPriceFen} />
            </Descriptions.Item>
            <Descriptions.Item label="商家分成">
              <Money fen={detail?.shareFen} />
              （分成率 {detail?.shareRate ?? '--'}%）
            </Descriptions.Item>
            <Descriptions.Item label="通道费">
              <Money fen={detail?.channelFeeFen} />
              （费率 {detail?.channelFeeRate ?? '--'}%）
            </Descriptions.Item>
            <Descriptions.Item label="平台佣金">
              <Money fen={detail?.commissionFen} />
              （费率 {detail?.commissionRate ?? '--'}%）
            </Descriptions.Item>
            <Descriptions.Item label="已退金额">
              <Money fen={detail?.refundFeeFen} />
            </Descriptions.Item>
            <Descriptions.Item label="订单状态">
              {detail?.orderStatus
                ? (RewardOrderStatusLabel[
                    detail.orderStatus as keyof typeof RewardOrderStatusLabel
                  ] ?? detail.orderStatus)
                : '--'}
            </Descriptions.Item>
            <Descriptions.Item label="支付时间">{fmtTime(detail?.paidTime)}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{fmtTime(detail?.createTime)}</Descriptions.Item>
          </Descriptions>
          <Space style={{ marginTop: 12 }}>
            {/*
              ⚠️ 旧文案写的是「退款请到『打赏订单』页操作」，那是**死链**：
              旧页 SQL 硬编码 `expert_route_id IS NULL`，永远查不到达人单。
              现在退款入口就在本页列表的行操作里（admin 可见，daren 不可见），
              这里只做说明，不要再把运营往别的页面指。
            */}
            <Typography.Text type="secondary">
              {detail?.orderStatus && EXPERT_REFUNDABLE_ORDER_STATUS.includes(detail.orderStatus)
                ? perm.canRefundReward
                  ? '退款请在左侧列表的行操作里发起（与「打赏订单」页共用同一个退款组件与后端规则）。'
                  : '当前账号无退款权限：退款仅限 admin，请联系运营处理。'
                : '当前订单状态不可退款（达人鼓励单可在「已支付待发货」「已发货」「退款失败」三种状态发起）。'}
            </Typography.Text>
          </Space>
        </Spin>
      </Drawer>

      {/* ---------- 退款（与「打赏订单」页共用组件，规则只有一份） ---------- */}
      <RewardRefundModal
        open={refundOpen}
        target={refundTarget}
        onClose={() => setRefundOpen(false)}
        onSuccess={() => actionRef.current?.reload()}
      />
    </>
  );
};

export default ExpertRewardOrderPage;
