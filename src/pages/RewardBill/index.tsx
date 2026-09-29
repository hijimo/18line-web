import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  message,
  Radio,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { DATE_FORMAT_FULL_TIME } from '@/variables';
import { key, option } from '@/configurify/columns/baseColumns';
import {
  BILL_ORDER_RANGE_MAX_DAYS,
  BillErrorCode,
  BillOrderTypeEnum,
  BillOrderTypeLabel,
  BillOrderTypeOptions,
  BillPayChannelLabel,
  BillPayChannelOptions,
  billRangeDays,
  BillRefundStatusLabel,
  BillRefundStatusOptions,
  BillStatusColor,
  BillStatusEnum,
  BillStatusLabel,
  BillStatusOptions,
  BillTypeColor,
  BillTypeEnum,
  BillTypeLabel,
  BillTypeOptions,
  formatDs,
  formatMonth,
  isBillUrlUsable,
  RewardEnvColor,
  RewardEnvEnum,
  RewardEnvLabel,
} from '@/enums';
import { get as getBillApi } from '@/services/api/打赏账单下载/打赏账单下载';

const billApi = getBillApi();

const fmtTime = (v?: string | Date | null) => (v ? dayjs(v).format(DATE_FORMAT_FULL_TIME) : '--');

/**
 * 「跟随系统配置」的哨兵值。
 *
 * 表单里 env 刻意**不默认选现网**：后端在未指定时以 sys_config 的 reward.env.sandbox 为准，
 * 与下单口径完全一致。前端若擅自默认填 0，一旦运维把系统切到沙箱联调，
 * 财务拉到的就是一份**空的现网账单**——而空账单看起来是「成功」的，
 * 据此对账会得出「一分钱都没收到」的结论，比拉不到账单危险得多。
 */
const ENV_FOLLOW_CONFIG = 'follow';

/** 发起获取的表单值（日期用 Dayjs，提交时转成微信要的 YYYYMMDD 数字 / YYYYMM 字符串） */
type BillFormValues = {
  billType: string;
  dayRange?: [Dayjs, Dayjs];
  monthRange?: [Dayjs, Dayjs];
  orderType?: number;
  payChannel?: number;
  isProvided?: string;
  refundStatus?: number;
  orderInfo?: string;
  env?: string;
  remark?: string;
};

