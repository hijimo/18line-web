import { AuditOutlined, PlusOutlined } from '@ant-design/icons';
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
  Radio,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { DATE_FORMAT_FULL_TIME } from '@/variables';
import { key, option } from '@/configurify/columns/baseColumns';
import {
  CHANNEL_FEE_ANDROID_DEFAULT,
  CHANNEL_FEE_IOS_DEFAULT,
  CREDIT_CODE_LEN,
  CREDIT_CODE_PATTERN,
  hasInvoiceCapability,
  maskBankAccountNo,
  MerchantAuditStatusColor,
  MerchantAuditStatusEnum,
  MerchantAuditStatusLabel,
  MerchantAuditStatusOptions,
  MerchantErrorCode,
  MerchantInvoiceColor,
  MerchantInvoiceLabel,
  MerchantInvoiceOptions,
  MerchantStatusLabel,
  MerchantStatusOptions,
  shareRateMax,
  StatusEnum,
} from '@/enums';
import { get as getMerchantApi } from '@/services/api/打赏商户管理/打赏商户管理';

const merchantApi = getMerchantApi();

const fmtTime = (v?: string | Date | null) => (v ? dayjs(v).format(DATE_FORMAT_FULL_TIME) : '--');
const fmtDate = (v?: string | Date | null) => (v ? dayjs(v).format('YYYY-MM-DD') : '--');

/**
 * 费率展示。空值不是「0%」而是「继承全局参数」，必须写清楚：
 * 运营看到 0% 会以为这个商户一分不拿，看到空白会以为漏配。
 */
const RateText: React.FC<{ value?: number | null }> = ({ value }) =>
  value === null || value === undefined ? (
    <Tooltip title="未覆盖，按 sys_config 全局参数计算">
      <Typography.Text type="secondary">继承全局</Typography.Text>
    </Tooltip>
  ) : (
    <span className="nowrap">{`${Number(value).toFixed(2)}%`}</span>
  );

/** 附件地址：有值给可点链接，无值按语义给红字（审核门槛项）或灰字（可选项） */
const UrlText: React.FC<{ url?: string | null; required?: boolean }> = ({ url, required }) => {
  if (url) {
    return (
      <Typography.Link
        href={url}
        target="_blank"
        rel="noreferrer"
        style={{ wordBreak: 'break-all' }}
      >
        查看附件
      </Typography.Link>
    );
  }
  return required ? (
    <Typography.Text type="danger">未上传（不得通过审核）</Typography.Text>
  ) : (
    <Typography.Text type="secondary">未上传</Typography.Text>
  );
};

/**
 * 审核三道硬门槛的缺项清单。
 *
 * 后端 auditMerchant 会逐条拒（4063/4068/4067），这里在**点审核之前**就摆出来：
 * 一次只报一条的话，运营要来回三次才知道差哪些材料，而每来回一次都要重新找商户要资料。
 */
const auditGaps = (record: any): { key: string; label: string }[] => {
  const gaps: { key: string; label: string }[] = [];
  if (!record) return gaps;
  if (!hasInvoiceCapability(record.invoiceCapability)) {
    gaps.push({ key: 'invoice', label: '开票能力为「无」：分成无法税前扣除（4063）' });
  }
  if (!record.licenseUrl) {
    gaps.push({ key: 'license', label: '营业执照附件未上传：主体资格证据链缺一环（4068）' });
  }
  if (!record.bankAccountName || !record.bankAccountNo) {
    gaps.push({ key: 'bank', label: '对公账户名或账号未登记：月结批次付不出款（4067）' });
  }
  return gaps;
};

/**
 * 从被拦截器包装过的业务异常里取后端 code。
 *
 * ⚠️ 商户 CRUD 的业务失败是 **顶层 code**（ServiceException → 全局异常处理器），
 * 与档位/退款页的「HTTP 200 + data.code」不同。拦截器已经弹过后端原文并 throw，
 * 所以 catch 里只按 code 补引导，**不要再 message.error 一遍**（同一条原因弹两次）。
 */
