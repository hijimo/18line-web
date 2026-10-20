/**
 * 打赏 / 达人鼓励 退款弹窗（资金动作，**两个页面共用**）
 *
 * ## 为什么必须是共用组件，而不是在达人页再写一份
 *
 * 退款的难点全在「金额与终态语义」上，而这些语义只有一份真相：
 * - 可退余额取微信侧 `left_fee`，**不能**用本地实付金额猜（两者可能不同）；
 * - `leftFeeFen === null` 是「没查到」，不是 0，必须禁用提交；
 * - 元 → 分必须 `Math.round`（浮点误差会让金额差 1 分，微信精确校验会报 268490016）；
 * - `refundFeeFen === undefined` 在后端语义里等于**全额退款**，所以出网前还要再校一遍
 *   实际请求体（rc-input-number 对越界输入不触发 onChange，「界面显示 99.99、表单值却是
 *   undefined」是真实会出现的状态）；
 * - `needPoll=true` 只代表微信「已受理」，必须提示「处理中」而不是「已退款」，
 *   否则客服会停止跟进；
 * - `code=4016` 受理结果未知时**必须阻止重复发起**（重复点击可能退两次钱）。
 *
 * 这些规则写两遍，第二遍就会漂移，而漂移的代价是真金白银。所以既有「打赏订单」页
 * （线路打赏）与「达人鼓励订单」页共用本组件 —— 本文件是从 `pages/RewardOrder/index.tsx`
 * **原样搬迁**的，金额闸门与三态文案逐字未改，只把 `refundTarget/refundOpen/refundForm/
 * actionRef.reload` 换成了 props。
 *
 * ## 与「退款不按来源分页」（设计文档 §15.6）的关系
 *
 * §15.6 担心的是「运营要在两个页面之间来回找单，容易漏退」。这里用**列表互补**满足同一目标：
 * - 「打赏订单」页 = `expert_route_id IS NULL`（XML 硬编码，不可被参数关闭）
 * - 「达人鼓励订单」页 = `expert_route_id IS NOT NULL`（同样硬编码）
 *
 * 两个条件恰好互补 → 每一笔单**必然且只在其中一个页面出现**，不存在「两页都查不到」的单。
 * 退款接口本身（`/travel18/reward/refund/*`）按 `outTradeNo` 定位、**不区分来源**，
 * 两个入口调用的是同一条后端链路，不存在口径分叉。
 *
 * ## 权限
 *
 * 后端三个退款端点都是 `@ss.hasPermi('travel18:reward:refund')`，**该权限串不授予 daren**。
 * 前端可见性由各页面自己 gate（达人页额外叠一层 `!isDaren` 的 fail-closed 判定），
 * 本组件只负责「已经决定要退」之后的流程。
 */
