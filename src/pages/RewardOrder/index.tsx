import {
  Alert,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import CommonTable from '@/components/CommonTable';
import LineSelect from '@/components/DataSelect/LineSelect';
import { useTableRequest } from '@/hooks/useTableRequest';
import { DATE_FORMAT_FULL_TIME } from '@/variables';
import { key, option } from '@/configurify/columns/baseColumns';
import {
  fenToYuan,
  PayableStatusColor,
  PayableStatusLabel,
  REFUNDABLE_ORDER_STATUS,
  RefundReasonLabel,
  RefundReasonOptions,
  RewardEnvColor,
  RewardEnvLabel,
  RewardErrorCode,
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

  // ---- 退款弹窗 ----
  const [refundOpen, setRefundOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [refundTarget, setRefundTarget] = useState<any>(null);
  const [refundForm] = Form.useForm();

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

  const openRefund = async (record: any) => {
    setRefundTarget(record);
    setPreview(null);
    setRefundOpen(true);
    refundForm.resetFields();
    setPreviewLoading(true);
    try {
      const res: any = await rewardRefundApi.rewardRefundPreview({
        outTradeNo: record.outTradeNo,
      });
      const vo = res?.code === 200 ? res.data : null;
      setPreview(vo);
      if (vo?.refundable) {
        // 默认全额退款：微信侧可退余额 leftFeeFen（不是本地实付金额，两者可能不同）
        refundForm.setFieldsValue({
          refundFeeYuan: vo.maxRefundFen != null ? vo.maxRefundFen / 100 : undefined,
          refundReason: '3',
        });
      }
    } catch {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const submitRefund = async () => {
    let values: any;
    try {
      values = await refundForm.validateFields();
    } catch {
      // 校验未通过：表单已就地标红，直接结束，避免抛出 unhandled rejection
      return;
    }
    if (!refundTarget?.outTradeNo) return;
    // 元 → 分。必须 round，0.1+0.2 之类的浮点误差会让金额差 1 分，
    // 而微信对退款金额是精确校验的（268490016 left_fee 与实际不符）
    const refundFeeYuan = values.refundFeeYuan;
    const refundFeeFen =
      refundFeeYuan === undefined || refundFeeYuan === null || refundFeeYuan === ''
        ? undefined
        : Math.round(Number(refundFeeYuan) * 100);

    /**
     * 出网前对**实际请求体**再校一遍金额，这是最后一道闸门。
     *
     * 为什么不能只靠 Form 校验：rc-input-number 对越界输入不会触发 onChange，
     * 于是「输入框里写着 99.99、表单值却是 undefined」是真实会出现的状态，
     * 而 refundFeeFen=undefined 在后端语义里等于「全额退款」——
     * 客服想退一小笔，系统按全额退，钱出去就收不回来了。
     */
    if (refundFeeFen !== undefined) {
      if (!Number.isFinite(refundFeeFen) || refundFeeFen <= 0) {
        message.error('退款金额必须大于 0，已阻止提交');
        return;
      }
      if (preview?.maxRefundFen != null && refundFeeFen > preview.maxRefundFen) {
        message.error(
          `退款金额不得超过微信侧可退余额 ${fenToYuan(preview.maxRefundFen)} 元，已阻止提交`,
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const res: any = await rewardRefundApi.rewardRefundApply({
        outTradeNo: refundTarget.outTradeNo,
        refundFeeFen,
        refundReason: values.refundReason,
        reqFrom: values.reqFrom || '1',
        remark: values.remark,
      } as any);
      const vo = res?.data ?? {};

      if (vo.success) {
        // needPoll=true 只代表微信「已受理退款任务」，钱还没到账。
        // 这里必须显示「处理中」，显示「已退款」会让客服停止跟进。
        if (vo.needPoll) {
          message.warning(
            `退款已受理，正在处理中（退款单号 ${vo.mchRefundId || '--'}），请稍后刷新查看终态`,
          );
        } else {
          message.success('退款已完成');
        }
        setRefundOpen(false);
        actionRef.current?.reload();
        return;
      }

      // 业务失败：后端不抛异常，code 在 data 里
      switch (vo.code) {
        case RewardErrorCode.UNKNOWN_OUTCOME:
          // 最危险的一档：受理结果未知。重复发起可能退两次钱。
          Modal.error({
            title: '受理结果未知，请勿重复发起',
            content: (
              <div>
                <p>微信侧未明确受理成功或失败，订单已保持「退款中」，系统会自动轮询确认终态。</p>
                <p>
                  退款单号：<Typography.Text copyable>{vo.mchRefundId || '--'}</Typography.Text>
                </p>
                <p>
                  在轮询出结果前，<b>不要</b>再次点击退款。
                </p>
              </div>
            ),
          });
          setRefundOpen(false);
          actionRef.current?.reload();
          break;
        case RewardErrorCode.SESSION_KEY_INVALID:
          message.error('用户登录态已失效，需引导用户重新打开小程序后再发起退款');
          break;
        case RewardErrorCode.OUT_OF_WINDOW:
          message.error('已超出可退窗口（官方硬限制 365 天），请走线下处理');
          break;
        case RewardErrorCode.QUERY_FAILED:
          message.error('查询微信侧可退余额失败，无法确认退款金额，请稍后重试');
          break;
        default:
          message.error(vo.message || '退款失败');
      }
    } catch {
      // 拦截器已提示
    } finally {
      setSubmitting(false);
    }
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

  // 预览结论：leftFeeFen 为 null 表示「没查到」，不是 0，必须据此禁用退款按钮
  const previewUnknown = preview && !preview.querySucceeded;
  const canSubmitRefund = !!preview?.refundable && !previewUnknown;

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
      <Modal
        title={`发起退款 · ${refundTarget?.outTradeNo ?? ''}`}
        open={refundOpen}
        onCancel={() => setRefundOpen(false)}
        onOk={submitRefund}
        okText="确认退款"
        okButtonProps={{ danger: true, disabled: !canSubmitRefund, loading: submitting }}
        destroyOnClose
        width={620}
      >
        <Spin spinning={previewLoading}>
          {!preview ? (
            <Alert
              type="error"
              showIcon
              message="无法获取可退余额"
              description="未能从微信侧查到 left_fee，禁止用本地金额猜测退款金额。请稍后重试。"
            />
          ) : (
            <>
              {previewUnknown && (
                <Alert
                  type="error"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="微信侧查询失败，无法确认最多可退多少"
                  description={`错误码 ${preview.queryErrCode ?? '--'}：${preview.queryErrMsg ?? '--'}。可退余额为空表示「没查到」，不是 0，因此已禁用退款按钮。`}
                />
              )}
              {!preview.refundable && !previewUnknown && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="该订单当前不可退款"
                  description={preview.reason || '订单状态不允许退款'}
                />
              )}
              <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
                <Descriptions.Item label="订单状态">
                  {preview.orderStatusText ??
                    RewardOrderStatusLabel[
                      preview.orderStatus as keyof typeof RewardOrderStatusLabel
                    ] ??
                    '--'}
                </Descriptions.Item>
                <Descriptions.Item label="实付金额">
                  <Money fen={preview.actualPriceFen} />
                </Descriptions.Item>
                <Descriptions.Item label="微信侧可退余额">
                  <Money fen={preview.leftFeeFen} />
                </Descriptions.Item>
                <Descriptions.Item label="本次最多可退">
                  <Money fen={preview.maxRefundFen} />
                </Descriptions.Item>
                <Descriptions.Item label="支付时间">{fmtTime(preview.paidTime)}</Descriptions.Item>
                <Descriptions.Item label="距支付天数">
                  {preview.daysSincePaid ?? '--'} 天
                  {preview.overWindow ? '（已超 365 天可退窗口）' : ''}
                </Descriptions.Item>
              </Descriptions>

              <Form form={refundForm} layout="vertical" disabled={!canSubmitRefund}>
                <Form.Item
                  name="refundFeeYuan"
                  label="退款金额（元）"
                  extra={
                    preview.maxRefundFen != null
                      ? `留空表示全额退款。最多可退 ${fenToYuan(preview.maxRefundFen)} 元`
                      : '留空表示全额退款'
                  }
                  rules={[
                    {
                      validator: (_, value) => {
                        if (value === undefined || value === null || value === '') {
                          return Promise.resolve();
                        }
                        const fen = Math.round(Number(value) * 100);
                        if (!Number.isFinite(fen) || fen <= 0) {
                          return Promise.reject(new Error('退款金额必须大于 0'));
                        }
                        if (preview.maxRefundFen != null && fen > preview.maxRefundFen) {
                          return Promise.reject(
                            new Error(
                              `不得超过微信侧可退余额 ${fenToYuan(preview.maxRefundFen)} 元`,
                            ),
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  {/**
                   * 故意不设 min/max：rc-input-number 遇到越界值会「显示但不提交」，
                   * 结果是界面显示 99.99、表单值仍是 undefined（= 全额退款），
                   * 校验器也就永远不会被触发。
                   * 越界拦截交给上面的 validator + submitRefund 的请求体闸门，
                   * 两者都基于表单真实值，语义一致且可测。
                   */}
                  <InputNumber
                    precision={2}
                    step={1}
                    style={{ width: '100%' }}
                    placeholder="留空 = 全额退款"
                  />
                </Form.Item>
                <Form.Item
                  name="refundReason"
                  label="退款原因"
                  rules={[{ required: true, message: '请选择退款原因' }]}
                  extra="微信要求的固定枚举，会进入退款审计，不可自定义"
                >
                  <Select options={RefundReasonOptions} placeholder="请选择退款原因" />
                </Form.Item>
                <Form.Item name="reqFrom" label="退款来源" initialValue="1">
                  <Select
                    options={[
                      { label: '1 · 用户自主申请', value: '1' },
                      { label: '2 · 客服代客申请', value: '2' },
                      { label: '3 · 系统自动', value: '3' },
                    ]}
                  />
                </Form.Item>
                <Form.Item
                  name="remark"
                  label="备注"
                  rules={[{ max: 200, message: '备注不超过 200 字' }]}
                >
                  <Input.TextArea rows={2} placeholder="选填，会记入操作日志" />
                </Form.Item>
              </Form>

              <Alert
                type="info"
                showIcon
                message="受理成功 ≠ 退款到账"
                description="微信 refund_order 只是启动退款任务，终态由轮询任务或退款推送确认。提交后若提示「处理中」，订单会停在「退款中」，请勿重复发起。"
              />
            </>
          )}
        </Spin>
      </Modal>
    </>
  );
};

export default RewardOrder;
