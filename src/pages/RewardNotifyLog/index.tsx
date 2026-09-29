import { Alert, Button, Descriptions, Drawer, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { DATE_FORMAT_FULL_TIME } from '@/variables';
import { key, option } from '@/configurify/columns/baseColumns';
import {
  maskOpenid,
  NotifyEventColor,
  NotifyEventLabel,
  NotifyEventOptions,
  NotifyMsgFormatLabel,
  NotifyProcessColor,
  NotifyProcessEnum,
  NotifyProcessLabel,
  NotifyProcessOptions,
  NotifyVerifyColor,
  NotifyVerifyEnum,
  NotifyVerifyLabel,
  NotifyVerifyOptions,
} from '@/enums';
import { get as getNotifyLogApi } from '@/services/api/打赏推送日志/打赏推送日志';

const notifyLogApi = getNotifyLogApi();

const fmtTime = (v?: string | Date | null) => (v ? dayjs(v).format(DATE_FORMAT_FULL_TIME) : '--');

/** 报文原文：等宽 + 可横向滚动 + 保留换行。JSON 尝试美化，失败就原样显示 */
const Payload: React.FC<{ text?: string | null; emptyHint: string }> = ({ text, emptyHint }) => {
  if (!text) {
    return <Typography.Text type="secondary">{emptyHint}</Typography.Text>;
  }
  let pretty = text;
  try {
    pretty = JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    // XML 或非 JSON 报文原样展示：格式化失败不是错误，别把它变成一条报错
  }
  return (
    <Typography.Paragraph copyable={{ text }} style={{ marginBottom: 0 }}>
      <pre
        style={{
          maxHeight: 320,
          overflow: 'auto',
          background: 'rgba(0,0,0,0.04)',
          padding: 8,
          borderRadius: 4,
          fontSize: 12,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {pretty}
      </pre>
    </Typography.Paragraph>
  );
};

const RewardNotifyLog: React.FC = () => {
  const actionRef = useRef<any>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  /**
   * 列表请求。
   * RuoYi 的时间区间走 params[beginTime]/params[endTime]（BaseEntity.params），
   * ProTable 的 dateRange 给的是数组，这里翻译成后端能绑定的形式。
   * Mapper XML 按 date_format(create_time,'%y%m%d') 比较，是**日粒度**，
   * 所以补 00:00:00 / 23:59:59 只为让语义直观，不影响命中范围。
   */
  const request = useTableRequest(notifyLogApi.notifyLogList as any, undefined, (params) => {
    const range = (params as any).createRange as [string, string] | undefined;
    const next: Record<string, unknown> = { createRange: undefined };
    if (range && range.length === 2) {
      next['params[beginTime]'] = `${range[0]} 00:00:00`;
      next['params[endTime]'] = `${range[1]} 23:59:59`;
    }
    return next;
  });

  const openDetail = async (record: any) => {
    // 先用列表行占位，避免抽屉打开瞬间是一片空白（列表没有报文全文，但有判据字段）
    setDetail(record);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res: any = await notifyLogApi.notifyLogDetail({ logId: record.logId } as any);
      if (res?.code === 200) {
        setDetail(res.data);
      }
    } catch {
      // 拦截器已提示；抽屉继续展示列表里的旧数据（无报文全文）
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    key,
    {
      title: '接收时间',
      dataIndex: 'createTime',
      width: 170,
      search: false,
      render: (_: any, r: any) => fmtTime(r.createTime),
    },
    {
      // 只用于筛选，不在表格里占一列（表格用「接收时间」）
      title: '接收日期',
      dataIndex: 'createRange',
      valueType: 'dateRange',
      hideInTable: true,
      search: {
        transform: (value: any) => ({ createRange: value }),
      },
    },
    {
      title: '事件类型',
      dataIndex: 'eventType',
      width: 170,
      valueType: 'select',
      fieldProps: { options: NotifyEventOptions, showSearch: true },
      render: (_: any, r: any) => (
        <Tooltip title={r.eventType}>
          <Tag color={NotifyEventColor[r.eventType] ?? 'default'}>
            {NotifyEventLabel[r.eventType as keyof typeof NotifyEventLabel] ?? r.eventType ?? '--'}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: '业务订单号',
      dataIndex: 'outTradeNo',
      width: 190,
      ellipsis: true,
      fieldProps: { placeholder: '精确匹配，如 RW2026...' },
      render: (_: any, r: any) =>
        r.outTradeNo ? (
          <Typography.Text copyable={{ text: r.outTradeNo }}>{r.outTradeNo}</Typography.Text>
        ) : (
          // 验签失败或报文解析不出订单号时就是空的，这本身就是排障线索
          <Typography.Text type="secondary">未定位到订单</Typography.Text>
        ),
    },
    {
      title: '用户 openid',
      dataIndex: 'openid',
      width: 180,
      ellipsis: true,
      fieldProps: { placeholder: '精确匹配' },
      render: (_: any, r: any) => (
        <Tooltip title="openid 是用户在本小程序内的唯一标识，列表页做脱敏；完整值请查库">
          <span>{maskOpenid(r.openid)}</span>
        </Tooltip>
      ),
    },
    {
      title: '报文格式',
      dataIndex: 'msgFormat',
      width: 100,
      search: false,
      render: (_: any, r: any) =>
        NotifyMsgFormatLabel[r.msgFormat as keyof typeof NotifyMsgFormatLabel] ??
        r.msgFormat ??
        '--',
    },
    {
      title: '验签',
      dataIndex: 'verifyResult',
      width: 100,
      valueType: 'select',
      fieldProps: { options: NotifyVerifyOptions },
      render: (_: any, r: any) => (
        <Tag color={NotifyVerifyColor[r.verifyResult] ?? 'default'}>
          {NotifyVerifyLabel[r.verifyResult as keyof typeof NotifyVerifyLabel] ??
            r.verifyResult ??
            '--'}
        </Tag>
      ),
    },
    {
      title: '处理结果',
      dataIndex: 'processResult',
      width: 110,
      valueType: 'select',
      fieldProps: { options: NotifyProcessOptions },
      render: (_: any, r: any) => (
        <Tooltip
          title={
            r.processResult === NotifyProcessEnum.IDEMPOTENT_SKIPPED
              ? '微信对同一条推送最多重推 15 次，第二次条件更新影响 0 行即记为幂等跳过——是正常现象，不是失败'
              : undefined
          }
        >
          <Tag color={NotifyProcessColor[r.processResult] ?? 'default'}>
            {NotifyProcessLabel[r.processResult as keyof typeof NotifyProcessLabel] ??
              r.processResult ??
              '--'}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: '错误摘要',
      dataIndex: 'errMsg',
      width: 240,
      search: false,
      ellipsis: true,
      render: (_: any, r: any) =>
        r.errMsg ? (
          <Tooltip title={r.errMsg}>
            <Typography.Text type="danger">{r.errMsg}</Typography.Text>
          </Tooltip>
        ) : (
          '--'
        ),
    },
    {
      ...option,
      width: 90,
      render: (_: any, record: any) => (
        <Space size={0} wrap>
          <Button type="link" size="small" onClick={() => openDetail(record)}>
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="本页只读：没有「重放推送」按钮，也不会加"
        description="重放一条推送等于把记账再跑一遍。记账层的幂等是给「微信最多重推 15 次」兜底的，不是给后台按钮用的——点重放的人并不知道这条当初是成功、幂等跳过还是验签失败，而验签失败的报文重放一次就是一次真实的记账请求。要补账请走「查单补偿」（以微信侧 query_order 为准，不以本地报文为准）。"
      />
      <CommonTable<any, any>
        actionRef={actionRef}
        rowKey="logId"
        headerTitle="微信虚拟支付推送留痕"
        columns={columns as any}
        request={request as any}
        pagination={{ defaultPageSize: 20, showSizeChanger: true }}
        options={{ density: true, reload: true, setting: true }}
      />

      <Drawer
        title="推送日志详情"
        width={820}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        destroyOnClose
      >
        <Spin spinning={detailLoading}>
          {detail?.verifyResult === NotifyVerifyEnum.FAILED && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              message="这条推送验签失败：来源不可信"
              description="报文可能是伪造的，也可能是 Token / EncodingAESKey 配错导致真推送被误判。无论哪种，都不得据此补账或改订单状态；要确认用户是否真的付了钱，只能以微信侧 query_order 的结果为准。"
            />
          )}
          {detail?.processResult === NotifyProcessEnum.IDEMPOTENT_SKIPPED && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="幂等跳过：账已经记过了，不是失败"
              description="同一条推送被微信重推（最多 15 次），条件更新影响 0 行。用同一个 out_trade_no 过滤就能看到第一次成功的那条。"
            />
          )}
          {detail?.processResult === NotifyProcessEnum.FAILED && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="处理失败：微信会继续重推"
              description="先看下面的错误信息与原始报文定位原因。若重推全部失败，订单会停在「已支付待发货」，由查单补偿任务按微信侧状态推进。"
            />
          )}
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="日志ID">{detail?.logId ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="接收时间">{fmtTime(detail?.createTime)}</Descriptions.Item>
            <Descriptions.Item label="事件类型">
              <Tag color={NotifyEventColor[detail?.eventType] ?? 'default'}>
                {NotifyEventLabel[detail?.eventType as keyof typeof NotifyEventLabel] ??
                  detail?.eventType ??
                  '--'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="事件原始值">
              <Typography.Text style={{ fontSize: 12 }}>
                {detail?.eventType ?? '--'}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="业务订单号" span={2}>
              {detail?.outTradeNo ? (
                <Typography.Text copyable={{ text: detail.outTradeNo }}>
                  {detail.outTradeNo}
                </Typography.Text>
              ) : (
                '--'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="用户 openid" span={2}>
              {detail?.openid ? (
                <Typography.Text copyable={{ text: detail.openid }}>
                  {detail.openid}
                </Typography.Text>
              ) : (
                '--'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="报文格式">
              {NotifyMsgFormatLabel[detail?.msgFormat as keyof typeof NotifyMsgFormatLabel] ??
                detail?.msgFormat ??
                '--'}
            </Descriptions.Item>
            <Descriptions.Item label="验签结果">
              <Tag color={NotifyVerifyColor[detail?.verifyResult] ?? 'default'}>
                {NotifyVerifyLabel[detail?.verifyResult as keyof typeof NotifyVerifyLabel] ?? '--'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="处理结果">
              <Tag color={NotifyProcessColor[detail?.processResult] ?? 'default'}>
                {NotifyProcessLabel[detail?.processResult as keyof typeof NotifyProcessLabel] ??
                  '--'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="错误信息">
              <Typography.Text type={detail?.errMsg ? 'danger' : undefined}>
                {detail?.errMsg || '--'}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="原始报文（安全模式下为解密后明文）" span={2}>
              <Payload
                text={detail?.rawBody}
                emptyHint="列表接口不返回报文全文；若这里为空说明详情接口未取到"
              />
            </Descriptions.Item>
            <Descriptions.Item label="返回给微信的应答体" span={2}>
              <Payload text={detail?.responseBody} emptyHint="未记录应答体" />
            </Descriptions.Item>
          </Descriptions>
        </Spin>
      </Drawer>
    </>
  );
};

export default RewardNotifyLog;
