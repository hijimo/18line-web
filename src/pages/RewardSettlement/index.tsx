import { PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  DatePicker,
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
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { DATE_FORMAT_FULL_TIME } from '@/variables';
import { key, option } from '@/configurify/columns/baseColumns';
import {
  fenToYuan,
  PayableStatusColor,
  PayableStatusLabel,
  SettleErrorCode,
  SettleStatusColor,
  SettleStatusDesc,
  SettleStatusEnum,
  SettleStatusLabel,
  TerminalGroupColor,
  TerminalGroupLabel,
  TerminalGroupOptions,
  TerminalGroupShortLabel,
} from '@/enums';
import { get as getSettleApi } from '@/services/api/打赏商家结算/打赏商家结算';

const settleApi = getSettleApi();

const STATUS_OPTIONS = Object.entries(SettleStatusLabel).map(([value, label]) => ({
  label,
  value,
}));

const fmtTime = (v?: string | Date | null) => (v ? dayjs(v).format(DATE_FORMAT_FULL_TIME) : '--');
const fmtDate = (v?: string | Date | null) => (v ? dayjs(v).format('YYYY-MM-DD') : '--');

const Money: React.FC<{ fen?: number | null }> = ({ fen }) => (
  <span className="nowrap">{fen === null || fen === undefined ? '--' : `¥ ${fenToYuan(fen)}`}</span>
);

/**
 * 结算业务错误的文案分派。
 *
 * 后端业务失败**不抛异常**：HTTP 200 + AjaxResult.data.code = 4020~4032，
 * 所以 request 拦截器不会拦下来，必须在这里逐码给出「下一步该做什么」，
 * 而不是把后端的原始 message 直接甩给财务。
 */
const explainSettleError = (code: number, fallback?: string): string => {
  switch (code) {
    case SettleErrorCode.DISABLED:
      return '商家结算功能未开启（reward.settle.enabled=0）。需先与商家签好含 iOS 账期的结算协议并确认对公付款审批流程。';
    case SettleErrorCode.MERCHANT_INVALID:
      return '商户不可结算：不存在、未通过入驻审核、已停用，或对公账户信息缺失。请先在商户管理里补齐资料。';
    case SettleErrorCode.PERIOD_INVALID:
      return '账期非法：起止倒挂、账期尚未结束，或 iOS 账期未到可结算月份（iOS 提前结算等于平台垫资）。';
    case SettleErrorCode.BATCH_EXISTS:
      return '该商户该终端该账期已存在批次（含已作废批次）。作废后不允许重建同账期，请换一个账期区间。';
    case SettleErrorCode.NO_PAYABLE:
      return '账期内没有待结算的应付流水（可能已被其它批次抢占，或已全部被退款冲销）。';
    case SettleErrorCode.BELOW_MINIMUM:
      return '应付总额低于起结金额，留到下期累积后再生成。';
    case SettleErrorCode.STATE_INVALID:
      return '批次当前状态不允许该操作。状态机只能单向前进；已转账批次不可作废，只能下期抵扣或红冲。';
    case SettleErrorCode.AMOUNT_MISMATCH:
      return '金额不一致：转账金额必须等于批次应付总额，发票金额必须等于已付金额。不支持部分转账与部分开票。';
    case SettleErrorCode.CONFLICT:
      return '并发冲突：流水被另一个批次抢走，本次批次已整体回滚。请重新生成（不是「部分成功」）。';
    case SettleErrorCode.TRANSFER_NO_DUPLICATED:
      return '该银行流水号已被其它批次登记。一笔转账只能对应一个批次，合并付款请拆笔。';
    case SettleErrorCode.BATCH_NOT_FOUND:
      return '批次不存在，可能已被其他人处理，请刷新列表。';
    case SettleErrorCode.BATCH_BROKEN:
      return '批次内有订单在确认之后被退款冲销，账面已不可信。禁止继续转账，必须作废批次重新生成。';
    default:
      return fallback || '操作失败';
  }
};

const RewardSettlement: React.FC = () => {
  const actionRef = useRef<any>(null);

  // ---- 生成批次 ----
  const [genOpen, setGenOpen] = useState(false);
  const [genForm] = Form.useForm();
  const [preview, setPreview] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);
  const [generating, setGenerating] = useState(false);

  // ---- 明细抽屉 ----
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailBatch, setDetailBatch] = useState<any>(null);
  const [detailPayables, setDetailPayables] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // ---- 转账 / 发票 ----
  const [payModal, setPayModal] = useState<'transfer' | 'invoice' | null>(null);
  const [payTarget, setPayTarget] = useState<any>(null);
  const [payForm] = Form.useForm();
  const [paySubmitting, setPaySubmitting] = useState(false);

  // ---- 作废 ----
  const [voidTarget, setVoidTarget] = useState<any>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidSubmitting, setVoidSubmitting] = useState(false);

  const request = useTableRequest(settleApi.settleBatchList as any);

  // ==================== 生成批次 ====================

  const readGenForm = async () => {
    const v = await genForm.validateFields();
    const [start, end] = v.period || [];
    return {
      merchantId: v.merchantId,
      terminalGroup: v.terminalGroup,
      // 后端 @JsonFormat(pattern = "yyyy-MM-dd")，必须传字符串而不是 Date/ISO
      periodStart: start ? dayjs(start).format('YYYY-MM-DD') : undefined,
      periodEnd: end ? dayjs(end).format('YYYY-MM-DD') : undefined,
      remark: v.remark,
    } as any;
  };

  /**
   * 读表单并做校验。校验不通过时返回 null，由调用方直接结束——
   * validateFields 是 reject 语义，不接住就是一条 unhandled rejection，
   * 而界面上其实已经把必填项标红了，不需要再报一次错。
   */
  const readGenFormSafe = async () => {
    try {
      return await readGenForm();
    } catch {
      return null;
    }
  };

  const doPreview = async () => {
    const dto = await readGenFormSafe();
    if (!dto) return;
    setPreviewing(true);
    setPreview(null);
    try {
      const res: any = await settleApi.settleBatchPreview(dto);
      setPreview(res?.code === 200 ? res.data : { code: res?.code, reason: res?.msg });
    } catch {
      // 拦截器已提示
    } finally {
      setPreviewing(false);
    }
  };

  const doGenerate = async () => {
    const dto = await readGenFormSafe();
    if (!dto) return;
    setGenerating(true);
    try {
      const res: any = await settleApi.settleBatchGenerate(dto);
      const vo = res?.code === 200 ? res.data : null;
      if (vo?.success) {
        message.success(vo.message || '批次已生成');
        setGenOpen(false);
        setPreview(null);
        genForm.resetFields();
        actionRef.current?.reload();
      } else {
        message.error(explainSettleError(vo?.code ?? res?.code, vo?.message ?? res?.msg));
      }
    } catch {
      // 拦截器已提示
    } finally {
      setGenerating(false);
    }
  };

  const doMonthly = async () => {
    try {
      const res: any = await settleApi.settleBatchMonthly();
      const summary = res?.code === 200 ? res.data : null;
      Modal.info({
        title: '月结执行结果',
        width: 560,
        content: summary ? (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="合格商户数">{summary.merchantCount ?? 0}</Descriptions.Item>
            <Descriptions.Item label="生成批次数">{summary.generatedCount ?? 0}</Descriptions.Item>
            <Descriptions.Item label="跳过（无待结算流水）">
              {summary.skippedNoPayableCount ?? 0}
            </Descriptions.Item>
            <Descriptions.Item label="跳过（低于起结金额）">
              {summary.skippedBelowMinimumCount ?? 0}
            </Descriptions.Item>
            <Descriptions.Item label="失败">{summary.failedCount ?? 0}</Descriptions.Item>
            <Descriptions.Item label="耗时">{summary.elapsedMs ?? '--'} ms</Descriptions.Item>
            {summary.details?.length ? (
              <Descriptions.Item label="明细">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {summary.details.map((d: any, i: number) => (
                    <li key={i}>
                      {d.merchantName ?? d.merchantId} · {d.terminalGroup} ·{' '}
                      {d.success ? `已生成 ${d.batchNo}` : d.message}
                    </li>
                  ))}
                </ul>
              </Descriptions.Item>
            ) : null}
          </Descriptions>
        ) : (
          <Alert type="warning" showIcon message={res?.msg || '月结未返回结果'} />
        ),
      });
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示
    }
  };

  // ==================== 状态推进 ====================

  /** 统一的「推进类」操作：confirm / complete。业务失败不抛异常，code 在 data 里 */
  const advance = async (fn: () => Promise<any>, okText: string) => {
    try {
      const res: any = await fn();
      const vo = res?.code === 200 ? res.data : null;
      if (vo?.success) {
        message.success(vo.message || okText);
        actionRef.current?.reload();
        return true;
      }
      const code = vo?.code ?? res?.code;
      // 4032 必须单独强调：这是「钱可能已经比批次金额少」的资损信号
      if (code === SettleErrorCode.BATCH_BROKEN) {
        Modal.error({
          title: '批次账面已不可信，禁止继续付款',
          content: explainSettleError(SettleErrorCode.BATCH_BROKEN),
        });
      } else {
        message.error(explainSettleError(code, vo?.message ?? res?.msg));
      }
      actionRef.current?.reload();
      return false;
    } catch {
      return false;
    }
  };

  const openPay = (kind: 'transfer' | 'invoice', record: any) => {
    setPayTarget(record);
    setPayModal(kind);
    payForm.resetFields();
    if (kind === 'transfer') {
      // 不支持部分转账：金额预填为批次应付总额，且校验必须相等。
      // 有差额只能先作废批次重来，页面不给出「改金额」的空间。
      payForm.setFieldsValue({
        transferAmountYuan: record.totalFen != null ? record.totalFen / 100 : undefined,
        transferTime: dayjs(),
      });
    } else {
      payForm.setFieldsValue({
        invoiceAmountYuan: record.paidFen != null ? record.paidFen / 100 : undefined,
        invoiceTime: dayjs(),
      });
    }
  };

  const submitPay = async () => {
    let v: any;
    try {
      v = await payForm.validateFields();
    } catch {
      // 校验未通过：表单已就地标红，这里直接结束，避免 unhandled rejection
      return;
    }
    if (!payTarget) return;
    setPaySubmitting(true);
    const isTransfer = payModal === 'transfer';
    const dto: any = isTransfer
      ? {
          batchId: payTarget.batchId,
          transferNo: v.transferNo.trim(),
          transferAmountFen: Math.round(Number(v.transferAmountYuan) * 100),
          transferTime: v.transferTime
            ? dayjs(v.transferTime).format('YYYY-MM-DD HH:mm:ss')
            : undefined,
          transferVoucher: v.transferVoucher,
        }
      : {
          batchId: payTarget.batchId,
          invoiceNo: v.invoiceNo.trim(),
          invoiceAmountFen: Math.round(Number(v.invoiceAmountYuan) * 100),
          invoiceTime: v.invoiceTime
            ? dayjs(v.invoiceTime).format('YYYY-MM-DD HH:mm:ss')
            : undefined,
          invoiceUrl: v.invoiceUrl,
        };
    try {
      const res: any = await (isTransfer
        ? settleApi.settleBatchTransfer(dto)
        : settleApi.settleBatchInvoice(dto));
      const vo = res?.code === 200 ? res.data : null;
      if (vo?.success) {
        message.success(vo.message || (isTransfer ? '转账已登记' : '发票已登记'));
        setPayModal(null);
        actionRef.current?.reload();
      } else {
        message.error(explainSettleError(vo?.code ?? res?.code, vo?.message ?? res?.msg));
      }
    } catch {
      // 拦截器已提示
    } finally {
      setPaySubmitting(false);
    }
  };

  const submitVoid = async () => {
    if (!voidTarget) return;
    if (!voidReason.trim()) {
      message.error('作废原因必填（资金批次不允许无痕撤销）');
      return;
    }
    setVoidSubmitting(true);
    try {
      const res: any = await settleApi.settleBatchVoid(
        { batchId: voidTarget.batchId },
        { reason: voidReason.trim() },
      );
      const vo = res?.code === 200 ? res.data : null;
      if (vo?.success) {
        message.success(vo.message || '批次已作废');
        setVoidTarget(null);
        setVoidReason('');
        actionRef.current?.reload();
      } else {
        message.error(explainSettleError(vo?.code ?? res?.code, vo?.message ?? res?.msg));
      }
    } catch {
      // 拦截器已提示
    } finally {
      setVoidSubmitting(false);
    }
  };

  // ==================== 明细 ====================

  const openDetail = async (record: any) => {
    setDetailBatch(record);
    setDetailPayables([]);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const [batchRes, payRes] = await Promise.all([
        settleApi.settleBatchDetail({ batchId: record.batchId }) as any,
        settleApi.settleBatchPayables({ batchId: record.batchId } as any) as any,
      ]);
      if (batchRes?.code === 200) setDetailBatch(batchRes.data);
      setDetailPayables(payRes?.rows ?? []);
    } catch {
      // 拦截器已提示
    } finally {
      setDetailLoading(false);
    }
  };

  // ==================== 列 ====================

  const columns = [
    key,
    {
      title: '批次号',
      dataIndex: 'batchNo',
      width: 190,
      search: false,
      render: (_: any, r: any) => (
        <Typography.Text copyable={{ text: r.batchNo }}>{r.batchNo}</Typography.Text>
      ),
    },
    {
      title: '商户',
      dataIndex: 'merchantName',
      width: 180,
      ellipsis: true,
      render: (_: any, r: any) => r.merchantName ?? `#${r.merchantId ?? '--'}`,
    },
    { title: '商户ID', dataIndex: 'merchantId', width: 100, hideInTable: true },
    {
      title: '终端分组',
      dataIndex: 'terminalGroup',
      width: 110,
      valueType: 'select',
      fieldProps: { options: TerminalGroupOptions },
      render: (_: any, r: any) => (
        <Tag color={TerminalGroupColor[r.terminalGroup]}>
          {TerminalGroupShortLabel[r.terminalGroup as keyof typeof TerminalGroupShortLabel] ??
            r.terminalGroup ??
            '--'}
        </Tag>
      ),
    },
    {
      title: '账期',
      dataIndex: 'period',
      width: 200,
      search: false,
      render: (_: any, r: any) => `${fmtDate(r.periodStart)} ~ ${fmtDate(r.periodEnd)}`,
    },
    { title: '笔数', dataIndex: 'orderCount', width: 80, search: false, align: 'right' },
    {
      title: '订单金额',
      dataIndex: 'orderAmountFen',
      width: 120,
      search: false,
      align: 'right',
      render: (_: any, r: any) => <Money fen={r.orderAmountFen} />,
    },
    {
      title: '应付总额',
      dataIndex: 'totalFen',
      width: 120,
      search: false,
      align: 'right',
      render: (_: any, r: any) => (
        <b>
          <Money fen={r.totalFen} />
        </b>
      ),
    },
    {
      title: '已付',
      dataIndex: 'paidFen',
      width: 120,
      search: false,
      align: 'right',
      render: (_: any, r: any) => <Money fen={r.paidFen} />,
    },
    {
      title: '状态',
      dataIndex: 'batchStatus',
      width: 100,
      valueType: 'select',
      fieldProps: { options: STATUS_OPTIONS },
      valueEnum: SettleStatusDesc as any,
      render: (_: any, r: any) => (
        <Tag color={SettleStatusColor[r.batchStatus]}>
          {SettleStatusLabel[r.batchStatus as keyof typeof SettleStatusLabel] ?? r.batchStatus}
        </Tag>
      ),
    },
    { title: '银行流水号', dataIndex: 'transferNo', width: 160, search: false, ellipsis: true },
    { title: '发票号', dataIndex: 'invoiceNo', width: 140, search: false, ellipsis: true },
    { title: '生成人', dataIndex: 'createBy', width: 100, search: false },
    {
      title: '确认人',
      dataIndex: 'confirmBy',
      width: 100,
      search: false,
      render: (_: any, r: any) => r.confirmBy ?? '--',
    },
    {
      title: '转账人',
      dataIndex: 'transferBy',
      width: 100,
      search: false,
      render: (_: any, r: any) => r.transferBy ?? '--',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 170,
      search: false,
      render: (_: any, r: any) => fmtTime(r.createTime),
    },
    {
      ...option,
      width: 220,
      render: (_: any, record: any) => {
        const s = record.batchStatus;
        return (
          <Space size={4} wrap>
            <a onClick={() => openDetail(record)}>明细</a>
            {s === SettleStatusEnum.PENDING_CONFIRM && (
              <Popconfirm
                title="确认这个批次可以付款？"
                description="确认后将锁定账面，批次内若有订单退款会被拦截。生成与确认应由不同的人操作（四眼原则）。"
                onConfirm={() =>
                  advance(
                    () => settleApi.settleBatchConfirm({ batchId: record.batchId }) as any,
                    '已确认',
                  )
                }
              >
                <a>确认</a>
              </Popconfirm>
            )}
            {s === SettleStatusEnum.PENDING_TRANSFER && (
              <a onClick={() => openPay('transfer', record)}>登记转账</a>
            )}
            {s === SettleStatusEnum.TRANSFERRED && (
              <a onClick={() => openPay('invoice', record)}>登记发票</a>
            )}
            {s === SettleStatusEnum.INVOICED && (
              <Popconfirm
                title="复核并归档这个批次？"
                onConfirm={() =>
                  advance(
                    () => settleApi.settleBatchComplete({ batchId: record.batchId }) as any,
                    '已归档',
                  )
                }
              >
                <a>复核归档</a>
              </Popconfirm>
            )}
            {(s === SettleStatusEnum.PENDING_CONFIRM ||
              s === SettleStatusEnum.PENDING_TRANSFER) && (
              <a
                style={{ color: '#ff4d4f' }}
                onClick={() => {
                  setVoidTarget(record);
                  setVoidReason('');
                }}
              >
                作废
              </a>
            )}
          </Space>
        );
      },
    },
  ];

  const payableColumns = [
    { title: '流水号', dataIndex: 'payableNo', width: 170 },
    { title: '业务订单号', dataIndex: 'outTradeNo', width: 190 },
    { title: '线路ID', dataIndex: 'lineId', width: 90 },
    {
      title: '订单金额',
      dataIndex: 'orderAmountFen',
      width: 110,
      align: 'right' as const,
      render: (v: number) => <Money fen={v} />,
    },
    {
      title: '分成率',
      dataIndex: 'shareRate',
      width: 90,
      render: (v: any) => (v != null ? `${v} %` : '--'),
    },
    {
      title: '应付金额',
      dataIndex: 'amountFen',
      width: 110,
      align: 'right' as const,
      render: (v: number) => (
        <b>
          <Money fen={v} />
        </b>
      ),
    },
    {
      title: '状态',
      dataIndex: 'payStatus',
      width: 100,
      render: (v: string) => (
        <Tag color={PayableStatusColor[v]}>
          {PayableStatusLabel[v as keyof typeof PayableStatusLabel] ?? v}
        </Tag>
      ),
    },
    { title: '作废原因', dataIndex: 'voidReason', ellipsis: true, render: (v: any) => v ?? '--' },
  ];

  const previewSettleable = preview?.settleable === true;

  return (
    <>
      <CommonTable<any, any>
        actionRef={actionRef}
        rowKey="batchId"
        headerTitle="打赏结算批次"
        columns={columns as any}
        request={request as any}
        pagination={{ defaultPageSize: 20, showSizeChanger: true }}
        toolBarRender={() => [
          <Button
            key="gen"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setGenOpen(true);
              setPreview(null);
              genForm.resetFields();
            }}
          >
            生成批次
          </Button>,
          <Popconfirm
            key="monthly"
            title="手工触发一轮月结？"
            description="为所有合格商户生成上一自然月的待确认批次（安卓与 iOS 分开）。只改账面不付钱。"
            onConfirm={doMonthly}
          >
            <Button>手工月结</Button>
          </Popconfirm>,
        ]}
        options={{ density: true, reload: true, setting: true }}
      />

      {/* ---------- 生成批次 ---------- */}
      <Modal
        title="生成结算批次"
        open={genOpen}
        onCancel={() => setGenOpen(false)}
        width={680}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={() => setGenOpen(false)}>
            取消
          </Button>,
          <Button key="preview" loading={previewing} onClick={doPreview}>
            预览
          </Button>,
          <Button
            key="ok"
            type="primary"
            loading={generating}
            disabled={!previewSettleable}
            onClick={doGenerate}
          >
            确认生成
          </Button>,
        ]}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="生成批次只冻结账面，不会付钱"
          description="批次金额以「抢占流水之后的真实合计」为准，预览金额仅供参考。生成后如需重做必须作废，且同账期不允许重建。"
        />
        <Form form={genForm} layout="vertical">
          <Form.Item
            name="merchantId"
            label="商户ID"
            rules={[{ required: true, message: '请输入商户ID' }]}
            extra="商户管理页尚未上线，暂用 ID 输入；预览会回显商户名与对公账户（账号仅后 4 位）以供核对"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              precision={0}
              placeholder="请输入商户ID"
            />
          </Form.Item>
          <Form.Item
            name="terminalGroup"
            label="终端分组"
            rules={[{ required: true, message: '请选择终端分组' }]}
            extra="iOS 与安卓必须分批：安卓 T+3 到平台账，iOS 要等 Apple 45~60 天，混在一批等于平台垫资"
          >
            <Select
              placeholder="请选择终端分组"
              options={Object.entries(TerminalGroupLabel).map(([value, label]) => ({
                label,
                value,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="period"
            label="账期"
            rules={[{ required: true, message: '请选择账期起止日' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="remark"
            label="备注"
            rules={[{ max: 200, message: '备注不超过 200 字' }]}
          >
            <Input.TextArea rows={2} placeholder="选填" />
          </Form.Item>
        </Form>

        <Spin spinning={previewing}>
          {preview && (
            <>
              <Alert
                type={previewSettleable ? 'success' : 'error'}
                showIcon
                style={{ marginBottom: 12 }}
                message={previewSettleable ? '可以生成批次' : '不可生成'}
                description={
                  previewSettleable ? undefined : explainSettleError(preview.code, preview.reason)
                }
              />
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="商户">
                  {preview.merchantName ?? `#${preview.merchantId ?? '--'}`}
                </Descriptions.Item>
                <Descriptions.Item label="终端分组">
                  {TerminalGroupShortLabel[
                    preview.terminalGroup as keyof typeof TerminalGroupShortLabel
                  ] ??
                    preview.terminalGroup ??
                    '--'}
                </Descriptions.Item>
                <Descriptions.Item label="账期" span={2}>
                  {fmtDate(preview.periodStart)} ~ {fmtDate(preview.periodEnd)}
                </Descriptions.Item>
                <Descriptions.Item label="待结算笔数">
                  {preview.payableCount ?? 0}
                </Descriptions.Item>
                <Descriptions.Item label="起结金额">
                  <Money fen={preview.minAmountFen} />
                </Descriptions.Item>
                <Descriptions.Item label="订单金额合计">
                  <Money fen={preview.totalOrderAmountFen} />
                </Descriptions.Item>
                <Descriptions.Item label="应付合计">
                  <b>
                    <Money fen={preview.totalAmountFen} />
                  </b>
                </Descriptions.Item>
                <Descriptions.Item label="开户名">
                  {preview.bankAccountName ?? '--'}
                </Descriptions.Item>
                <Descriptions.Item label="开户行">{preview.bankName ?? '--'}</Descriptions.Item>
                <Descriptions.Item label="银行账号" span={2}>
                  {preview.bankAccountNo ?? '--'}（仅显示后 4 位，完整账号请走线下审批流程核对）
                </Descriptions.Item>
                <Descriptions.Item label="开票能力" span={2}>
                  {preview.invoiceCapability === '0'
                    ? '⚠️ 该商户未登记开票能力，分成无法税前扣除，不应结算'
                    : (preview.invoiceCapability ?? '--')}
                </Descriptions.Item>
              </Descriptions>
            </>
          )}
        </Spin>
      </Modal>

      {/* ---------- 登记转账 / 发票 ---------- */}
      <Modal
        title={payModal === 'transfer' ? '登记对公转账' : '登记商家发票'}
        open={!!payModal}
        onCancel={() => setPayModal(null)}
        onOk={submitPay}
        okText="确认登记"
        confirmLoading={paySubmitting}
        destroyOnClose
        width={560}
      >
        {payTarget && (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="批次号">{payTarget.batchNo}</Descriptions.Item>
              <Descriptions.Item label="商户">
                {payTarget.merchantName ?? `#${payTarget.merchantId}`} ·{' '}
                {
                  TerminalGroupShortLabel[
                    payTarget.terminalGroup as keyof typeof TerminalGroupShortLabel
                  ]
                }
              </Descriptions.Item>
              <Descriptions.Item label="账期">
                {fmtDate(payTarget.periodStart)} ~ {fmtDate(payTarget.periodEnd)}
              </Descriptions.Item>
              <Descriptions.Item label="笔数">{payTarget.orderCount}</Descriptions.Item>
              <Descriptions.Item label="应付总额">
                <b>
                  <Money fen={payTarget.totalFen} />
                </b>
              </Descriptions.Item>
              {payModal === 'invoice' && (
                <Descriptions.Item label="已付金额">
                  <Money fen={payTarget.paidFen} />
                </Descriptions.Item>
              )}
            </Descriptions>

            <Form form={payForm} layout="vertical">
              {payModal === 'transfer' ? (
                <>
                  <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 12 }}
                    message="不支持部分转账"
                    description="转账金额必须等于批次应付总额。若实际付款有差额，必须先作废批次、核清账面后重新生成。"
                  />
                  <Form.Item
                    name="transferNo"
                    label="银行流水号"
                    rules={[
                      { required: true, message: '请输入银行流水号' },
                      { max: 64, message: '不超过 64 字' },
                    ]}
                    extra="一个流水号只能登记在一个批次上（数据库唯一约束），合并付款请拆笔"
                  >
                    <Input placeholder="请输入网银转账流水号" />
                  </Form.Item>
                  <Form.Item
                    name="transferAmountYuan"
                    label="转账金额（元）"
                    rules={[
                      { required: true, message: '请输入转账金额' },
                      {
                        validator: (_, value) =>
                          Math.round(Number(value) * 100) === payTarget.totalFen
                            ? Promise.resolve()
                            : Promise.reject(
                                new Error(
                                  `必须等于批次应付总额 ¥ ${fenToYuan(payTarget.totalFen)}`,
                                ),
                              ),
                      },
                    ]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0.01} precision={2} />
                  </Form.Item>
                  <Form.Item name="transferTime" label="转账时间">
                    <DatePicker showTime style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="transferVoucher" label="凭证地址" rules={[{ max: 500 }]}>
                    <Input placeholder="选填，回单图片/文件 URL" />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 12 }}
                    message="不支持部分开票"
                    description="发票金额必须等于已付金额。18线全额确认收入，商家开票是分成税前扣除的前提。"
                  />
                  <Form.Item
                    name="invoiceNo"
                    label="发票号"
                    rules={[
                      { required: true, message: '请输入发票号' },
                      { max: 64, message: '不超过 64 字' },
                    ]}
                  >
                    <Input placeholder="请输入发票号码" />
                  </Form.Item>
                  <Form.Item
                    name="invoiceAmountYuan"
                    label="发票金额（元）"
                    rules={[
                      { required: true, message: '请输入发票金额' },
                      {
                        validator: (_, value) =>
                          Math.round(Number(value) * 100) === payTarget.paidFen
                            ? Promise.resolve()
                            : Promise.reject(
                                new Error(`必须等于已付金额 ¥ ${fenToYuan(payTarget.paidFen)}`),
                              ),
                      },
                    ]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0.01} precision={2} />
                  </Form.Item>
                  <Form.Item name="invoiceTime" label="开票时间">
                    <DatePicker showTime style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="invoiceUrl" label="发票附件地址" rules={[{ max: 500 }]}>
                    <Input placeholder="选填" />
                  </Form.Item>
                </>
              )}
            </Form>
          </>
        )}
      </Modal>

      {/* ---------- 作废 ---------- */}
      <Modal
        title={`作废批次 · ${voidTarget?.batchNo ?? ''}`}
        open={!!voidTarget}
        onCancel={() => setVoidTarget(null)}
        onOk={submitVoid}
        okText="确认作废"
        okButtonProps={{ danger: true }}
        confirmLoading={voidSubmitting}
        destroyOnClose
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="作废会把批次内流水还原为待结算"
          description="其中「订单已退款」的流水会直接作废，不会回到待结算池。作废后同一账期不允许重建批次，需换一个账期区间。"
        />
        {voidTarget && (
          <Descriptions column={1} size="small" bordered style={{ marginBottom: 12 }}>
            <Descriptions.Item label="商户">
              {voidTarget.merchantName ?? `#${voidTarget.merchantId}`}
            </Descriptions.Item>
            <Descriptions.Item label="笔数 / 应付总额">
              {voidTarget.orderCount} 笔 · <Money fen={voidTarget.totalFen} />
            </Descriptions.Item>
          </Descriptions>
        )}
        <Form layout="vertical">
          <Form.Item label="作废原因" required>
            <Input.TextArea
              rows={3}
              value={voidReason}
              maxLength={480}
              showCount
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="必填，会永久记录在批次行上（资金批次不允许无痕撤销）"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ---------- 批次明细 ---------- */}
      <Drawer
        title="结算批次明细"
        width={1000}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        destroyOnClose
      >
        <Spin spinning={detailLoading}>
          {detailBatch && (
            <>
              <Descriptions column={3} size="small" bordered>
                <Descriptions.Item label="批次号" span={2}>
                  <Typography.Text copyable>{detailBatch.batchNo}</Typography.Text>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={SettleStatusColor[detailBatch.batchStatus]}>
                    {SettleStatusLabel[detailBatch.batchStatus as keyof typeof SettleStatusLabel] ??
                      detailBatch.batchStatus}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="商户">
                  {detailBatch.merchantName ?? `#${detailBatch.merchantId}`}
                </Descriptions.Item>
                <Descriptions.Item label="终端分组">
                  <Tag color={TerminalGroupColor[detailBatch.terminalGroup]}>
                    {TerminalGroupShortLabel[
                      detailBatch.terminalGroup as keyof typeof TerminalGroupShortLabel
                    ] ?? detailBatch.terminalGroup}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="账期">
                  {fmtDate(detailBatch.periodStart)} ~ {fmtDate(detailBatch.periodEnd)}
                </Descriptions.Item>
                <Descriptions.Item label="笔数">{detailBatch.orderCount ?? 0}</Descriptions.Item>
                <Descriptions.Item label="订单金额">
                  <Money fen={detailBatch.orderAmountFen} />
                </Descriptions.Item>
                <Descriptions.Item label="应付总额">
                  <b>
                    <Money fen={detailBatch.totalFen} />
                  </b>
                </Descriptions.Item>
                <Descriptions.Item label="已付">
                  <Money fen={detailBatch.paidFen} />
                </Descriptions.Item>
                <Descriptions.Item label="银行流水号">
                  {detailBatch.transferNo ?? '--'}
                </Descriptions.Item>
                <Descriptions.Item label="转账时间">
                  {fmtTime(detailBatch.transferTime)}
                </Descriptions.Item>
                <Descriptions.Item label="发票号">
                  {detailBatch.invoiceNo ?? '--'}
                </Descriptions.Item>
                <Descriptions.Item label="发票金额">
                  <Money fen={detailBatch.invoiceAmountFen} />
                </Descriptions.Item>
                <Descriptions.Item label="开票时间">
                  {fmtTime(detailBatch.invoiceTime)}
                </Descriptions.Item>
                <Descriptions.Item label="生成人">{detailBatch.createBy ?? '--'}</Descriptions.Item>
                <Descriptions.Item label="确认人">
                  {detailBatch.confirmBy ?? '--'}
                </Descriptions.Item>
                <Descriptions.Item label="转账人">
                  {detailBatch.transferBy ?? '--'}
                </Descriptions.Item>
                <Descriptions.Item label="收票人">
                  {detailBatch.invoiceBy ?? '--'}
                </Descriptions.Item>
                <Descriptions.Item label="确认时间">
                  {fmtTime(detailBatch.confirmTime)}
                </Descriptions.Item>
                <Descriptions.Item label="备注">{detailBatch.remark ?? '--'}</Descriptions.Item>
                {detailBatch.batchStatus === SettleStatusEnum.VOID && (
                  <>
                    <Descriptions.Item label="作废人">
                      {detailBatch.voidBy ?? '--'}
                    </Descriptions.Item>
                    <Descriptions.Item label="作废时间">
                      {fmtTime(detailBatch.voidTime)}
                    </Descriptions.Item>
                    <Descriptions.Item label="作废原因" span={3}>
                      <Typography.Text type="danger">
                        {detailBatch.voidReason ?? '--'}
                      </Typography.Text>
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>

              <Typography.Title level={5} style={{ marginTop: 24 }}>
                批次内应付流水（{detailPayables.length} 笔）
              </Typography.Title>
              <Table
                rowKey="payableId"
                size="small"
                columns={payableColumns as any}
                dataSource={detailPayables}
                pagination={false}
                scroll={{ x: true }}
              />
            </>
          )}
        </Spin>
      </Drawer>
    </>
  );
};

export default RewardSettlement;