import {
  Alert,
  Descriptions,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Spin,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { DATE_FORMAT_FULL_TIME } from '@/variables';
import { fenToYuan, RefundReasonOptions, RewardErrorCode, RewardOrderStatusLabel } from '@/enums';
import { get as getRewardRefundApi } from '@/services/api/打赏订单退款/打赏订单退款';
import { IosRefundGuide, isIosPlatform, showIosRefundGuide } from './iosRefundGuide';

const rewardRefundApi = getRewardRefundApi();

const fmtTime = (v?: string | Date | null) => (v ? dayjs(v).format(DATE_FORMAT_FULL_TIME) : '--');

/** 金额（分）展示。资金数字必须带单位，避免财务把「分」当「元」 */
const Money: React.FC<{ fen?: number | null; suffix?: string }> = ({ fen, suffix = '元' }) => (
  <span className="nowrap">
    {fen === null || fen === undefined ? '--' : `${fenToYuan(fen)} ${suffix}`}
  </span>
);

export type RewardRefundTarget = {
  /** 退款唯一定位键：后端 preview / apply 都按它走，不区分线路单与达人鼓励单 */
  outTradeNo: string;
  /** 可选：标题里的来源标识，避免运营在两个页面之间搞混这笔单是谁的 */
  sourceLabel?: string;
};

export type RewardRefundModalProps = {
  open: boolean;
  target: RewardRefundTarget | null;
  onClose: () => void;
  /** 退款受理成功（含「处理中」与「受理结果未知」两种非失败终态）后回调，页面据此刷新列表 */
  onSuccess: () => void;
};

const RewardRefundModal: React.FC<RewardRefundModalProps> = ({
  open,
  target,
  onClose,
  onSuccess,
}) => {
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [form] = Form.useForm();

  /**
   * 打开时拉预览。依赖 `open` 与 `outTradeNo` 两个值：
   * 只依赖 `open` 会在「弹窗未关就换了一笔单」时不刷新；
   * 只依赖 `outTradeNo` 会在同一笔单二次打开时不重新查微信侧余额（余额可能已变）。
   */
  useEffect(() => {
    if (!open || !target?.outTradeNo) return undefined;
    let cancelled = false;
    setPreview(null);
    form.resetFields();
    setPreviewLoading(true);
    (async () => {
      try {
        const res: any = await rewardRefundApi.rewardRefundPreview({
          outTradeNo: target.outTradeNo,
        });
        const vo = res?.code === 200 ? res.data : null;
        if (cancelled) return;
        setPreview(vo);
        if (vo?.refundable) {
          // 默认全额退款：微信侧可退余额 leftFeeFen（不是本地实付金额，两者可能不同）
          form.setFieldsValue({
            refundFeeYuan: vo.maxRefundFen != null ? vo.maxRefundFen / 100 : undefined,
            refundReason: '3',
          });
        }
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, target?.outTradeNo, form]);

  const submitRefund = async () => {
    let values: any;
    try {
      values = await form.validateFields();
    } catch {
      // 校验未通过：表单已就地标红，直接结束，避免抛出 unhandled rejection
      return;
    }
    if (!target?.outTradeNo) return;
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
        outTradeNo: target.outTradeNo,
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
        onClose();
        onSuccess();
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
          onClose();
          onSuccess();
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
        case RewardErrorCode.IOS_UNSUPPORTED:
          /**
           * 兜底：iOS 单正常走不到提交这一步。真走到这里说明 `platform` 是历史脏数据
           * （空串 / devtools / 人工改库）而后端按微信返回的 690000020 认出了它是 Apple 单。
           *
           * 不要把后端那段长文案塞进 `message.error`：toast 三秒就消失，
           * 几百字的指引没人读得完，读完也点不了链接。改成常驻弹窗 + 可点链接。
           * 不调 `onSuccess`：订单状态没有任何变化，刷新列表只会让人以为发生了什么。
           */
          showIosRefundGuide(target.outTradeNo);
          onClose();
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

  // 预览结论：leftFeeFen 为 null 表示「没查到」，不是 0，必须据此禁用退款按钮
  const previewUnknown = preview && !preview.querySucceeded;
  /**
   * iOS（Apple 支付）单的兜底判定。
   *
   * 正常情况下 iOS 单在列表页点「退款」时就被 `showIosRefundGuide` 拦下，根本进不到这里。
   * 保留这一层是因为弹窗还可能被别的入口打开，而后端预览对 iOS 单返回的是
   * `refundable=false` + 一大段原因文字 —— 直接渲染出来是「不可退 + 长文本」，
   * 而不是「去用户侧办 + 官方链接」。这里换成同一份引导组件，保证两条路径说法一致。
   */
  const iosUnsupported = isIosPlatform(preview?.platform);
  const canSubmitRefund = !!preview?.refundable && !previewUnknown && !iosUnsupported;

  return (
    <Modal
      title={`发起退款 · ${target?.sourceLabel ? `${target.sourceLabel} · ` : ''}${target?.outTradeNo ?? ''}`}
      open={open}
      onCancel={() => onClose()}
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
        ) : iosUnsupported ? (
          <IosRefundGuide outTradeNo={target?.outTradeNo} />
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

            <Form form={form} layout="vertical" disabled={!canSubmitRefund}>
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
                          new Error(`不得超过微信侧可退余额 ${fenToYuan(preview.maxRefundFen)} 元`),
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
  );
};

export default RewardRefundModal;
