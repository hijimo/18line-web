import {
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
import RewardRefundModal, { RewardRefundTarget } from '@/components/RewardRefundModal';
import LineSelect from '@/components/DataSelect/LineSelect';
import { isIosPlatform, showIosRefundGuide } from '@/components/RewardRefundModal/iosRefundGuide';
import { useTableRequest } from '@/hooks/useTableRequest';
import { DATE_FORMAT_FULL_TIME } from '@/variables';
import { key, option } from '@/configurify/columns/baseColumns';
import {
  fenToYuan,
  PayableStatusColor,
  PayableStatusLabel,
  REFUNDABLE_ORDER_STATUS,
  RefundReasonLabel,
  RewardEnvColor,
  RewardEnvLabel,
  RewardOrderStatusColor,
  RewardOrderStatusEnum,
  RewardOrderStatusLabel,
  RewardPlatformLabel,
} from '@/enums';
import { get as getRewardOrderApi } from '@/services/api/打赏订单查询/打赏订单查询';
import { get as getRewardRefundApi } from '@/services/api/打赏订单退款/打赏订单退款';

const rewardOrderApi = getRewardOrderApi();
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

const fmtTime = (v?: string | Date | null) => (v ? dayjs(v).format(DATE_FORMAT_FULL_TIME) : '--');

/** 金额（分）展示。资金数字必须带单位，避免财务把「分」当「元」 */
const Money: React.FC<{ fen?: number | null; suffix?: string }> = ({ fen, suffix = '元' }) => (
  <span className="nowrap">
    {fen === null || fen === undefined ? '--' : `${fenToYuan(fen)} ${suffix}`}
  </span>
);

const RewardOrder: React.FC = () => {
  const actionRef = useRef<any>(null);

  // ---- 详情抽屉 ----
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [detailPayable, setDetailPayable] = useState<any>(null);

  // ---- 退款弹窗（流程在共用组件 RewardRefundModal 里，本页只管「打开哪一笔」）----
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundTarget, setRefundTarget] = useState<RewardRefundTarget | null>(null);

  /**
   * 列表请求。
   * RuoYi 的时间区间走 params[beginTime]/params[endTime]，
   * ProTable 的 dateRange 给的是数组，这里翻译成后端 BaseEntity.params 的形式。
   */
  const request = useTableRequest(rewardOrderApi.rewardOrderList as any, undefined, (params) => {
    const range = (params as any).createRange as [string, string] | undefined;
    const next: Record<string, unknown> = { createRange: undefined };
    if (range && range.length === 2) {
      next['params[beginTime]'] = `${range[0]} 00:00:00`;
      next['params[endTime]'] = `${range[1]} 23:59:59`;
    }
    return next;
  });

  const openDetail = async (record: any) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailOrder(record);
    setDetailPayable(null);
    try {
      const [orderRes, payableRes] = await Promise.all([
        rewardOrderApi.rewardOrderDetail({ orderId: record.orderId }) as any,
        rewardOrderApi.rewardOrderPayable({ orderId: record.orderId }) as any,
      ]);
      if (orderRes?.code === 200) setDetailOrder(orderRes.data);
      // data 为 null 是正常语义：订单未完成发货就没有应付流水，页面显示「未记账」
      setDetailPayable(payableRes?.code === 200 ? (payableRes.data ?? null) : null);
    } catch {
      // 错误提示已由 request 拦截器统一弹出，这里只需停止 loading
    } finally {
      setDetailLoading(false);
    }
  };

  /**
   * 打开退款弹窗。
   *
   * <p>预览、金额闸门、三态结果处理全部在 {@link RewardRefundModal} 里 —— 那是与
   * 「达人鼓励订单」页共用的资金组件，规则只有一份，不允许在两页各写一遍。
   * `sourceLabel` 只是标题上的来源标识，避免运营在两页之间搞混这笔单是谁的。
   */
  const openRefund = (record: any) => {
    /**
     * iOS（Apple 支付）单：**只弹引导**，不进退款弹窗。
     *
     * 后端已经有入口拦截（platform=ios 直接拒、不出网），这里再拦一层不是为了功能，
     * 而是为了操作者看到的东西：进弹窗会先看到金额表单和「确认退款」按钮（虽然禁用），
     * 再看到一段长原因，视觉上仍是「这里可以退，只是现在不行」。
     * 直接给引导 + 官方原文链接，才是「这条路不通，去用户侧办」的正确表达。
     */
    if (isIosPlatform(record.platform)) {
      showIosRefundGuide(record.outTradeNo);
      return;
    }
    setRefundTarget({ outTradeNo: record.outTradeNo, sourceLabel: '线路打赏' });
    setRefundOpen(true);
  };


  /** 手工轮询单笔退款终态，用于订单卡在「退款中」时排障 */
  const pollOne = async (record: any) => {
    try {
      const res: any = await rewardRefundApi.rewardRefundPollOne({
        outTradeNo: record.outTradeNo,
      });
      const vo = res?.data ?? {};
      if (vo.terminal) {
        message.success(
          `已到终态：${RewardOrderStatusLabel[vo.orderStatus as keyof typeof RewardOrderStatusLabel] ?? vo.orderStatus}`,
        );
      } else {
        message.info(vo.message || '仍在处理中，稍后可再次查询');
      }
      actionRef.current?.reload();
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
      render: (_: any, r: any) => (
        <Typography.Text copyable={{ text: r.outTradeNo }}>{r.outTradeNo}</Typography.Text>
      ),
    },
    { title: '订单号', dataIndex: 'orderNo', width: 180, ellipsis: true, search: false },
    {
      title: '线路',
      dataIndex: 'lineId',
      width: 160,
      ellipsis: true,
      renderFormItem: () => <LineSelect placeholder="请选择线路" />,
      render: (_: any, r: any) => r.lineName ?? r.lineId ?? '--',
    },
    { title: '商户ID', dataIndex: 'merchantId', width: 100 },
    {
      title: '实付金额',
      dataIndex: 'actualPriceFen',
      width: 110,
      search: false,
      align: 'right',
      render: (_: any, r: any) => <Money fen={r.actualPriceFen} />,
    },
    {
      title: '商家分成',
      dataIndex: 'shareFen',
      width: 110,
      search: false,
      align: 'right',
      render: (_: any, r: any) => <Money fen={r.shareFen} />,
    },
    {
      title: '已退金额',
      dataIndex: 'refundFeeFen',
      width: 110,
      search: false,
      align: 'right',
      render: (_: any, r: any) => (r.refundFeeFen ? <Money fen={r.refundFeeFen} /> : '--'),
    },
    {
      title: '终端',
      dataIndex: 'platform',
      width: 100,
      valueType: 'select',
      fieldProps: { options: PLATFORM_OPTIONS },
      render: (_: any, r: any) =>
        RewardPlatformLabel[r.platform as keyof typeof RewardPlatformLabel] ?? r.platform ?? '--',
    },
    {
      title: '环境',
      dataIndex: 'env',
      width: 90,
      valueType: 'select',
      fieldProps: { options: ENV_OPTIONS },
      render: (_: any, r: any) =>
        r.env ? (
          <Tag color={RewardEnvColor[r.env]}>
            {RewardEnvLabel[r.env as keyof typeof RewardEnvLabel] ?? r.env}
          </Tag>
        ) : (
          '--'
        ),
    },
    {
      title: '订单状态',
      dataIndex: 'orderStatus',
      width: 130,
      valueType: 'select',
      fieldProps: { options: ORDER_STATUS_OPTIONS },
      render: (_: any, r: any) => (
        <Tag color={RewardOrderStatusColor[r.orderStatus]}>
          {RewardOrderStatusLabel[r.orderStatus as keyof typeof RewardOrderStatusLabel] ??
            r.orderStatus}
        </Tag>
      ),
    },
    { title: 'openid', dataIndex: 'userOpenid', width: 180, ellipsis: true },
    {
      title: '支付时间',
      dataIndex: 'paidTime',
      width: 170,
      search: false,
      render: (_: any, r: any) => fmtTime(r.paidTime),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 170,
      search: false,
      render: (_: any, r: any) => fmtTime(r.createTime),
    },
    {
      title: '下单时间',
      dataIndex: 'createRange',
      valueType: 'dateRange',
      hideInTable: true,
      search: { transform: () => ({}) },
    },
    {
      ...option,
      width: 200,
      render: (_: any, record: any) => (
        <Space size={4} wrap>
          <a onClick={() => openDetail(record)}>详情</a>
          {REFUNDABLE_ORDER_STATUS.includes(record.orderStatus) && (
            <a onClick={() => openRefund(record)}>退款</a>
          )}
          {record.orderStatus === RewardOrderStatusEnum.REFUNDING && (
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
      <CommonTable<any, any>
        actionRef={actionRef}
        rowKey="orderId"
        headerTitle="打赏订单"
        columns={columns as any}
        request={request as any}
        pagination={{ defaultPageSize: 20, showSizeChanger: true }}
        toolBarRender={false}
        options={{ density: true, reload: true, setting: true }}
      />

      {/* ---------- 订单详情 ---------- */}
      <Drawer
        title="打赏订单详情"
        width={760}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        destroyOnClose
      >
        <Spin spinning={detailLoading}>
          <Descriptions title="订单与费率快照" column={2} size="small" bordered>
            <Descriptions.Item label="业务订单号" span={2}>
              <Typography.Text copyable>{detailOrder?.outTradeNo ?? '--'}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="订单号">{detailOrder?.orderNo ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="订单状态">
              <Tag color={RewardOrderStatusColor[detailOrder?.orderStatus]}>
                {RewardOrderStatusLabel[
                  detailOrder?.orderStatus as keyof typeof RewardOrderStatusLabel
                ] ??
                  detailOrder?.orderStatus ??
                  '--'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="实付金额">
              <Money fen={detailOrder?.actualPriceFen} />
            </Descriptions.Item>
            <Descriptions.Item label="原价">
              <Money fen={detailOrder?.origPriceFen} />
            </Descriptions.Item>
            <Descriptions.Item label="渠道费率">
              {detailOrder?.channelFeeRate ?? '--'} %
            </Descriptions.Item>
            <Descriptions.Item label="渠道费">
              <Money fen={detailOrder?.channelFeeFen} />
            </Descriptions.Item>
            <Descriptions.Item label="平台佣金率">
              {detailOrder?.commissionRate ?? '--'} %
            </Descriptions.Item>
            <Descriptions.Item label="平台佣金">
              <Money fen={detailOrder?.commissionFen} />
            </Descriptions.Item>
            <Descriptions.Item label="商家分成率">
              {detailOrder?.shareRate ?? '--'} %
            </Descriptions.Item>
            <Descriptions.Item label="商家分成">
              <Money fen={detailOrder?.shareFen} />
            </Descriptions.Item>
            <Descriptions.Item label="终端">{detailOrder?.platform ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="环境">
              {RewardEnvLabel[detailOrder?.env as keyof typeof RewardEnvLabel] ??
                detailOrder?.env ??
                '--'}
            </Descriptions.Item>
            <Descriptions.Item label="线路ID">{detailOrder?.lineId ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="商户ID">{detailOrder?.merchantId ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="作者用户ID">
              {detailOrder?.authorUserId ?? '--'}
            </Descriptions.Item>
            <Descriptions.Item label="道具ID">{detailOrder?.wxProductId ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="支付时间">{fmtTime(detailOrder?.paidTime)}</Descriptions.Item>
            <Descriptions.Item label="发货时间">
              {fmtTime(detailOrder?.provideTime)}
            </Descriptions.Item>
          </Descriptions>

          <Descriptions title="微信侧" column={2} size="small" bordered style={{ marginTop: 24 }}>
            <Descriptions.Item label="微信订单号" span={2}>
              {detailOrder?.wxOrderId ?? '--'}
            </Descriptions.Item>
            <Descriptions.Item label="微信订单状态">
              {detailOrder?.wxOrderStatus ?? '--'}
            </Descriptions.Item>
            <Descriptions.Item label="结算状态">{detailOrder?.settState ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="结算时间">{fmtTime(detailOrder?.settTime)}</Descriptions.Item>
            <Descriptions.Item label="微信实收服务费">
              <Money fen={detailOrder?.platformFeeFen} />
            </Descriptions.Item>
            <Descriptions.Item label="推送次数">{detailOrder?.notifyCount ?? 0}</Descriptions.Item>
            <Descriptions.Item label="最后推送时间">
              {fmtTime(detailOrder?.lastNotifyTime)}
            </Descriptions.Item>
            <Descriptions.Item label="iOS 问询次数">
              {detailOrder?.iosRefundQueryCount ?? 0}
            </Descriptions.Item>
            <Descriptions.Item label="iOS 问询应答">
              {detailOrder?.iosRefundResult ?? '--'}
            </Descriptions.Item>
            <Descriptions.Item label="iOS 应答凭据" span={2}>
              {detailOrder?.iosRefundEvidence ?? '--'}
            </Descriptions.Item>
          </Descriptions>

          <Descriptions title="退款" column={2} size="small" bordered style={{ marginTop: 24 }}>
            <Descriptions.Item label="已退金额">
              <Money fen={detailOrder?.refundFeeFen} />
            </Descriptions.Item>
            <Descriptions.Item label="退款时间">
              {fmtTime(detailOrder?.refundTime)}
            </Descriptions.Item>
            <Descriptions.Item label="本方退款单号" span={2}>
              {detailOrder?.mchRefundId ?? '--'}
            </Descriptions.Item>
            <Descriptions.Item label="微信退款单号" span={2}>
              {detailOrder?.wxRefundId ?? '--'}
            </Descriptions.Item>
            <Descriptions.Item label="退款原因">
              {RefundReasonLabel[detailOrder?.refundReason as keyof typeof RefundReasonLabel] ??
                detailOrder?.refundReason ??
                '--'}
            </Descriptions.Item>
            <Descriptions.Item label="轮询次数">
              {detailOrder?.refundPollCount ?? 0}
            </Descriptions.Item>
            <Descriptions.Item label="申请人">
              {detailOrder?.refundApplyBy ?? '--'}
            </Descriptions.Item>
            <Descriptions.Item label="申请时间">
              {fmtTime(detailOrder?.refundApplyTime)}
            </Descriptions.Item>
            <Descriptions.Item label="最后错误" span={2}>
              {detailOrder?.refundLastError ?? '--'}
            </Descriptions.Item>
          </Descriptions>

          <Descriptions
            title="商家应付流水"
            column={2}
            size="small"
            bordered
            style={{ marginTop: 24 }}
          >
            {detailPayable ? (
              <>
                <Descriptions.Item label="流水号">
                  {detailPayable.payableNo ?? '--'}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={PayableStatusColor[detailPayable.payStatus]}>
                    {PayableStatusLabel[
                      detailPayable.payStatus as keyof typeof PayableStatusLabel
                    ] ?? detailPayable.payStatus}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="应付金额">
                  <Money fen={detailPayable.amountFen} />
                </Descriptions.Item>
                <Descriptions.Item label="订单金额">
                  <Money fen={detailPayable.orderAmountFen} />
                </Descriptions.Item>
                <Descriptions.Item label="终端分组">
                  {detailPayable.terminalGroup ?? '--'}
                </Descriptions.Item>
                <Descriptions.Item label="结算批次ID">
                  {detailPayable.settleBatchId ?? '--'}
                </Descriptions.Item>
                <Descriptions.Item label="作废原因" span={2}>
                  {detailPayable.voidReason ?? '--'}
                </Descriptions.Item>
              </>
            ) : (
              <Descriptions.Item label="状态" span={2}>
                未记账（订单尚未完成发货，或已被冲销）
              </Descriptions.Item>
            )}
          </Descriptions>
        </Spin>
      </Drawer>

      {/* ---------- 退款 ---------- */}
      <RewardRefundModal
        open={refundOpen}
        target={refundTarget}
        onClose={() => setRefundOpen(false)}
        onSuccess={() => actionRef.current?.reload()}
      />
    </>
  );
};

export default RewardOrder;
