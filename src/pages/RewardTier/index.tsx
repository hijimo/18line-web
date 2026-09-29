import { CloudUploadOutlined, PlusOutlined, SendOutlined, SyncOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Dropdown,
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
  codePointLength,
  DEFAULT_ALLOW_PLATFORMS,
  fenToYuan,
  GOODS_ID_MAX_LEN,
  GOODS_ID_PATTERN,
  GOODS_NAME_MAX_LEN,
  GOODS_REMARK_MAX_LEN,
  GoodsErrorCode,
  isTierUploaded,
  parseAllowPlatforms,
  RewardEnvColor,
  RewardEnvEnum,
  RewardEnvLabel,
  TIER_PRICE_PRESETS,
  TierPlatformLabel,
  TierPlatformOptions,
  TierPublishStatusColor,
  TierPublishStatusEnum,
  TierPublishStatusLabel,
  TierUploadStatusColor,
  TierUploadStatusEnum,
  TierUploadStatusLabel,
} from '@/enums';
import { get as getRewardTierApi } from '@/services/api/打赏档位与道具/打赏档位与道具';

const rewardTierApi = getRewardTierApi();

const ENV_OPTIONS = Object.entries(RewardEnvLabel).map(([value, label]) => ({ label, value }));
const UPLOAD_STATUS_OPTIONS = Object.entries(TierUploadStatusLabel).map(([value, label]) => ({
  label,
  value,
}));
const PUBLISH_STATUS_OPTIONS = Object.entries(TierPublishStatusLabel).map(([value, label]) => ({
  label,
  value,
}));
const YES_NO_OPTIONS = [
  { label: '正式', value: '0' },
  { label: '测试', value: '1' },
];
const STATUS_OPTIONS = [
  { label: '正常', value: '0' },
  { label: '停用', value: '1' },
];

const fmtTime = (v?: string | Date | null) => (v ? dayjs(v).format(DATE_FORMAT_FULL_TIME) : '--');

/** 金额（分）展示。资金数字必须带单位，避免运营把「分」当「元」 */
const Money: React.FC<{ fen?: number | null; suffix?: string }> = ({ fen, suffix = '元' }) => (
  <span className="nowrap">
    {fen === null || fen === undefined ? '--' : `${fenToYuan(fen)} ${suffix}`}
  </span>
);

/**
 * 单档位道具操作的运行时覆盖态。
 *
 * 为什么不只用列表里的 uploadStatus/publishStatus：
 * 「提交成功」只代表微信受理了任务（pending=true），本地状态此时是「上传中/发布中」，
 * 而「价格不一致(4045)」这个资损信号只在提交发布的响应里出现，列表接口不带。
 * 这里把最近一次操作的结论按 tierId 缓存下来，用于禁用按钮与告警，刷新列表后依然保留。
 */
type GoodsOverlay = {
  /** 任务已受理、终态待同步 */
  pending?: boolean;
  /** 本地价格与微信侧不一致，禁止发布（资损红线） */
  priceMismatch?: boolean;
  /** 最近一次操作的说明，展示在详情里 */
  lastMessage?: string;
};

/** 从被拦截器包装过的业务异常里取后端 code（request.ts 把 code 挂在 Error 上） */
const errCode = (e: unknown): number | undefined => (e as { code?: number })?.code;