const RewardBill: React.FC = () => {
  const actionRef = useRef<any>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<BillFormValues>();
  const billType = Form.useWatch('billType', form);
  const orderType = Form.useWatch('orderType', form);
  const dayRange = Form.useWatch('dayRange', form);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [batchRows, setBatchRows] = useState<any[]>([]);

  /** 正在刷新/下载的行，用于按钮 loading 与防重复点击（出网接口，连点会撞限频） */
  const [busyPk, setBusyPk] = useState<number | null>(null);

  const request = useTableRequest(billApi.billList as any, undefined, (params) => {
    const range = (params as any).createRange as [string, string] | undefined;
    const next: Record<string, unknown> = { createRange: undefined };
    if (range && range.length === 2) {
      next['params[beginTime]'] = `${range[0]} 00:00:00`;
      next['params[endTime]'] = `${range[1]} 23:59:59`;
    }
    return next;
  });

  const reload = () => actionRef.current?.reload?.();

  // ------------------------------------------------------------------
  // 发起获取
  // ------------------------------------------------------------------

  const openForm = () => {
    form.resetFields();
    // 账单类型默认「日账单」：它是三类里最常用的（对账按日看），
    // 但**支付渠道刻意不给默认值**，理由见 BillPayChannelLabel 的注释
    form.setFieldsValue({ billType: BillTypeEnum.DAY, env: ENV_FOLLOW_CONFIG });
    setFormOpen(true);
  };

  /** 订单明细的跨度提示：前端先拦一道，省掉一次白跑的出网 */
  const orderRangeDays =
    billType === BillTypeEnum.ORDER && dayRange?.length === 2
      ? billRangeDays(
          Number(dayRange[0].format('YYYYMMDD')),
          Number(dayRange[1].format('YYYYMMDD')),
        )
      : null;
  const orderRangeExceeded = orderRangeDays != null && orderRangeDays > BILL_ORDER_RANGE_MAX_DAYS;

  const submitFetch = async () => {
    let values: BillFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd 已在字段下方给出提示
    }

    const body: Record<string, unknown> = { billType: values.billType };
    if (values.billType === BillTypeEnum.IOS_MONTH) {
      if (!values.monthRange?.[0] || !values.monthRange?.[1]) {
        message.error('请选择账单月份区间');
        return;
      }
      body.startMonth = values.monthRange[0].format('YYYYMM');
      body.endMonth = values.monthRange[1].format('YYYYMM');
    } else {
      if (!values.dayRange?.[0] || !values.dayRange?.[1]) {
        message.error('请选择账单日期区间');
        return;
      }
      const beginDs = Number(values.dayRange[0].format('YYYYMMDD'));
      const endDs = Number(values.dayRange[1].format('YYYYMMDD'));
      body.beginDs = beginDs;
      body.endDs = endDs;
      if (values.billType === BillTypeEnum.ORDER) {
        const days = billRangeDays(beginDs, endDs);
        if (days != null && days > BILL_ORDER_RANGE_MAX_DAYS) {
          // 与后端 4086 同一套算法（含首尾）。这里先拦是为了省一次出网往返，
          // 后端仍会再拦一次——前端校验不能当成唯一防线
          message.error(
            `订单明细跨度 ${days} 天，超过微信上限 ${BILL_ORDER_RANGE_MAX_DAYS} 天，请拆成至少 ${Math.ceil(
              days / BILL_ORDER_RANGE_MAX_DAYS,
            )} 段分别下载`,
          );
          return;
        }
        body.orderType = values.orderType ?? BillOrderTypeEnum.GOODS;
        body.payChannel = values.payChannel;
        const needProvided =
          body.orderType === BillOrderTypeEnum.GOODS ||
          body.orderType === BillOrderTypeEnum.SUBSCRIBE;
        if (needProvided) body.isProvided = values.isProvided ?? '1';
        if (body.orderType === BillOrderTypeEnum.REFUND)
          body.refundStatus = values.refundStatus ?? 0;
        if (values.orderInfo?.trim()) body.orderInfo = values.orderInfo.trim();
      }
    }
    if (values.env !== ENV_FOLLOW_CONFIG && values.env != null) {
      body.env = Number(values.env);
    }
    if (values.remark?.trim()) body.remark = values.remark.trim();

    setSubmitting(true);
    try {
      const res: any = await billApi.billFetch(body as any);
      if (res?.code === 200) {
        const rows: any[] = res.data ?? [];
        const generating = rows.filter((r) => r.status === BillStatusEnum.GENERATING);
        if (generating.length === rows.length && rows.length > 0) {
          // 「生成中」不是失败：日账单首次调用几乎总是这个结果（微信要先在侧生成文件），
          // 订单明细 start 只是受理。这里用 warning 而不是 error，避免财务以为账单丢了
          message.warning(
            rows.length > 1
              ? `已受理 ${rows.length} 个月的账单，微信侧正在生成，请稍后逐条点「刷新结果」`
              : '已受理，微信侧正在生成账单文件，请稍后点「刷新结果」（这不是失败）',
          );
        } else {
          message.success(`已获取 ${rows.length} 条账单记录`);
        }
        setFormOpen(false);
        reload();
      }
    } catch (e: any) {
      if (e?.code === BillErrorCode.RANGE_TOO_LARGE) {
        // 后端文案里已算好该拆几段，但 message 由拦截器弹过，这里只补一句动作引导
        message.info('请把日期区间拆短后分别下载');
      } else if (e?.code === BillErrorCode.GENERATING) {
        message.info('该账期已有正在生成的任务，请在列表里对它点「刷新结果」');
      } else if (e?.code === BillErrorCode.RATE_LIMIT) {
        message.info('已触发微信频率限制，请间隔一两分钟后再试，不要连续点击');
      } else if (e?.message) {
        // ⚠️ 不能依赖「拦截器已经弹了后端原文」——它没有。
        // utils/errorHandler 的 parseError 把任何 code>=500 的对象一律判成「服务器错误」，
        // 而本项目业务码是 4080~4087，于是后端精心写的「日期跨度不能超过 31 天」
        // 在弹窗里被替换成了「服务器错误，请稍后重试」。这里把原文补回来。
        message.error(e.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------------------
  // 刷新 / 下载
  // ------------------------------------------------------------------

  const doRefresh = async (record: any) => {
    setBusyPk(record.taskPk);
    try {
      const res: any = await billApi.billRefresh({ taskPk: record.taskPk } as any);
      if (res?.code === 200) {
        const row = res.data ?? {};
        if (row.status === BillStatusEnum.SUCCESS) {
          message.success('账单已就绪，可以下载了');
        } else if (row.status === BillStatusEnum.GENERATING) {
          message.warning(row.errMsg || '微信侧仍在生成，请稍后再刷新');
        } else {
          message.error(row.errMsg || '获取失败，请查看详情里的错误信息');
        }
        reload();
      }
    } catch (e: any) {
      if (e?.code === BillErrorCode.NOT_READY) {
        message.info('该记录无法刷新（缺少微信任务ID或账期），请重新发起一次获取');
      } else if (e?.code === BillErrorCode.RATE_LIMIT) {
        message.info('已触发微信频率限制，请间隔一两分钟后再试');
      } else if (e?.code === BillErrorCode.TASK_NOT_FOUND) {
        // 库里那条任务记录没了（被清理/主键错）。原地重试永远还是 4084，
        // 唯一的出路是重新发起一次，所以文案必须指向那个动作
        message.error('该下载任务记录已不存在，请重新发起一次获取');
      } else if (e?.message) {
        message.error(e.message);
      }
    } finally {
      setBusyPk(null);
    }
  };

  /**
   * 取真实地址并打开。
   *
   * **必须走接口现取，不能用列表里的 downloadUrl**：列表里的地址是掩码占位文案，
   * 而且就算给了真地址，从列表渲染到用户点击之间可能已经过去十几分钟，
   * 而日账单地址只有 28 分钟寿命。后端会在点击这一刻再校验一次过期。
   */
  const doDownload = async (record: any) => {
    setBusyPk(record.taskPk);
    try {
      const res: any = await billApi.billDownloadUrl({ taskPk: record.taskPk } as any);
      if (res?.code === 200 && res.data) {
        window.open(String(res.data), '_blank', 'noopener,noreferrer');
      }
    } catch (e: any) {
      if (e?.code === BillErrorCode.URL_EXPIRED) {
        message.warning('下载地址已过期，请点「刷新结果」重新获取一个新地址');
        reload();
      } else if (e?.code === BillErrorCode.NOT_READY) {
        message.info('账单还没生成好，请先点「刷新结果」');
      } else if (e?.code === BillErrorCode.TASK_NOT_FOUND) {
        message.error('该下载任务记录已不存在，请重新发起一次获取');
      } else if (e?.message) {
        // 同 submitFetch：拦截器会把 4080~4087 的原文改写成「服务器错误」
        message.error(e.message);
      }
    } finally {
      setBusyPk(null);
    }
  };

  const openDetail = async (record: any) => {
    setDetail(record);
    setBatchRows([]);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res: any = await billApi.billDetail({ taskPk: record.taskPk } as any);
      if (res?.code === 200) setDetail(res.data);
      // iOS 月结一次发起会按月展开成多行，详情里要把同批的一起列出来，
      // 否则财务只看到其中一个月，会误以为其它月份没取到
      if (record.billType === BillTypeEnum.IOS_MONTH && record.batchNo) {
        const batchRes: any = await billApi.billBatch({ batchNo: record.batchNo } as any);
        if (batchRes?.code === 200) setBatchRows(batchRes.data ?? []);
      }
    } catch {
      // 拦截器已提示；抽屉继续展示列表行里的数据
    } finally {
      setDetailLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // 列
  // ------------------------------------------------------------------

  const columns = [
    key,
    {
      title: '账单类型',
      dataIndex: 'billType',
      width: 130,
      valueType: 'select',
      fieldProps: { options: BillTypeOptions },
      render: (_: any, r: any) => (
        <Tag color={BillTypeColor[r.billType] ?? 'default'}>
          {BillTypeLabel[r.billType as keyof typeof BillTypeLabel] ?? r.billType ?? '--'}
        </Tag>
      ),
    },
    {
      title: '账期',
      dataIndex: 'beginDs',
      width: 200,
      search: false,
      render: (_: any, r: any) => {
        if (r.billType === BillTypeEnum.IOS_MONTH) {
          // 展开后每行只代表一个月；billMonth 为空说明那次发起微信没返回任何结算单
          return r.billMonth ? (
            <Typography.Text strong>{formatMonth(r.billMonth)}</Typography.Text>
          ) : (
            <Tooltip title="这次发起微信没返回任何结算单，故没有具体月份；请求的区间见详情">
              <Typography.Text type="secondary">
                {formatMonth(r.startMonth)} ~ {formatMonth(r.endMonth)}（未返回月份）
              </Typography.Text>
            </Tooltip>
          );
        }
        return (
          <span>
            {formatDs(r.beginDs)} ~ {formatDs(r.endDs)}
          </span>
        );
      },
    },
    {
      title: '渠道/类型',
      dataIndex: 'payChannel',
      width: 170,
      search: false,
      render: (_: any, r: any) => {
        if (r.billType !== BillTypeEnum.ORDER)
          return <Typography.Text type="secondary">--</Typography.Text>;
        return (
          <Space direction="vertical" size={0}>
            <span>{BillPayChannelLabel[r.payChannel as number] ?? r.payChannel ?? '--'}</span>
            <Typography.Text type="secondary">
              {BillOrderTypeLabel[r.orderType as number] ?? r.orderType ?? '--'}
            </Typography.Text>
          </Space>
        );
      },
    },
    {
      title: '环境',
      dataIndex: 'env',
      width: 90,
      valueType: 'select',
      fieldProps: {
        options: [
          { label: RewardEnvLabel[RewardEnvEnum.PROD], value: Number(RewardEnvEnum.PROD) },
          { label: RewardEnvLabel[RewardEnvEnum.SANDBOX], value: Number(RewardEnvEnum.SANDBOX) },
        ],
      },
      render: (_: any, r: any) => {
        const label = RewardEnvLabel[String(r.env) as keyof typeof RewardEnvLabel] ?? '--';
        return (
          // 环境错了会拉到一份空账单，而空账单看起来是「成功」的，所以这一列必须显眼
          <Tag color={RewardEnvColor[String(r.env) as keyof typeof RewardEnvColor] ?? 'default'}>
            {label}
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      valueType: 'select',
      fieldProps: { options: BillStatusOptions },
      render: (_: any, r: any) => (
        <Tooltip
          title={
            r.status === BillStatusEnum.GENERATING
              ? '「生成中」是正常中间态，不是失败：日账单首次获取要等微信在侧生成文件，订单明细发起后也只是受理。请稍后点「刷新结果」'
              : undefined
          }
        >
          <Tag color={BillStatusColor[r.status] ?? 'default'}>
            {BillStatusLabel[r.status as keyof typeof BillStatusLabel] ?? r.status ?? '--'}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: '地址有效期',
      dataIndex: 'expireAt',
      width: 180,
      search: false,
      render: (_: any, r: any) => {
        if (r.status !== BillStatusEnum.SUCCESS) {
          return <Typography.Text type="secondary">--</Typography.Text>;
        }
        const usable = isBillUrlUsable(r.status, r.expireAt);
        return (
          <Space direction="vertical" size={0}>
            <span>{fmtTime(r.expireAt)}</span>
            {usable ? (
              <Typography.Text type="success">仍可下载</Typography.Text>
            ) : (
              <Tooltip title="微信侧的账单地址是短时效的（日账单半小时）。过期后重发旧地址只会打开一个失败页，容易被误判成「账单文件损坏」，必须重新获取">
                <Typography.Text type="warning">已过期，需刷新重取</Typography.Text>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: '发起信息',
      dataIndex: 'createBy',
      width: 180,
      search: false,
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <span>{r.createBy || '--'}</span>
          <Typography.Text type="secondary">{fmtTime(r.createTime)}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '发起日期',
      dataIndex: 'createRange',
      valueType: 'dateRange',
      hideInTable: true,
      search: { transform: (value: any) => ({ createRange: value }) },
    },
    {
      title: '错误信息',
      dataIndex: 'errMsg',
      width: 260,
      search: false,
      ellipsis: true,
      render: (_: any, r: any) => {
        if (!r.errMsg) return '--';
        // 「生成中」的 errMsg 是**下一步动作引导**而不是错误，用中性色，
        // 标红会让人以为账单丢了（同推送日志「幂等跳过」的处理原则）
        const danger = r.status === BillStatusEnum.FAILED;
        return (
          <Tooltip title={r.errMsg}>
            <Typography.Text type={danger ? 'danger' : 'secondary'}>{r.errMsg}</Typography.Text>
          </Tooltip>
        );
      },
    },
    {
      ...option,
      width: 200,
      render: (_: any, record: any) => {
        const busy = busyPk === record.taskPk;
        const canDownload = isBillUrlUsable(record.status, record.expireAt);
        return (
          <Space size={0} wrap>
            <Button
              type="link"
              size="small"
              disabled={!canDownload}
              loading={busy}
              onClick={() => doDownload(record)}
            >
              下载
            </Button>
            <Button type="link" size="small" loading={busy} onClick={() => doRefresh(record)}>
              刷新结果
            </Button>
            <Button type="link" size="small" onClick={() => openDetail(record)}>
              详情
            </Button>
          </Space>
        );
      },
    },
  ];

  const needProvided =
    orderType === BillOrderTypeEnum.GOODS || orderType === BillOrderTypeEnum.SUBSCRIBE;

  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="三类账单的获取语义不同；「生成中」不是失败"
        description={
          <Space direction="vertical" size={2}>
            <span>
              <b>日账单</b>
              ：微信侧要先生成文件，首次获取通常先返回「生成中」，稍后点「刷新结果」即可；
              地址只有半小时寿命，过期后必须重新获取。
            </span>
            <span>
              <b>iOS 月结账单</b>：由 Apple 结算，需自然月结束后 45~60 天才出账单；一次可选多个月，
              系统会按月展开成多行（同一次发起可在详情里看到全部月份）。
            </span>
            <span>
              <b>订单明细</b>：发起后必然先是「生成中」，靠微信任务ID查进度；日期跨度上限{' '}
              {BILL_ORDER_RANGE_MAX_DAYS} 天。<b>同一账期已有生成中的任务时不能重复发起</b>——
              重复发起会在微信侧留下结果永久取不回的僵尸任务。
            </span>
            <span>
              对账口径：<b>iOS 与安卓必须分开</b>（结算主体与账期不同：安卓 T+3，iOS 45~60 天）。
            </span>
          </Space>
        }
      />
      <CommonTable<any, any>
        actionRef={actionRef}
        rowKey="taskPk"
        headerTitle="账单与订单明细下载任务"
        toolBarRender={() => [
          <Button key="fetch" type="primary" onClick={openForm}>
            发起获取
          </Button>,
        ]}
        columns={columns as any}
        request={request as any}
        pagination={{ defaultPageSize: 20, showSizeChanger: true }}
        options={{ density: true, reload: true, setting: true }}
      />

      <Drawer
        title="发起账单获取"
        width={620}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setFormOpen(false)}>取消</Button>
            <Button type="primary" loading={submitting} onClick={submitFetch}>
              发起获取
            </Button>
          </Space>
        }
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="这会真的调用微信接口"
          description="账单接口与查单、退款、道具上传共用同一套频率配额，请不要连续点击。订单明细还会在微信侧起一个批量任务。"
        />
        <Form form={form} layout="vertical">
          <Form.Item
            label="账单类型"
            name="billType"
            rules={[{ required: true, message: '请选择账单类型' }]}
            extra="日账单按天、iOS 月结按月、订单明细可带筛选条件（含退款单）"
          >
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              options={BillTypeOptions.map((o) => ({ label: o.label, value: o.value }))}
            />
          </Form.Item>

          {billType === BillTypeEnum.IOS_MONTH ? (
            <Form.Item
              label="账单月份区间"
              name="monthRange"
              rules={[{ required: true, message: '请选择月份区间' }]}
              extra="格式 YYYYMM。iOS 由 Apple 结算，需自然月结束后 45~60 天才出账单，查当月通常为空"
            >
              <DatePicker.RangePicker picker="month" style={{ width: '100%' }} allowClear={false} />
            </Form.Item>
          ) : (
            <Form.Item
              label="账单日期区间"
              name="dayRange"
              rules={[{ required: true, message: '请选择日期区间' }]}
              extra={
                billType === BillTypeEnum.ORDER
                  ? `格式 YYYYMMDD。跨度上限 ${BILL_ORDER_RANGE_MAX_DAYS} 天（含首尾）`
                  : '格式 YYYYMMDD'
              }
            >
              <DatePicker.RangePicker style={{ width: '100%' }} allowClear={false} />
            </Form.Item>
          )}

          {billType === BillTypeEnum.ORDER && orderRangeExceeded && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              message={`跨度 ${orderRangeDays} 天，超过微信上限 ${BILL_ORDER_RANGE_MAX_DAYS} 天`}
              description={`请拆成至少 ${Math.ceil(
                (orderRangeDays ?? 0) / BILL_ORDER_RANGE_MAX_DAYS,
              )} 段分别下载。这是微信侧的硬限制，出网也一定会被拒（错误码 ${BillErrorCode.RANGE_TOO_LARGE}）`}
            />
          )}

          {billType === BillTypeEnum.ORDER && (
            <>
              <Form.Item
                label="支付渠道"
                name="payChannel"
                rules={[{ required: true, message: '必须显式选择支付渠道' }]}
                extra="刻意不给默认值：安卓由微信结算（T+3）、iOS 由 Apple 结算（45~60 天），账期与结算主体完全不同，选错会拉到一份对不上账的明细"
              >
                <Select placeholder="请选择支付渠道" options={BillPayChannelOptions} allowClear />
              </Form.Item>
              <Form.Item
                label="订单类型"
                name="orderType"
                initialValue={BillOrderTypeEnum.GOODS}
                extra="本项目打赏是「道具直购」：档位即道具，用户打赏等于直购一个道具。对账退款时选「退款订单」"
              >
                <Select options={BillOrderTypeOptions} />
              </Form.Item>
              {needProvided && (
                <Form.Item
                  label="发货状态"
                  name="isProvided"
                  initialValue="1"
                  extra="选「未发货」可以单独捞出「付了钱但没发货」的漏单——那正是资损现场"
                >
                  <Radio.Group
                    options={[
                      { label: '已发货', value: '1' },
                      { label: '未发货（查漏单）', value: '0' },
                    ]}
                  />
                </Form.Item>
              )}
              {orderType === BillOrderTypeEnum.REFUND && (
                <Form.Item
                  label="退款状态"
                  name="refundStatus"
                  initialValue={0}
                  extra="仅「退款订单」类型有效，用于与本地订单的退款终态比对"
                >
                  <Select options={BillRefundStatusOptions} />
                </Form.Item>
              )}
              <Form.Item
                label="订单信息关键字"
                name="orderInfo"
                extra="可选。支持按交易单号 / 商户单号 / 用户ID 模糊匹配，用于只捞某一笔"
              >
                <Input placeholder="留空表示不过滤" allowClear maxLength={128} />
              </Form.Item>
            </>
          )}

          <Form.Item
            label="环境"
            name="env"
            extra="默认跟随系统配置（与下单口径一致）。**用错环境会拉到一份空账单**，而空账单看起来是成功的，据此对账会得出「一分钱都没收到」的错误结论"
          >
            <Select
              options={[
                { label: '跟随系统配置（推荐）', value: ENV_FOLLOW_CONFIG },
                {
                  label: `${RewardEnvLabel[RewardEnvEnum.PROD]}（env=0）`,
                  value: RewardEnvEnum.PROD,
                },
                {
                  label: `${RewardEnvLabel[RewardEnvEnum.SANDBOX]}（env=1）`,
                  value: RewardEnvEnum.SANDBOX,
                },
              ]}
            />
          </Form.Item>

          <Form.Item label="备注" name="remark" extra="会随记录留痕，如「2026年8月iOS对账用」">
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title="账单下载任务详情"
        width={860}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        destroyOnClose
        extra={
          detail && (
            <Space>
              <Button
                size="small"
                disabled={!isBillUrlUsable(detail.status, detail.expireAt)}
                onClick={() => doDownload(detail)}
              >
                下载
              </Button>
              <Button size="small" type="primary" onClick={() => doRefresh(detail)}>
                刷新结果
              </Button>
            </Space>
          )
        }
      >
        <Spin spinning={detailLoading}>
          {detail?.status === BillStatusEnum.GENERATING && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="生成中不是失败"
              description={detail.errMsg || '微信侧正在生成账单文件，请稍后点「刷新结果」。'}
            />
          )}
          {detail?.status === BillStatusEnum.FAILED && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              message={`获取失败${detail.errCode ? `（错误码 ${detail.errCode}）` : ''}`}
              description={detail.errMsg || '请查看错误信息'}
            />
          )}
          {detail?.status === BillStatusEnum.SUCCESS &&
            !isBillUrlUsable(detail.status, detail.expireAt) && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="下载地址已过期"
                description="微信侧的账单地址是短时效的（日账单半小时）。过期后重发旧地址只会打开一个失败页，容易被误判成「账单文件损坏」——请点「刷新结果」重新获取一个新地址。"
              />
            )}

          <Descriptions bordered size="small" column={2} title="基本信息">
            <Descriptions.Item label="任务ID">{detail?.taskPk ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="发起批次号">
              {detail?.batchNo ? (
                <Typography.Text copyable={{ text: detail.batchNo }}>
                  {detail.batchNo}
                </Typography.Text>
              ) : (
                '--'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="账单类型">
              <Tag color={BillTypeColor[detail?.billType] ?? 'default'}>
                {BillTypeLabel[detail?.billType as keyof typeof BillTypeLabel] ??
                  detail?.billType ??
                  '--'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={BillStatusColor[detail?.status] ?? 'default'}>
                {BillStatusLabel[detail?.status as keyof typeof BillStatusLabel] ??
                  detail?.status ??
                  '--'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="账期" span={2}>
              {detail?.billType === BillTypeEnum.IOS_MONTH
                ? `${formatMonth(detail?.startMonth)} ~ ${formatMonth(detail?.endMonth)}${
                    detail?.billMonth ? `（本行对应 ${formatMonth(detail?.billMonth)}）` : ''
                  }`
                : `${formatDs(detail?.beginDs)} ~ ${formatDs(detail?.endDs)}`}
            </Descriptions.Item>
            <Descriptions.Item label="环境">
              {RewardEnvLabel[String(detail?.env) as keyof typeof RewardEnvLabel] ?? '--'}
            </Descriptions.Item>
            <Descriptions.Item label="地址有效期至">{fmtTime(detail?.expireAt)}</Descriptions.Item>
            <Descriptions.Item label="发起人">{detail?.createBy || '--'}</Descriptions.Item>
            <Descriptions.Item label="发起时间">{fmtTime(detail?.createTime)}</Descriptions.Item>
            <Descriptions.Item label="最近刷新">
              {detail?.updateBy ? `${detail.updateBy} @ ${fmtTime(detail.updateTime)}` : '--'}
            </Descriptions.Item>
            <Descriptions.Item label="备注">{detail?.remark || '--'}</Descriptions.Item>
            <Descriptions.Item label="下载地址" span={2}>
              {/* 后端刻意掩码：真实地址只能经「下载」按钮现取（那一刻才校验过期） */}
              <Typography.Text type="secondary">{detail?.downloadUrl || '--'}</Typography.Text>
            </Descriptions.Item>
          </Descriptions>

          {detail?.billType === BillTypeEnum.ORDER && (
            <Descriptions
              bordered
              size="small"
              column={2}
              title="订单明细筛选条件（发起时刻的快照）"
              style={{ marginTop: 16 }}
            >
              <Descriptions.Item label="订单类型">
                {BillOrderTypeLabel[detail?.orderType as number] ?? detail?.orderType ?? '--'}
              </Descriptions.Item>
              <Descriptions.Item label="支付渠道">
                {BillPayChannelLabel[detail?.payChannel as number] ?? detail?.payChannel ?? '--'}
              </Descriptions.Item>
              <Descriptions.Item label="发货状态">
                {detail?.isProvided == null
                  ? '--（退款订单不带此条件）'
                  : detail.isProvided === '1'
                    ? '已发货'
                    : '未发货'}
              </Descriptions.Item>
              <Descriptions.Item label="退款状态">
                {detail?.refundStatus == null
                  ? '--'
                  : (BillRefundStatusLabel[detail.refundStatus as number] ?? detail.refundStatus)}
              </Descriptions.Item>
              <Descriptions.Item label="订单信息关键字" span={2}>
                {detail?.orderInfo || '--（未过滤）'}
              </Descriptions.Item>
              <Descriptions.Item label="微信任务ID" span={2}>
                {detail?.wxTaskId ? (
                  <Tooltip title="这是查询微信侧任务的唯一凭据，且只存在于库里——微信没有「列出我所有下载任务」的接口，丢了就永久取不回那个任务的结果">
                    <Typography.Text copyable={{ text: detail.wxTaskId }}>
                      {detail.wxTaskId}
                    </Typography.Text>
                  </Tooltip>
                ) : (
                  <Typography.Text type="warning">
                    缺失：微信未返回 task_id，该记录无法刷新，需重新发起
                  </Typography.Text>
                )}
              </Descriptions.Item>
            </Descriptions>
          )}

          {batchRows.length > 0 && (
            <>
              <Typography.Title level={5} style={{ marginTop: 16 }}>
                同一次发起的全部月份（{batchRows.length} 条）
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                iOS 月结一次可选多个月，系统按月展开成多行并共享同一个批次号。这里列全，
                避免只看到其中一个月而误以为其它月份没取到。
              </Typography.Paragraph>
              <Descriptions bordered size="small" column={1}>
                {batchRows.map((row: any) => (
                  <Descriptions.Item key={row.taskPk} label={formatMonth(row.billMonth)}>
                    <Space>
                      <Tag color={BillStatusColor[row.status] ?? 'default'}>
                        {BillStatusLabel[row.status as keyof typeof BillStatusLabel] ?? row.status}
                      </Tag>
                      <Typography.Text type="secondary">
                        有效期至 {fmtTime(row.expireAt)}
                      </Typography.Text>
                      <Button
                        type="link"
                        size="small"
                        disabled={!isBillUrlUsable(row.status, row.expireAt)}
                        onClick={() => doDownload(row)}
                      >
                        下载
                      </Button>
                      <Button type="link" size="small" onClick={() => doRefresh(row)}>
                        刷新
                      </Button>
                    </Space>
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </>
          )}
        </Spin>
      </Drawer>
    </>
  );
};

export default RewardBill;