const errCode = (e: unknown): number | undefined => (e as { code?: number })?.code;

const RewardMerchant: React.FC = () => {
  const actionRef = useRef<any>(null);

  // ---- 新增/编辑抽屉 ----
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // ---- 详情抽屉 ----
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  // ---- 审核弹窗 ----
  const [auditTarget, setAuditTarget] = useState<any>(null);
  const [auditSubmitting, setAuditSubmitting] = useState(false);
  const [auditForm] = Form.useForm();
  const auditPass = Form.useWatch('pass', auditForm);

  const request = useTableRequest(merchantApi.merchantList as any);

  // ==================== 新增 / 编辑 ====================

  const openDrawer = (record?: any) => {
    setCurrentRecord(record ?? null);
    if (record) {
      form.setFieldsValue({
        ...record,
        cooperationStartDate: record.cooperationStartDate
          ? dayjs(record.cooperationStartDate)
          : undefined,
        cooperationEndDate: record.cooperationEndDate
          ? dayjs(record.cooperationEndDate)
          : undefined,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ invoiceCapability: undefined, status: StatusEnum.NORMAL });
    }
    setDrawerOpen(true);
  };

  /** 已通过审核的商户，信用代码被后端锁死（4069）：改代码等于换法人主体 */
  const creditCodeLocked = currentRecord?.auditStatus === MerchantAuditStatusEnum.APPROVED;

  const handleSubmit = async () => {
    let values: any;
    try {
      values = await form.validateFields();
    } catch {
      // 校验未通过：表单已就地标红
      return;
    }

    /**
     * 出网字段**白名单**，不含任何 audit_* 字段。
     *
     * 后端 insert/update 本来就会强制忽略审核字段，前端再收一层是双保险：
     * 万一哪天有人图省事把表单值整体 spread 进请求体，「新增商户」这个权限
     * 就会变成「直接造一个可收款主体」。测试里专门锁了这条。
     */
    const payload: Record<string, unknown> = {
      merchantName: values.merchantName?.trim(),
      creditCode: values.creditCode?.trim().toUpperCase(),
      legalPerson: values.legalPerson,
      contactName: values.contactName,
      contactPhone: values.contactPhone,
      invoiceCapability: values.invoiceCapability,
      licenseUrl: values.licenseUrl,
      travelAgencyLicenseNo: values.travelAgencyLicenseNo,
      travelAgencyLicenseUrl: values.travelAgencyLicenseUrl,
      agreementUrl: values.agreementUrl,
      bankAccountName: values.bankAccountName,
      bankAccountNo: values.bankAccountNo,
      bankName: values.bankName,
      // 三个费率：undefined → JSON 里不出现 → 后端收到 null → 语义是「继承全局」。
      // updateMerchant 对这三列是无条件更新，所以编辑时必须把原值带上，
      // 否则清空一次就等于把商户的分成率改回全局值（可能是运营没意识到的降分成）。
      androidShareRate: values.androidShareRate ?? undefined,
      iosShareRate: values.iosShareRate ?? undefined,
      commissionRate: values.commissionRate ?? undefined,
      /**
       * 后端 cooperation_start_date/end_date 是 date 列，但实体上标了
       * @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")，Jackson 反序列化按同一 pattern 走，
       * 只发 "2026-09-28" 会直接 400。所以补全时间：开始取当天 00:00:00，
       * 结束取当天 23:59:59（否则「合作到 9/28」会被理解成 9/28 零点就结束了）。
       */
      cooperationStartDate: values.cooperationStartDate
        ? dayjs(values.cooperationStartDate).startOf('day').format('YYYY-MM-DD HH:mm:ss')
        : undefined,
      cooperationEndDate: values.cooperationEndDate
        ? dayjs(values.cooperationEndDate).endOf('day').format('YYYY-MM-DD HH:mm:ss')
        : undefined,
      status: values.status,
      remark: values.remark,
    };
    if (currentRecord?.merchantId != null) {
      payload.merchantId = currentRecord.merchantId;
    }

    setSubmitting(true);
    try {
      const res: any = currentRecord?.merchantId
        ? await merchantApi.merchantEdit(payload as any)
        : await merchantApi.merchantAdd(payload as any);
      if (res?.code === 200) {
        message.success(
          currentRecord?.merchantId ? '修改成功' : '新增成功，商户处于「待审核」状态',
        );
        setDrawerOpen(false);
        actionRef.current?.reload();
      } else {
        message.error(res?.msg || '保存失败');
      }
    } catch (e) {
      // 拦截器已弹出后端原文（4061/4062/4064/4069 等）。这里只按 code 补一句可执行的引导，
      // 抽屉保持打开，让运营就地改完再提交，而不是把填了一半的资料丢掉。
      const code = errCode(e);
      if (code === MerchantErrorCode.CREDIT_CODE_DUPLICATED) {
        message.warning('一个主体只能有一条合作记录：如已存在请去列表里找到它并改状态，不要新建');
      } else if (code === MerchantErrorCode.CREDIT_CODE_LOCKED) {
        message.warning('换主体请新建商户并重新走审核，不要在原商户上改信用代码');
      } else if (code === MerchantErrorCode.RATE_INVALID) {
        message.warning(
          '分成率上限 = 100 − 该平台渠道费率；超限会让该商户所有线路的打赏被资损闸门拒单',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== 审核 ====================

  const openAudit = (record: any) => {
    setAuditTarget(record);
    auditForm.resetFields();
    // 已通过的商户再点审核，默认给「拒绝」：把已通过改成通过是非法流转（4066），
    // 而从通过 → 拒绝的实际语义是「撤销合作资格」，需要运营显式确认。
    auditForm.setFieldsValue({
      pass: record?.auditStatus === MerchantAuditStatusEnum.APPROVED ? false : true,
      auditRemark:
        record?.auditStatus === MerchantAuditStatusEnum.REJECTED ? record?.auditRemark : undefined,
    });
  };

  const submitAudit = async () => {
    let values: any;
    try {
      values = await auditForm.validateFields();
    } catch {
      return;
    }
    if (!auditTarget?.merchantId) return;
    setAuditSubmitting(true);
    try {
      const res: any = await merchantApi.merchantAudit({
        merchantId: auditTarget.merchantId,
        pass: !!values.pass,
        auditRemark: values.auditRemark?.trim() || undefined,
      } as any);
      if (res?.code === 200) {
        message.success(values.pass ? '审核通过：该商户已成为可收款主体' : '已拒绝入驻');
        setAuditTarget(null);
        actionRef.current?.reload();
      } else {
        message.error(res?.msg || '审核失败');
      }
    } catch {
      // 拦截器已弹出后端原文（4063/4066/4067/4068）。弹窗保持打开，
      // 运营可以就地改结论或先去补材料，不必重新找一遍这个商户。
    } finally {
      setAuditSubmitting(false);
    }
  };

  // ==================== 详情 / 删除 ====================

  const openDetail = async (record: any) => {
    setDetail(record);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res: any = await merchantApi.merchantDetail({ merchantId: record.merchantId } as any);
      if (res?.code === 200) {
        // 详情返回**完整**对公账号是后端刻意的：编辑表单要能回填，
        // 否则保存一次就把账号覆盖成掩码。列表页才做脱敏。
        setDetail(res.data);
      }
    } catch {
      // 拦截器已提示，抽屉继续展示列表里的旧数据
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await merchantApi.merchantRemove({ merchantIds: record.merchantId } as any);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (e) {
      actionRef.current?.reload();
      if (errCode(e) === MerchantErrorCode.HAS_UNSETTLED) {
        // 4065：流水与批次都挂在这个主体上，删掉主体会让财务对着一笔付不出去的款找不到收款人。
        // 这里给一条可执行出路，而不是只弹一句「删除失败」。
        Modal.confirm({
          title: '该商户还有未结算的应付流水，不能删除',
          content:
            '要停止合作请把状态改为「停用」：停用后名下线路立即不能被打赏，但主体与账务保留，财务可以把这批账走完，之后再删。',
          okText: '去改为停用',
          cancelText: '知道了',
          onOk: () => openDrawer(record),
        });
      }
    }
  };

  // ==================== 列 ====================

  const columns = [
    key,
    {
      title: '商户名称',
      dataIndex: 'merchantName',
      width: 200,
      ellipsis: true,
      fieldProps: { placeholder: '按营业执照名称模糊查' },
    },
    {
      title: '统一社会信用代码',
      dataIndex: 'creditCode',
      width: 190,
      ellipsis: true,
      fieldProps: { placeholder: `${CREDIT_CODE_LEN} 位，精确匹配` },
      render: (_: any, r: any) =>
        r.creditCode ? (
          <Typography.Text copyable={{ text: r.creditCode }}>{r.creditCode}</Typography.Text>
        ) : (
          '--'
        ),
    },
    {
      title: '入驻审核',
      dataIndex: 'auditStatus',
      width: 110,
      valueType: 'select',
      fieldProps: { options: MerchantAuditStatusOptions },
      render: (_: any, r: any) => {
        const status = r.auditStatus ?? MerchantAuditStatusEnum.PENDING;
        return (
          <Tooltip title={r.auditRemark || undefined}>
            <Tag color={MerchantAuditStatusColor[status]}>
              {MerchantAuditStatusLabel[status as keyof typeof MerchantAuditStatusLabel] ?? status}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '开票能力',
      dataIndex: 'invoiceCapability',
      width: 130,
      valueType: 'select',
      fieldProps: { options: MerchantInvoiceOptions },
      render: (_: any, r: any) => (
        <Tag color={MerchantInvoiceColor[r.invoiceCapability] ?? 'default'}>
          {MerchantInvoiceLabel[r.invoiceCapability as keyof typeof MerchantInvoiceLabel] ??
            '未登记'}
        </Tag>
      ),
    },
    {
      title: '分成率（安卓 / iOS）',
      dataIndex: 'androidShareRate',
      width: 170,
      search: false,
      render: (_: any, r: any) => (
        <Space size={4}>
          <RateText value={r.androidShareRate} />
          <span>/</span>
          <RateText value={r.iosShareRate} />
        </Space>
      ),
    },
    {
      title: '佣金率',
      dataIndex: 'commissionRate',
      width: 100,
      search: false,
      align: 'right',
      render: (_: any, r: any) => <RateText value={r.commissionRate} />,
    },
    {
      title: '对公账户',
      dataIndex: 'bankAccountNo',
      width: 200,
      search: false,
      render: (_: any, r: any) =>
        r.bankAccountName || r.bankAccountNo ? (
          <Space direction="vertical" size={0}>
            <span className="nowrap">{r.bankAccountName || '--'}</span>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {maskBankAccountNo(r.bankAccountNo)}
            </Typography.Text>
          </Space>
        ) : (
          <Typography.Text type="danger">未登记（审核会被拦）</Typography.Text>
        ),
    },
    {
      title: '联系人',
      dataIndex: 'contactName',
      width: 140,
      search: false,
      render: (_: any, r: any) =>
        r.contactName || r.contactPhone ? (
          <Space direction="vertical" size={0}>
            <span className="nowrap">{r.contactName || '--'}</span>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {r.contactPhone || ''}
            </Typography.Text>
          </Space>
        ) : (
          '--'
        ),
    },
    {
      title: '合作期',
      dataIndex: 'cooperationEndDate',
      width: 190,
      search: false,
      render: (_: any, r: any) =>
        r.cooperationStartDate || r.cooperationEndDate
          ? `${fmtDate(r.cooperationStartDate)} ~ ${fmtDate(r.cooperationEndDate)}`
          : '--',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      fieldProps: { options: MerchantStatusOptions },
      render: (_: any, r: any) =>
        r.status === StatusEnum.DISABLED ? (
          <Tooltip title="停用后该商户名下线路立即不能被打赏，主体与账务仍保留">
            <Tag color="default">停用</Tag>
          </Tooltip>
        ) : (
          <Tag color="green">正常</Tag>
        ),
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
      width: 250,
      render: (_: any, record: any) => {
        const gaps = auditGaps(record);
        const approved = record.auditStatus === MerchantAuditStatusEnum.APPROVED;
        return (
          <Space size={0} wrap>
            <Button type="link" size="small" onClick={() => openDetail(record)}>
              详情
            </Button>
            <Button type="link" size="small" onClick={() => openDrawer(record)}>
              编辑
            </Button>
            {gaps.length > 0 && !approved ? (
              // 材料不齐时不给「一键通过」的错觉：按钮仍可点（进弹窗看缺什么），
              // 但带上明确的红点提示，避免运营点了通过被后端拒了才发现差材料
              <Tooltip title={`审核门槛未满足：${gaps.map((g) => g.label).join('；')}`}>
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<AuditOutlined />}
                  onClick={() => openAudit(record)}
                >
                  审核
                </Button>
              </Tooltip>
            ) : (
              <Button
                type="link"
                size="small"
                icon={<AuditOutlined />}
                onClick={() => openAudit(record)}
              >
                {approved ? '撤销通过' : '审核'}
              </Button>
            )}
            <Popconfirm
              title="确定删除该商户？"
              description="软删除。有未结算应付流水的商户会被拒绝，此时请改为「停用」"
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const gaps = auditGaps(auditTarget);

  return (
    <>
      <CommonTable<any, any>
        actionRef={actionRef}
        rowKey="merchantId"
        headerTitle="打赏商户（合作主体与费率覆盖）"
        columns={columns as any}
        request={request as any}
        pagination={{ defaultPageSize: 20, showSizeChanger: true }}
        options={{ density: true, reload: true, setting: true }}
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            新增商户
          </Button>,
        ]}
      />

      {/* ---------- 新增 / 编辑 ---------- */}
      <Drawer
        title={currentRecord ? `编辑商户：${currentRecord.merchantName ?? ''}` : '新增商户'}
        width={680}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              保存
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            currentRecord
              ? '审核状态不在这里改：只能走列表上的「审核」按钮'
              : '新增的商户一律是「待审核」，不能直接建成可收款主体'
          }
          description="后端会强制忽略本表单里的任何审核字段（auditStatus/auditBy/auditTime/auditRemark），审核结论只能由「审核」接口写入——否则「新增商户」这一个权限就等于「让任意主体立刻能收钱」。"
        />
        {creditCodeLocked && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="该商户已通过入驻审核，统一社会信用代码已锁定"
            description="历史订单快照、应付流水、结算批次与发票全都挂在这个主体上，改代码等于换法人。要换主体请新建商户并重新审核（后端错误码 4069）。"
          />
        )}
        <Form form={form} layout="vertical">
          <Typography.Title level={5}>主体资料</Typography.Title>
          <Form.Item
            label="商户名称"
            name="merchantName"
            tooltip="必须与营业执照完全一致：结算与发票都按这个名字走"
            rules={[{ required: true, message: '请输入商户名称' }, { max: 200 }]}
          >
            <Input placeholder="如 丽水某某旅行社有限公司" />
          </Form.Item>
          <Form.Item
            label="统一社会信用代码"
            name="creditCode"
            tooltip={`国标 ${CREDIT_CODE_LEN} 位，排除易混字母 I O Z S V；一个主体只能有一条合作记录`}
            rules={[
              { required: true, message: '请输入统一社会信用代码' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const code = String(value).trim().toUpperCase();
                  if (code.length !== CREDIT_CODE_LEN) {
                    return Promise.reject(
                      new Error(`必须是 ${CREDIT_CODE_LEN} 位，当前 ${code.length} 位`),
                    );
                  }
                  return CREDIT_CODE_PATTERN.test(code)
                    ? Promise.resolve()
                    : Promise.reject(new Error('含非法字符：国标排除 I O Z S V，请核对营业执照'));
                },
              },
            ]}
          >
            <Input placeholder="如 91331100MA2H8N4X7Y" maxLength={32} disabled={creditCodeLocked} />
          </Form.Item>
          <Form.Item label="法定代表人" name="legalPerson" rules={[{ max: 64 }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item
            label="开票能力"
            name="invoiceCapability"
            tooltip="平台以自己名义收款并全额确认收入，再对公付给商家；商家开不出发票，这笔分成就无法税前扣除，因此「无」不得通过审核"
            rules={[{ required: true, message: '请选择开票能力' }]}
          >
            <Select options={MerchantInvoiceOptions} placeholder="请选择" allowClear />
          </Form.Item>

          <Typography.Title level={5}>资质附件</Typography.Title>
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="营业执照附件是审核硬门槛"
            description="请先在「资源附件」/OSS 上传拿到文件地址，再粘贴到下面。地址为空时审核会被后端拒（4068）。"
          />
          <Form.Item
            label="营业执照附件地址"
            name="licenseUrl"
            rules={[{ max: 500 }, { type: 'url', message: '请输入合法的 URL', warningOnly: true }]}
          >
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item
            label="旅行社业务经营许可证号"
            name="travelAgencyLicenseNo"
            rules={[{ max: 64 }]}
          >
            <Input placeholder="如 L-ZJ-XXXXX（旅游类主体建议登记）" />
          </Form.Item>
          <Form.Item
            label="旅行社许可证附件地址"
            name="travelAgencyLicenseUrl"
            rules={[{ max: 500 }]}
          >
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item label="合作与推广服务协议附件地址" name="agreementUrl" rules={[{ max: 500 }]}>
            <Input placeholder="https://..." />
          </Form.Item>

          <Typography.Title level={5}>对公结算信息</Typography.Title>
          <Form.Item
            label="对公账户名"
            name="bankAccountName"
            tooltip="审核硬门槛之一：月结批次只会纳入对公账户信息完整的商户"
            rules={[{ max: 200 }]}
          >
            <Input placeholder="须与营业执照名称一致" />
          </Form.Item>
          <Form.Item label="对公账号" name="bankAccountNo" rules={[{ max: 64 }]}>
            <Input placeholder="列表页只显示后 4 位，编辑时回填完整值" />
          </Form.Item>
          <Form.Item label="开户行" name="bankName" rules={[{ max: 200 }]}>
            <Input placeholder="如 中国银行丽水分行营业部" />
          </Form.Item>

          <Typography.Title level={5}>费率覆盖（留空＝继承全局参数）</Typography.Title>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`分成率上限：安卓 ≤ ${shareRateMax(CHANNEL_FEE_ANDROID_DEFAULT)}%，iOS ≤ ${shareRateMax(CHANNEL_FEE_IOS_DEFAULT)}%`}
            description="上限 = 100 − 该平台渠道费率（安卓 1%、iOS 12%）。平台到手 = 用户实付 − 渠道费，分成一旦超过平台到手，下单会被资损闸门直接拒掉，该商户名下所有线路的打赏都报「分成配置异常」。权威校验在后端（4064），渠道费率以 sys_config 为准。"
          />
          <Form.Item
            label="安卓端商家分成率(%)"
            name="androidShareRate"
            tooltip="留空表示继承全局 reward.share.rate.android"
          >
            <InputNumber
              min={0}
              max={shareRateMax(CHANNEL_FEE_ANDROID_DEFAULT)}
              step={0.01}
              precision={2}
              addonAfter="%"
              style={{ width: 200 }}
              placeholder="留空＝继承全局"
            />
          </Form.Item>
          <Form.Item
            label="iOS 端商家分成率(%)"
            name="iosShareRate"
            tooltip="留空表示继承全局 reward.share.rate.ios"
          >
            <InputNumber
              min={0}
              max={shareRateMax(CHANNEL_FEE_IOS_DEFAULT)}
              step={0.01}
              precision={2}
              addonAfter="%"
              style={{ width: 200 }}
              placeholder="留空＝继承全局"
            />
          </Form.Item>
          <Form.Item
            label="商户级平台佣金率(%)"
            name="commissionRate"
            tooltip="留空表示继承全局 reward.commission.rate"
          >
            <InputNumber
              min={0}
              max={100}
              step={0.01}
              precision={2}
              addonAfter="%"
              style={{ width: 200 }}
              placeholder="留空＝继承全局"
            />
          </Form.Item>

          <Typography.Title level={5}>合作与状态</Typography.Title>
          <Form.Item label="合作开始日期" name="cooperationStartDate">
            <DatePicker style={{ width: 200 }} />
          </Form.Item>
          <Form.Item label="合作结束日期" name="cooperationEndDate" tooltip="留空表示长期合作">
            <DatePicker style={{ width: 200 }} />
          </Form.Item>
          <Form.Item
            label="状态"
            name="status"
            tooltip="停用后该商户名下线路立即不能被打赏，主体与账务仍保留"
          >
            <Radio.Group options={MerchantStatusOptions} optionType="button" />
          </Form.Item>
          <Form.Item label="联系人" name="contactName" rules={[{ max: 64 }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item
            label="联系电话"
            name="contactPhone"
            rules={[
              { max: 32 },
              { pattern: /^[0-9+\-\s()]{6,32}$/, message: '联系电话格式不正确', warningOnly: true },
            ]}
          >
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item label="备注" name="remark" rules={[{ max: 500 }]}>
            <Input.TextArea rows={3} placeholder="如 2026 年度合作，纸质协议已归档" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* ---------- 审核 ---------- */}
      <Modal
        title={`入驻审核：${auditTarget?.merchantName ?? ''}`}
        open={!!auditTarget}
        width={620}
        onCancel={() => setAuditTarget(null)}
        onOk={submitAudit}
        okText="提交审核结论"
        cancelText="取消"
        confirmLoading={auditSubmitting}
        destroyOnClose
      >
        {auditTarget?.auditStatus === MerchantAuditStatusEnum.APPROVED && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="该商户当前是「已通过」"
            description="把已通过改成拒绝＝撤销合作资格，历史订单与账务不受影响，但撤销后月结批次不再纳入该商户。请确认这是你要的操作。"
          />
        )}
        {gaps.length > 0 && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message="审核门槛未满足，选「通过」会被后端拒绝"
            description={
              <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
                {gaps.map((g) => (
                  <li key={g.key}>
                    <Typography.Text style={{ fontSize: 12 }}>{g.label}</Typography.Text>
                  </li>
                ))}
              </ul>
            }
          />
        )}
        <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label="统一社会信用代码">
            {auditTarget?.creditCode ?? '--'}
          </Descriptions.Item>
          <Descriptions.Item label="开票能力">
            {MerchantInvoiceLabel[
              auditTarget?.invoiceCapability as keyof typeof MerchantInvoiceLabel
            ] ?? '未登记'}
          </Descriptions.Item>
          <Descriptions.Item label="营业执照">
            <UrlText url={auditTarget?.licenseUrl} required />
          </Descriptions.Item>
          <Descriptions.Item label="对公账户">
            {auditTarget?.bankAccountName
              ? `${auditTarget.bankAccountName} / ${maskBankAccountNo(auditTarget.bankAccountNo)}`
              : '未登记'}
          </Descriptions.Item>
        </Descriptions>
        <Form form={auditForm} layout="vertical">
          <Form.Item
            label="审核结论"
            name="pass"
            rules={[{ required: true, message: '请选择审核结论' }]}
          >
            <Radio.Group
              optionType="button"
              options={[
                { label: '通过', value: true },
                { label: '拒绝', value: false },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="审核意见"
            name="auditRemark"
            tooltip="拒绝时必填：商家要知道差哪份材料，否则只会反复提交同样的资料"
            rules={[
              { max: 500 },
              {
                validator: (_, value) =>
                  auditPass === false && !String(value ?? '').trim()
                    ? Promise.reject(new Error('拒绝入驻必须填写审核意见（说明缺哪份材料）'))
                    : Promise.resolve(),
              },
            ]}
          >
            <Input.TextArea
              rows={3}
              placeholder={
                auditPass === false ? '如：营业执照附件缺失，请补传后重新提交' : '通过时可选填'
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ---------- 详情 ---------- */}
      <Drawer
        title="商户详情"
        width={760}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        destroyOnClose
      >
        <Spin spinning={detailLoading}>
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="商户ID">{detail?.merchantId ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="商户名称">{detail?.merchantName ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="统一社会信用代码">
              {detail?.creditCode ?? '--'}
            </Descriptions.Item>
            <Descriptions.Item label="法定代表人">{detail?.legalPerson ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="入驻审核">
              <Tag
                color={
                  MerchantAuditStatusColor[detail?.auditStatus ?? MerchantAuditStatusEnum.PENDING]
                }
              >
                {
                  MerchantAuditStatusLabel[
                    (detail?.auditStatus ??
                      MerchantAuditStatusEnum.PENDING) as keyof typeof MerchantAuditStatusLabel
                  ]
                }
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="开票能力">
              <Tag color={MerchantInvoiceColor[detail?.invoiceCapability] ?? 'default'}>
                {MerchantInvoiceLabel[
                  detail?.invoiceCapability as keyof typeof MerchantInvoiceLabel
                ] ?? '未登记'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="审核人">{detail?.auditBy ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="审核时间">{fmtTime(detail?.auditTime)}</Descriptions.Item>
            <Descriptions.Item label="审核意见" span={2}>
              <Typography.Text style={{ whiteSpace: 'pre-wrap' }}>
                {detail?.auditRemark || '--'}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="营业执照" span={2}>
              <UrlText url={detail?.licenseUrl} required />
            </Descriptions.Item>
            <Descriptions.Item label="旅行社许可证号">
              {detail?.travelAgencyLicenseNo ?? '--'}
            </Descriptions.Item>
            <Descriptions.Item label="旅行社许可证附件">
              <UrlText url={detail?.travelAgencyLicenseUrl} />
            </Descriptions.Item>
            <Descriptions.Item label="合作协议附件" span={2}>
              <UrlText url={detail?.agreementUrl} />
            </Descriptions.Item>
            <Descriptions.Item label="对公账户名">
              {detail?.bankAccountName ?? '--'}
            </Descriptions.Item>
            <Descriptions.Item label="开户行">{detail?.bankName ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="对公账号" span={2}>
              <Typography.Text copyable={{ text: detail?.bankAccountNo }}>
                {detail?.bankAccountNo ?? '--'}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="安卓分成率">
              <RateText value={detail?.androidShareRate} />
            </Descriptions.Item>
            <Descriptions.Item label="iOS 分成率">
              <RateText value={detail?.iosShareRate} />
            </Descriptions.Item>
            <Descriptions.Item label="平台佣金率">
              <RateText value={detail?.commissionRate} />
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {detail?.status === StatusEnum.DISABLED ? (
                <Tag>停用</Tag>
              ) : (
                <Tag color="green">{MerchantStatusLabel[StatusEnum.NORMAL]}</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="合作开始">
              {fmtDate(detail?.cooperationStartDate)}
            </Descriptions.Item>
            <Descriptions.Item label="合作结束">
              {fmtDate(detail?.cooperationEndDate)}
            </Descriptions.Item>
            <Descriptions.Item label="联系人">{detail?.contactName ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{detail?.contactPhone ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{fmtTime(detail?.createTime)}</Descriptions.Item>
            <Descriptions.Item label="最近更新">{fmtTime(detail?.updateTime)}</Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {detail?.remark || '--'}
            </Descriptions.Item>
          </Descriptions>
        </Spin>
      </Drawer>
    </>
  );
};

export default RewardMerchant;