const RewardTier: React.FC = () => {
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
  const [detailAvailable, setDetailAvailable] = useState<boolean | null>(null);

  // ---- 道具操作 ----
  const [overlay, setOverlay] = useState<Record<number, GoodsOverlay>>({});
  const [busyTierId, setBusyTierId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  const request = useTableRequest(rewardTierApi.rewardTierList as any);

  const patchOverlay = (tierId: number | undefined, patch: GoodsOverlay) => {
    if (tierId === undefined || tierId === null) return;
    setOverlay((prev) => ({ ...prev, [tierId]: { ...prev[tierId], ...patch } }));
  };

  // ==================== 新增 / 编辑 ====================

  const openDrawer = (record?: any) => {
    setCurrentRecord(record ?? null);
    if (record) {
      form.setFieldsValue({
        ...record,
        priceYuan: record.priceFen != null ? record.priceFen / 100 : undefined,
        allowPlatforms: parseAllowPlatforms(record.allowPlatforms),
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        env: RewardEnvEnum.PROD,
        isTest: '0',
        status: '0',
        sortOrder: 0,
        allowPlatforms: parseAllowPlatforms(DEFAULT_ALLOW_PLATFORMS),
      });
    }
    setDrawerOpen(true);
  };

  /** 已上传到微信的档位，price/wxProductId/env 三个字段被后端锁死（4046） */
  const locked = isTierUploaded(currentRecord?.uploadStatus);

  const handleSubmit = async () => {
    let values: any;
    try {
      values = await form.validateFields();
    } catch {
      // 校验未通过：表单已就地标红
      return;
    }

    /**
     * 元 → 分必须 round：0.1+0.2 之类的浮点误差会让金额差 1 分，
     * 而 price_fen 是下单金额、商家分成、平台佣金三者的唯一来源，
     * 差 1 分会让每一笔订单的账都对不上微信侧实收。
     */
    const priceYuan = values.priceYuan;
    const priceFen =
      priceYuan === undefined || priceYuan === null || priceYuan === ''
        ? undefined
        : Math.round(Number(priceYuan) * 100);

    // 出网前对**实际请求体**再校一遍金额，这是最后一道闸门。
    // rc-input-number 对越界输入不触发 onChange，「输入框显示 0、表单值是 undefined」
    // 是真实会出现的状态，而 priceFen 缺失会让后端按 null 写库或按 0 记账。
    if (!Number.isFinite(priceFen as number) || (priceFen as number) <= 0) {
      message.error('道具单价必须大于 0，已阻止提交');
      return;
    }

    const payload: Record<string, unknown> = {
      tierCode: values.tierCode,
      tierName: values.tierName,
      wxProductId: values.wxProductId,
      priceFen,
      env: values.env,
      isTest: values.isTest,
      allowPlatforms: (values.allowPlatforms ?? []).join(','),
      itemUrl: values.itemUrl,
      sortOrder: values.sortOrder ?? 0,
      status: values.status,
      remark: values.remark,
    };

    setSubmitting(true);
    try {
      if (currentRecord?.tierId) {
        await rewardTierApi.rewardTierEdit({ ...payload, tierId: currentRecord.tierId } as any);
        message.success('档位已保存');
      } else {
        await rewardTierApi.rewardTierAdd(payload as any);
        message.success('档位已新增');
      }
      // 改了单价就可能与微信侧道具价格不一致，清掉旧的「价格一致」假设，
      // 让下一次发布重新走后端的价格核对
      patchOverlay(currentRecord?.tierId, { priceMismatch: false });
      setDrawerOpen(false);
      actionRef.current?.reload();
    } catch (e) {
      // 拦截器已弹出后端原文（含 4046「已上传后单价不可修改」这类可操作说明）
      if (errCode(e) === GoodsErrorCode.FIELD_LOCKED) {
        // 本地记录已过期（别人刚上传过），刷新让锁生效
        actionRef.current?.reload();
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== 道具上传 / 发布 ====================

  /**
   * 处理上传/发布响应。
   *
   * 契约（与打赏订单/结算页一致）：**业务失败也是 HTTP 层 code=200**，
   * 结论放在 `data`（RewardTierGoodsVO）里，页面据 `data.code` 分派文案。
   * 后端之所以不用 AjaxResult.error(vo.code)，是因为 request.ts 的拦截器对
   * code!=200 会「弹 toast + 抛异常」，抛出的 Error 不带 data，
   * 页面就拿不到 priceMismatch / wxPriceFen / pending 这些决定按钮态的字段。
   *
   * 成功分支必须区分 pending：`start_*` 返回 errcode=0 只是「微信受理了任务」，
   * 显示成「已完成」会让运营停止跟进，档位就永远挂在上传中。
   */
  const handleGoodsResult = (record: any, res: any, kind: '上传' | '发布') => {
    const vo = res?.data ?? {};

    if (vo.success) {
      if (vo.pending) {
        message.warning(`${kind}任务已提交，等待微信处理；请稍后点「同步道具状态」确认结果`);
        patchOverlay(record.tierId, {
          pending: true,
          priceMismatch: false,
          lastMessage: vo.message,
        });
      } else {
        message.success(vo.message || `${kind}成功`);
        patchOverlay(record.tierId, { pending: false, lastMessage: vo.message });
      }
      actionRef.current?.reload();
      return;
    }

    switch (vo.code) {
      case GoodsErrorCode.PRICE_MISMATCH:
        // 资损红线：本地按 A 价记账、用户按微信侧 B 价付款，商家应付流水凭空多一截。
        // 必须挡住发布并把两个价格摊给运营看，不能只留一条一闪而过的 toast。
        patchOverlay(record.tierId, { priceMismatch: true, pending: false });
        Modal.error({
          title: '价格不一致，已阻止发布',
          width: 640,
          content: (
            <div>
              <p>{vo.message}</p>
              {vo.wxPriceFen != null && (
                <p>
                  微信侧实际价格：
                  <Money fen={vo.wxPriceFen} />
                  ；本地单价：
                  <Money fen={record.priceFen} />
                </p>
              )}
              <p>
                处置方式二选一：① 把本地单价改回与微信侧一致；② 换一个新的微信道具ID重新上传。
                在两者一致之前，<b>不要</b>再点发布。
              </p>
            </div>
          ),
        });
        break;
      case GoodsErrorCode.TASK_RUNNING:
        // 不是失败：同环境已有任务在跑（微信 268490012）。
        // 按钮转成「上传中/发布中」并提示去同步，避免运营再点一次
        patchOverlay(record.tierId, { pending: true, lastMessage: vo.message });
        message.warning(vo.message || '该环境已有任务在处理中，请稍后同步状态');
        break;
      case GoodsErrorCode.IMAGE_MISSING:
        patchOverlay(record.tierId, { pending: false, lastMessage: vo.message });
        Modal.warning({
          title: '道具图片未配置',
          content: <p>{vo.message}</p>,
        });
        break;
      case GoodsErrorCode.NOT_UPLOADED:
      case GoodsErrorCode.PARAM_INVALID:
      case GoodsErrorCode.CALL_FAILED:
      case GoodsErrorCode.UPLOAD_FAILED:
      case GoodsErrorCode.PUBLISH_FAILED:
        patchOverlay(record.tierId, { pending: false, lastMessage: vo.message });
        message.error(vo.message || `${kind}失败`);
        break;
      default:
        patchOverlay(record.tierId, { lastMessage: vo.message });
        message.error(vo.message || `${kind}失败`);
        break;
    }
    actionRef.current?.reload();
  };

  const runUpload = async (record: any) => {
    setBusyTierId(record.tierId);
    try {
      const res: any = await rewardTierApi.rewardTierUploadGoods({ tierId: record.tierId });
      handleGoodsResult(record, res, '上传');
    } catch {
      // 走到这里说明不是业务失败而是真异常（网络、权限、档位已被别人删除），
      // 拦截器已弹出原因；刷新让列表与库里的真实状态对齐
      actionRef.current?.reload();
    } finally {
      setBusyTierId(null);
    }
  };

  const runPublish = async (record: any) => {
    setBusyTierId(record.tierId);
    try {
      const res: any = await rewardTierApi.rewardTierPublishGoods({ tierId: record.tierId });
      handleGoodsResult(record, res, '发布');
    } catch {
      // 同 runUpload：真异常由拦截器提示，这里只负责刷新
      actionRef.current?.reload();
    } finally {
      setBusyTierId(null);
    }
  };

  // ==================== 状态同步 ====================

  const showSyncResult = (title: string, res: any) => {
    const data = res?.data;
    const summaries: any[] = Array.isArray(data) ? data : data ? [data] : [];
    Modal.info({
      title,
      width: 720,
      content: (
        <div>
          <p>{res?.msg || '同步完成'}</p>
          {summaries.map((s, idx) => (
            <div key={`${s?.env ?? 'env'}-${idx}`}>
              {s?.priceMismatched > 0 && (
                <Alert
                  type="error"
                  showIcon
                  style={{ marginBottom: 8 }}
                  message={`检出 ${s.priceMismatched} 个档位本地价格与微信侧不一致，已禁止发布，需人工核对`}
                />
              )}
              {Array.isArray(s?.details) && s.details.length > 0 && (
                <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
                  {s.details.map((d: string, i: number) => (
                    <li key={i}>
                      <Typography.Text style={{ fontSize: 12 }}>{d}</Typography.Text>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ),
    });
  };

  /** 只同步「上传中/发布中」的档位：无中间态时后端一次微信接口都不调，可放心多点 */
  const syncPending = async () => {
    setSyncing(true);
    try {
      const res: any = await rewardTierApi.rewardTierSyncPending();
      showSyncResult('待处理档位同步结果', res);
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示
    } finally {
      setSyncing(false);
    }
  };

  /** 全量对账：不看本地状态，用于怀疑本地与微信侧不一致时 */
  const syncByEnv = async (env: string) => {
    setSyncing(true);
    try {
      const res: any = await rewardTierApi.rewardTierSyncGoods({ env } as any);
      showSyncResult(
        `${RewardEnvLabel[env as keyof typeof RewardEnvLabel] ?? env}全量对账结果`,
        res,
      );
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示
    } finally {
      setSyncing(false);
    }
  };

  // ==================== 详情 / 删除 ====================

  const openDetail = async (record: any) => {
    setDetail(record);
    setDetailAvailable(null);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res: any = await rewardTierApi.rewardTierDetail({ tierId: record.tierId });
      if (res?.code === 200) {
        setDetail(res.data);
        // availableForUser 是后端 RewardTierGate 的权威结论（含开关与环境差异），
        // 列表接口不带，只有详情接口给
        setDetailAvailable(typeof res.availableForUser === 'boolean' ? res.availableForUser : null);
      }
    } catch {
      // 拦截器已提示，抽屉继续展示列表里的旧数据
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await rewardTierApi.rewardTierRemove({ tierIds: record.tierId } as any);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      // 已发布档位禁止删除（4046），拦截器已弹出后端原文
      actionRef.current?.reload();
    }
  };

  // ==================== 列 ====================

  /**
   * 「生效状态」只是展示提示。
   *
   * 权威判定在后端 RewardTierGate：现网要求 publish_status=2 且已过 effective_time，
   * 沙箱恒放行（沙箱道具常在 MP 后台手工发布，本地状态不知情）。
   * 前端不复刻开关 reward.tier.published.required，需要确定结论时看详情里的 availableForUser。
   */
  const renderGate = (r: any) => {
    if (r.status === '1') return <Tag>已停用</Tag>;
    if (r.env === RewardEnvEnum.SANDBOX) return <Tag color="orange">沙箱不校验生效</Tag>;
    if (r.publishStatus !== TierPublishStatusEnum.DONE) return <Tag color="default">未发布</Tag>;
    if (!r.effectiveTime) return <Tag color="success">已生效</Tag>;
    const eff = dayjs(r.effectiveTime);
    if (dayjs().isBefore(eff)) {
      const minutes = Math.max(1, eff.diff(dayjs(), 'minute'));
      return (
        <Tooltip title={`生效时间 ${eff.format(DATE_FORMAT_FULL_TIME)}，此前前台不下发该档位`}>
          <Tag color="warning">等待生效（约 {minutes} 分钟）</Tag>
        </Tooltip>
      );
    }
    return <Tag color="success">已生效</Tag>;
  };

  const columns = [
    key,
    { title: '档位码', dataIndex: 'tierCode', width: 100, ellipsis: true },
    { title: '道具名称', dataIndex: 'tierName', width: 130, ellipsis: true },
    {
      title: '微信道具ID',
      dataIndex: 'wxProductId',
      width: 130,
      ellipsis: true,
      render: (_: any, r: any) => (
        <Typography.Text copyable={{ text: r.wxProductId }}>{r.wxProductId}</Typography.Text>
      ),
    },
    {
      title: '单价',
      dataIndex: 'priceFen',
      width: 100,
      search: false,
      align: 'right',
      render: (_: any, r: any) => <Money fen={r.priceFen} />,
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
      title: '类型',
      dataIndex: 'isTest',
      width: 90,
      valueType: 'select',
      fieldProps: { options: YES_NO_OPTIONS },
      render: (_: any, r: any) =>
        r.isTest === '1' ? <Tag color="magenta">测试档位</Tag> : <Tag>正式</Tag>,
    },
    {
      title: '允许终端',
      dataIndex: 'allowPlatforms',
      width: 200,
      search: false,
      render: (_: any, r: any) => {
        const list = parseAllowPlatforms(r.allowPlatforms);
        if (list.length === 0) return '不限';
        return (
          <Space size={2} wrap>
            {list.map((p) => (
              <Tag key={p}>{TierPlatformLabel[p as keyof typeof TierPlatformLabel] ?? p}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '上传状态',
      dataIndex: 'uploadStatus',
      width: 110,
      valueType: 'select',
      fieldProps: { options: UPLOAD_STATUS_OPTIONS },
      render: (_: any, r: any) => (
        <Tooltip title={r.goodsMsg || undefined}>
          <Tag color={TierUploadStatusColor[r.uploadStatus]}>
            {TierUploadStatusLabel[r.uploadStatus as keyof typeof TierUploadStatusLabel] ??
              r.uploadStatus ??
              '未上传'}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: '发布状态',
      dataIndex: 'publishStatus',
      width: 110,
      valueType: 'select',
      fieldProps: { options: PUBLISH_STATUS_OPTIONS },
      render: (_: any, r: any) => {
        const mismatch = overlay[r.tierId]?.priceMismatch;
        return (
          <Space size={2} wrap>
            <Tag color={TierPublishStatusColor[r.publishStatus]}>
              {TierPublishStatusLabel[r.publishStatus as keyof typeof TierPublishStatusLabel] ??
                r.publishStatus ??
                '未发布'}
            </Tag>
            {mismatch && (
              <Tooltip title="本地单价与微信侧道具价格不一致，已禁止发布">
                <Tag color="error">价格不一致</Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: '生效状态',
      dataIndex: 'effectiveTime',
      width: 160,
      search: false,
      render: (_: any, r: any) => renderGate(r),
    },
    { title: '排序', dataIndex: 'sortOrder', width: 70, search: false, align: 'right' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      fieldProps: { options: STATUS_OPTIONS },
      render: (_: any, r: any) =>
        r.status === '1' ? <Tag color="error">停用</Tag> : <Tag color="success">正常</Tag>,
    },
    {
      title: '最近同步',
      dataIndex: 'goodsSyncTime',
      width: 170,
      search: false,
      render: (_: any, r: any) => fmtTime(r.goodsSyncTime),
    },
    {
      ...option,
      width: 250,
      render: (_: any, record: any) => {
        const uploading = record.uploadStatus === TierUploadStatusEnum.RUNNING;
        const uploaded = record.uploadStatus === TierUploadStatusEnum.DONE;
        const publishing = record.publishStatus === TierPublishStatusEnum.RUNNING;
        const published = record.publishStatus === TierPublishStatusEnum.DONE;
        const mismatch = !!overlay[record.tierId]?.priceMismatch;
        const busy = busyTierId === record.tierId;

        // 上传按钮：上传中一律禁用。重复提交必撞 268490012，
        // 表现为「明明提交成功了却报失败」，比禁用按钮难排查得多
        const uploadBtn = uploading ? (
          <Tooltip title="任务已受理，等待微信处理；请点「同步道具状态」查看结果">
            <Button type="link" size="small" disabled>
              上传中
            </Button>
          </Tooltip>
        ) : (
          <Popconfirm
            title={uploaded ? '道具已上传，确定重新提交上传？' : '提交道具上传任务？'}
            description={
              uploaded
                ? '重新上传会覆盖微信侧同名道具的信息（单价不可改，改价请新建道具ID）'
                : '微信只受理任务，终态需稍后点「同步道具状态」确认'
            }
            onConfirm={() => runUpload(record)}
          >
            <Button type="link" size="small" icon={<CloudUploadOutlined />} loading={busy}>
              {uploaded ? '重新上传' : '上传道具'}
            </Button>
          </Popconfirm>
        );

        // 发布按钮：必须「已上传成功」才可发布；价格不一致时禁用（资损红线）
        let publishBtn: React.ReactNode;
        if (publishing) {
          publishBtn = (
            <Tooltip title="发布任务已受理，等待微信处理；发布成功后约 10 分钟生效">
              <Button type="link" size="small" disabled>
                发布中
              </Button>
            </Tooltip>
          );
        } else if (published) {
          publishBtn = (
            <Tooltip title="已发布。如需改价请新建道具ID，不要直接改本地单价">
              <Button type="link" size="small" disabled>
                已发布
              </Button>
            </Tooltip>
          );
        } else if (!uploaded) {
          publishBtn = (
            <Tooltip title="道具尚未上传成功，请先提交上传并同步到「已上传」">
              <Button type="link" size="small" disabled>
                发布道具
              </Button>
            </Tooltip>
          );
        } else if (mismatch) {
          publishBtn = (
            <Tooltip title="本地单价与微信侧道具价格不一致，已禁止发布；请核对后重试">
              <Button type="link" size="small" danger disabled>
                发布道具
              </Button>
            </Tooltip>
          );
        } else {
          publishBtn = (
            <Popconfirm
              title="提交道具发布任务？"
              description="发布前会向微信核对该道具的实际价格；发布成功后约 10 分钟对用户生效"
              onConfirm={() => runPublish(record)}
            >
              <Button type="link" size="small" icon={<SendOutlined />} loading={busy}>
                发布道具
              </Button>
            </Popconfirm>
          );
        }

        return (
          <Space size={0} wrap>
            <Button type="link" size="small" onClick={() => openDetail(record)}>
              详情
            </Button>
            <Button type="link" size="small" onClick={() => openDrawer(record)}>
              编辑
            </Button>
            {uploadBtn}
            {publishBtn}
            <Popconfirm
              title="确定删除该档位？"
              description="已发布的档位不能删除；删除后前台立即不再下发"
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

  return (
    <>
      <CommonTable<any, any>
        actionRef={actionRef}
        rowKey="tierId"
        headerTitle="打赏档位（虚拟支付道具）"
        columns={columns as any}
        request={request as any}
        pagination={{ defaultPageSize: 20, showSizeChanger: true }}
        options={{ density: true, reload: true, setting: true }}
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            新增档位
          </Button>,
          <Button
            key="sync-pending"
            icon={<SyncOutlined spin={syncing} />}
            loading={syncing}
            onClick={syncPending}
          >
            同步道具状态
          </Button>,
          <Dropdown
            key="sync-env"
            menu={{
              items: [
                { key: RewardEnvEnum.PROD, label: '现网（env=0）全量对账' },
                { key: RewardEnvEnum.SANDBOX, label: '沙箱（env=1）全量对账' },
              ],
              onClick: ({ key: env }) => syncByEnv(env),
            }}
          >
            <Button loading={syncing}>全量对账</Button>
          </Dropdown>,
        ]}
      />

      {/* ---------- 新增 / 编辑 ---------- */}
      <Drawer
        title={currentRecord ? `编辑档位：${currentRecord.tierName ?? ''}` : '新增档位'}
        width={620}
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
        {locked && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="该档位道具已上传至微信"
            description="单价、微信道具ID、支付环境已被锁定（改动会被后端拒绝，错误码 4046）。改价等于换一个道具，请新建档位并用新的道具ID重新上传发布。"
          />
        )}
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="保存只是写入本地配置，用户还看不到"
          description="保存后必须依次点「上传道具」→「同步道具状态」确认已上传 →「发布道具」→ 再同步一次；现网发布成功后约 10 分钟才对用户生效。"
        />
        <Form form={form} layout="vertical">
          <Form.Item
            label="档位业务码"
            name="tierCode"
            tooltip="内部标识，如 T001/T005；不提交给微信"
            rules={[{ required: true, message: '请输入档位业务码' }, { max: 32 }]}
          >
            <Input placeholder="如 T005" />
          </Form.Item>
          <Form.Item
            label="道具名称"
            name="tierName"
            tooltip="提交给微信的道具名称，官方限 20 字符（中文按 1 个字符计）"
            rules={[
              { required: true, message: '请输入道具名称' },
              {
                validator: (_, value) =>
                  codePointLength(value) <= GOODS_NAME_MAX_LEN
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(
                          `道具名称限 ${GOODS_NAME_MAX_LEN} 字符，当前 ${codePointLength(value)} 字符`,
                        ),
                      ),
              },
            ]}
          >
            <Input placeholder="如 小心意（前台展示为「鼓励一下」类文案）" maxLength={40} />
          </Form.Item>
          <Form.Item
            label="微信道具ID"
            name="wxProductId"
            tooltip={`官方限 ${GOODS_ID_MAX_LEN} 字符，只允许字母、数字、下划线、连字符；(道具ID, 环境) 唯一`}
            rules={[
              { required: true, message: '请输入微信道具ID' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  if (codePointLength(value) > GOODS_ID_MAX_LEN) {
                    return Promise.reject(new Error(`道具ID限 ${GOODS_ID_MAX_LEN} 字符`));
                  }
                  return GOODS_ID_PATTERN.test(value)
                    ? Promise.resolve()
                    : Promise.reject(new Error('只允许字母、数字、下划线、连字符'));
                },
              },
            ]}
          >
            <Input placeholder="如 rw-5" disabled={locked} />
          </Form.Item>
          <Form.Item label="道具单价" required style={{ marginBottom: 0 }}>
            <Space align="start" wrap>
              <Form.Item
                name="priceYuan"
                tooltip="单位元，保存时换算成分。必须与微信侧道具价格严格一致，否则发布时会被拦下（4045）"
                rules={[{ required: true, message: '请输入道具单价' }]}
              >
                <InputNumber
                  min={0.01}
                  step={1}
                  precision={2}
                  addonAfter="元"
                  disabled={locked}
                  style={{ width: 180 }}
                  placeholder="如 5.00"
                />
              </Form.Item>
              <Form.Item>
                <Select
                  placeholder="常用金额"
                  style={{ width: 180 }}
                  options={TIER_PRICE_PRESETS}
                  disabled={locked}
                  onChange={(v) => form.setFieldsValue({ priceYuan: v / 100 })}
                />
              </Form.Item>
            </Space>
          </Form.Item>
          <Form.Item
            label="支付环境"
            name="env"
            tooltip="沙箱与现网是两套道具，需分别建档位、分别上传发布"
            rules={[{ required: true }]}
          >
            <Radio.Group options={ENV_OPTIONS} optionType="button" disabled={locked} />
          </Form.Item>
          <Form.Item
            label="是否测试档位"
            name="isTest"
            tooltip="测试档位用于联调（如 0.01 元档），不影响正式档位的下发"
          >
            <Select options={YES_NO_OPTIONS} style={{ width: 180 }} />
          </Form.Item>
          <Form.Item
            label="允许下单终端"
            name="allowPlatforms"
            tooltip="留空表示不限。iOS 有最低价格限制，若某终端不支持该金额请取消勾选"
          >
            <Select mode="multiple" options={TierPlatformOptions} placeholder="不限" />
          </Form.Item>
          <Form.Item
            label="道具图片地址"
            name="itemUrl"
            tooltip="官方必填项，仅支持 jpg/png，必须是公网可访问的 http(s) 绝对地址；缺失时提交上传会被拦下（4042）"
            rules={[
              { required: true, message: '请填写道具图片地址（微信官方必填项）' },
              {
                validator: (_, value) =>
                  !value || /^https?:\/\//.test(value)
                    ? Promise.resolve()
                    : Promise.reject(new Error('必须是 http(s) 绝对地址')),
              },
            ]}
          >
            <Input placeholder="https://.../reward-5.png" />
          </Form.Item>
          <Form.Item label="展示排序" name="sortOrder" tooltip="前台档位按此升序展示">
            <InputNumber min={0} step={1} precision={0} style={{ width: 180 }} />
          </Form.Item>
          <Form.Item label="状态" name="status" tooltip="停用后前台立即不再下发该档位">
            <Radio.Group options={STATUS_OPTIONS} optionType="button" />
          </Form.Item>
          <Form.Item
            label="道具备注"
            name="remark"
            tooltip={`作为道具 remark 提交给微信，官方限 ${GOODS_REMARK_MAX_LEN} 字符`}
            rules={[
              {
                validator: (_, value) =>
                  codePointLength(value) <= GOODS_REMARK_MAX_LEN
                    ? Promise.resolve()
                    : Promise.reject(new Error(`备注限 ${GOODS_REMARK_MAX_LEN} 字符`)),
              },
            ]}
          >
            <Input.TextArea rows={3} placeholder="如 5元档" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* ---------- 详情 ---------- */}
      <Drawer
        title="档位详情"
        width={720}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        destroyOnClose
      >
        <Spin spinning={detailLoading}>
          {detailAvailable !== null && (
            <Alert
              type={detailAvailable ? 'success' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
              message={detailAvailable ? '后端判定：当前对前台可用' : '后端判定：当前对前台不可用'}
              description={
                detailAvailable
                  ? '前台档位列表会下发该档位，用户可以下单'
                  : '未发布 / 未到生效时间 / 已停用 / 现网开关要求已发布生效。生效判定以后端 RewardTierGate 为准'
              }
            />
          )}
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="档位ID">{detail?.tierId ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="档位业务码">{detail?.tierCode ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="道具名称">{detail?.tierName ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="微信道具ID">{detail?.wxProductId ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="道具单价">
              <Money fen={detail?.priceFen} />
            </Descriptions.Item>
            <Descriptions.Item label="支付环境">
              {RewardEnvLabel[detail?.env as keyof typeof RewardEnvLabel] ?? detail?.env ?? '--'}
            </Descriptions.Item>
            <Descriptions.Item label="是否测试档位">
              {detail?.isTest === '1' ? '测试' : '正式'}
            </Descriptions.Item>
            <Descriptions.Item label="允许终端">
              {parseAllowPlatforms(detail?.allowPlatforms).join(' / ') || '不限'}
            </Descriptions.Item>
            <Descriptions.Item label="上传状态">
              <Tag color={TierUploadStatusColor[detail?.uploadStatus]}>
                {TierUploadStatusLabel[
                  detail?.uploadStatus as keyof typeof TierUploadStatusLabel
                ] ?? '未上传'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="发布状态">
              <Tag color={TierPublishStatusColor[detail?.publishStatus]}>
                {TierPublishStatusLabel[
                  detail?.publishStatus as keyof typeof TierPublishStatusLabel
                ] ?? '未发布'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="发布提交时间">
              {fmtTime(detail?.publishTime)}
            </Descriptions.Item>
            <Descriptions.Item label="预计生效时间">
              {fmtTime(detail?.effectiveTime)}
            </Descriptions.Item>
            <Descriptions.Item label="最近同步时间">
              {fmtTime(detail?.goodsSyncTime)}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {detail?.status === '1' ? '停用' : '正常'}
            </Descriptions.Item>
            <Descriptions.Item label="道具图片" span={2}>
              {detail?.itemUrl ? (
                <Typography.Link href={detail.itemUrl} target="_blank" rel="noreferrer">
                  {detail.itemUrl}
                </Typography.Link>
              ) : (
                <Typography.Text type="danger">
                  未配置（提交上传会被拦下，错误码 4042）
                </Typography.Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="最近道具消息" span={2}>
              <Typography.Text style={{ whiteSpace: 'pre-wrap' }}>
                {detail?.goodsMsg || '--'}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {detail?.remark || '--'}
            </Descriptions.Item>
          </Descriptions>
        </Spin>
      </Drawer>
    </>
  );
};

export default RewardTier;
