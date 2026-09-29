import {
  ExclamationCircleOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Collapse,
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
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DATE_FORMAT_FULL_TIME } from '@/variables';
import {
  CFG_BATCH_MAX_ITEMS,
  CFG_REASON_MAX_LEN,
  CONFIG_GROUP_ORDER,
  ConfigEffectColor,
  ConfigErrorCode,
  ConfigGroupColor,
  ConfigIssueLevelColor,
  ConfigIssueLevelEnum,
  ConfigIssueLevelLabel,
  ConfigRiskColor,
  ConfigRiskEnum,
  ConfigRiskLabel,
  ConfigValueTypeEnum,
  fenToYuan,
  isUsingBadValue,
  RewardEnvEnum,
  RewardEnvLabel,
} from '@/enums';
import { get as getConfigApi } from '@/services/api/打赏参数配置/打赏参数配置';

const configApi = getConfigApi();

const { Text, Paragraph } = Typography;

// ------------------------------------------------------------------
// 本地类型：接口返回的是通用 AjaxResult，orval 给不出 data 的形状，
// 这里按后端 VO 逐字段声明，避免页面里散落 any。
// ------------------------------------------------------------------

/** 对齐 {@code RewardConfigItemVO} */
type ConfigItem = {
  configKey: string;
  configName?: string | null;
  configId?: number | null;
  groupCode?: string | null;
  groupLabel?: string | null;
  valueType?: string | null;
  unit?: string | null;
  currentValue?: string | null;
  effectiveValue?: string | null;
  defaultValue?: string | null;
  minValue?: string | null;
  maxValue?: string | null;
  options?: string[] | null;
  missing?: boolean;
  invalid?: boolean;
  outOfRange?: boolean;
  /** Jackson 会把 {@code isEffectiveDifferent()} 序列化成这个字段 */
  effectiveDifferent?: boolean;
  risk?: string | null;
  effectScope?: string | null;
  effectLabel?: string | null;
  hint?: string | null;
  updateBy?: string | null;
  updateTime?: string | null;
  remark?: string | null;
};

/** 对齐 {@code RewardConfigCheckVO.Issue} */
type CheckIssue = {
  level?: string | null;
  configKey?: string | null;
  message?: string | null;
};

/** 对齐 {@code RewardConfigCheckVO.UnsafeOverride} */
type UnsafeOverride = {
  targetType?: string | null;
  targetId?: number | null;
  targetName?: string | null;
  androidShareRate?: number | string | null;
  iosShareRate?: number | string | null;
  message?: string | null;
};

/** 对齐 {@code RewardConfigCheckVO} */
type ConfigCheck = {
  rewardEnabled?: boolean;
  refundEnabled?: boolean;
  settleEnabled?: boolean;
  sandbox?: boolean;
  xpayEnv?: number | null;
  envConsistent?: boolean;
  shareRateAndroid?: string | null;
  shareRateIos?: string | null;
  commissionRate?: string | null;
  channelFeeAndroid?: string | null;
  channelFeeIos?: string | null;
  androidShareRateCeiling?: string | null;
  iosShareRateCeiling?: string | null;
  dangerCount?: number;
  warnCount?: number;
  infoCount?: number;
  issues?: CheckIssue[];
  unsafeMerchants?: UnsafeOverride[];
  unsafeLineCount?: number;
};

/** 对齐 {@code RewardSharePreviewVO.Row} */
type PreviewRow = {
  tierId?: number | null;
  tierCode?: string | null;
  tierName?: string | null;
  env?: string | null;
  isTest?: string | null;
  priceFen?: number | null;
  platform?: string | null;
  channelFeeRate?: string | null;
  channelFeeFen?: number | null;
  platformNetFen?: number | null;
  shareRate?: string | null;
  shareFen?: number | null;
  commissionFen?: number | null;
  platformProfitFen?: number | null;
  blocked?: boolean;
};

/** 对齐 {@code RewardSharePreviewVO} */
type SharePreview = {
  shareRateAndroid?: string | null;
  shareRateIos?: string | null;
  commissionRate?: string | null;
  channelFeeAndroid?: string | null;
  channelFeeIos?: string | null;
  overridden?: boolean;
  blockedCount?: number;
  minPlatformProfitFen?: number | null;
  rows?: PreviewRow[];
};

const fmtTime = (v?: string | Date | null) => (v ? dayjs(v).format(DATE_FORMAT_FULL_TIME) : '--');

/** 布尔参数在库里存 '0'/'1'（与其它整型一致），不是 true/false */
const TRUE_VALUE = '1';
const FALSE_VALUE = '0';

/** 预览抽屉的 env 选择：留空表示「跟随系统配置」，与下单口径一致 */
const ENV_FOLLOW_CONFIG = '';

const groupIndexOf = (code?: string | null): number => {
  const i = CONFIG_GROUP_ORDER.indexOf(code ?? '');
  // 后端将来新增分组而前端没同步时，排到最后而不是按字符串序插到闸门前面
  return i < 0 ? CONFIG_GROUP_ORDER.length : i;
};

/**
 * 把待提交值规范化成「后端能接受的字面量」，返回 null 表示值非法（不提交）。
 *
 * 后端保存侧会拒三类字面量：空值（{@code SysConfigMapper} 的 XML 对 config_value
 * 有 {@code != ''} 判断，空串会静默跳过该列，接口却返回成功）、科学计数法/前导零
 * （{@code new BigDecimal("1e2")} 能解析但字面量不规范）、全角数字
 * （{@code Integer.parseInt("１００")} 会返回 100，页面上却看不出来）。
 * 这三类都能在本地先拦住，就不必让用户吃一次 4091 再回来改。
 */
const normalizeDraft = (item: ConfigItem, raw: string): string | null => {
  const v = (raw ?? '').trim();
  if (v === '') return null;
  const type = item.valueType;
  if (type === ConfigValueTypeEnum.BOOL) {
    return v === TRUE_VALUE || v === FALSE_VALUE ? v : null;
  }
  if (type === ConfigValueTypeEnum.ENUM) {
    return (item.options ?? []).includes(v) ? v : null;
  }
  // 只认「可选负号 + 数字 + 可选小数」这一种写法：
  // 这一条正则同时挡掉了 1e2、0200、全角数字与尾随小数点
  if (!/^-?(0|[1-9]\d*)(\.\d+)?$/.test(v)) return null;
  const num = Number(v);
  if (!Number.isFinite(num)) return null;
  if (item.minValue != null && item.minValue !== '' && num < Number(item.minValue)) return null;
  if (item.maxValue != null && item.maxValue !== '' && num > Number(item.maxValue)) return null;
  return v;
};

/** 数值型参数的输入提示：把允许范围直接写在控件旁边，省得用户试错 */
const rangeText = (item: ConfigItem): string => {
  const hasMin = item.minValue != null && item.minValue !== '';
  const hasMax = item.maxValue != null && item.maxValue !== '';
  if (hasMin && hasMax) return `${item.minValue} ~ ${item.maxValue}`;
  if (hasMin) return `≥ ${item.minValue}`;
  if (hasMax) return `≤ ${item.maxValue}`;
  return '不限';
};

const RewardConfig: React.FC = () => {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [check, setCheck] = useState<ConfigCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshingCache, setRefreshingCache] = useState(false);

  /** 编辑中的值：configKey → 字符串。只有被用户动过的键才会出现在这里 */
  const [draft, setDraft] = useState<Record<string, string>>({});

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveForm] = Form.useForm<{ reason?: string }>();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<SharePreview | null>(null);
  /**
   * 展开的分组。
   *
   * ⚠️ 不能用 {@code defaultActiveKey}：首屏 items 还是空的，groups 也就是空的，
   * 非受控的默认值会在这一刻定型成「一个都不展开」，等数据到达后新增的面板
   * **不会**自动展开——用户看到的是 6 个折叠条，得逐个点开才能看到参数。
   * 这里改成受控，并在**首次拿到数据时**展开全部；之后用户手动折叠的状态
   * 不会被刷新列表覆盖（用 ref 记住已经初始化过）。
   */
  const [activeGroups, setActiveGroups] = useState<string[]>([]);
  const groupsExpandedRef = useRef(false);

  const [previewForm] = Form.useForm<{
    shareRateAndroid?: number | null;
    shareRateIos?: number | null;
    commissionRate?: number | null;
    channelFeeAndroid?: number | null;
    channelFeeIos?: number | null;
    env?: string;
  }>();

  // ------------------------------------------------------------------
  // 加载
  // ------------------------------------------------------------------

  const loadItems = useCallback(async (keepDraft = false) => {
    setLoading(true);
    try {
      const res: any = await configApi.rewardConfigList();
      if (res?.code === 200) {
        const rows: ConfigItem[] = Array.isArray(res.data) ? res.data : [];
        // 按登记表分组顺序排，未知分组殿后（见 groupIndexOf）
        rows.sort((a, b) => groupIndexOf(a.groupCode) - groupIndexOf(b.groupCode));
        setItems(rows);
        if (!keepDraft) setDraft({});
      } else {
        message.error(res?.msg || '加载打赏参数失败');
      }
    } catch (e: any) {
      // 4090~4096 都 ≥500，拦截器会把原文改写成「服务器错误」（缺陷 49），这里补回来
      message.error(e?.message || '加载打赏参数失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCheck = useCallback(async () => {
    setCheckLoading(true);
    try {
      const res: any = await configApi.rewardConfigCheck();
      if (res?.code === 200) {
        setCheck(res.data as ConfigCheck);
      } else {
        message.error(res?.msg || '参数自检失败');
      }
    } catch (e: any) {
      message.error(e?.message || '参数自检失败');
    } finally {
      setCheckLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
    loadCheck();
  }, [loadItems, loadCheck]);

  // ------------------------------------------------------------------
  // 草稿与 diff
  // ------------------------------------------------------------------

  const itemByKey = useMemo(() => {
    const map = new Map<string, ConfigItem>();
    items.forEach((it) => map.set(it.configKey, it));
    return map;
  }, [items]);

  /** 实际会发生变化的项：草稿值合法、且与库里的值不同 */
  const changes = useMemo(() => {
    const list: { item: ConfigItem; from: string | null; to: string }[] = [];
    Object.entries(draft).forEach(([k, v]) => {
      const item = itemByKey.get(k);
      if (!item) return;
      const to = normalizeDraft(item, v);
      if (to == null) return;
      const from = item.currentValue ?? null;
      if (from === to) return;
      list.push({ item, from, to });
    });
    return list;
  }, [draft, itemByKey]);

  /** 草稿里填了非法值的项：必须在保存前指出来，否则用户只看到「保存」按钮点不动 */
  const invalidDrafts = useMemo(() => {
    const list: { item: ConfigItem; value: string }[] = [];
    Object.entries(draft).forEach(([k, v]) => {
      const item = itemByKey.get(k);
      if (!item) return;
      if (normalizeDraft(item, v) == null) list.push({ item, value: v });
    });
    return list;
  }, [draft, itemByKey]);

  const hasCriticalChange = useMemo(
    () => changes.some((c) => c.item.risk === ConfigRiskEnum.CRITICAL),
    [changes],
  );

  const setDraftValue = (key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const resetDraft = () => {
    setDraft({});
    message.info('已放弃全部未保存的改动');
  };

  // ------------------------------------------------------------------
  // 保存
  // ------------------------------------------------------------------

  const openSave = () => {
    if (invalidDrafts.length > 0) {
      const first = invalidDrafts[0];
      message.error(
        `「${first.item.configName || first.item.configKey}」的值不合法（允许范围 ${rangeText(
          first.item,
        )}），请先修正`,
      );
      return;
    }
    if (changes.length === 0) {
      message.info('没有需要保存的改动');
      return;
    }
    if (changes.length > CFG_BATCH_MAX_ITEMS) {
      message.error(`一次最多保存 ${CFG_BATCH_MAX_ITEMS} 个参数，当前 ${changes.length} 个`);
      return;
    }
    saveForm.resetFields();
    setSaveOpen(true);
  };

  const submitSave = async () => {
    let reason: string | undefined;
    try {
      const values = await saveForm.validateFields();
      reason = values.reason?.trim() || undefined;
    } catch {
      return; // antd 已在字段下方给出提示
    }

    setSaving(true);
    try {
      const res: any = await configApi.rewardConfigUpdate({
        items: changes.map((c) => ({ configKey: c.item.configKey, configValue: c.to })),
        reason,
      } as any);
      if (res?.code === 200) {
        message.success(res.msg || `已保存 ${changes.length} 项参数`);
        setSaveOpen(false);
        setDraft({});
        // 保存成功后库值与缓存都变了：列表要重取，自检也要重跑，
        // 否则自检面板会继续报刚刚已经修好的问题
        await Promise.all([loadItems(), loadCheck()]);
      } else {
        message.error(res?.msg || '保存失败');
      }
    } catch (e: any) {
      if (e?.code === ConfigErrorCode.REASON_REQUIRED) {
        message.warning('本批包含关键参数，必须填写改动理由（会记入操作日志）');
      } else if (e?.code === ConfigErrorCode.RATE_UNSAFE) {
        // 资金不变量是跨字段的：单看某一行合法，合并起来可能已经越线
        message.error('分成率必须 ≤ 100 − 该平台渠道费率，请把费率与分成率放在同一批里一起改');
      } else if (e?.code === ConfigErrorCode.NO_CHANGE) {
        message.warning('参数已被他人修改或与库中一致，已为你刷新最新值');
        await Promise.all([loadItems(), loadCheck()]);
      } else if (e?.code === ConfigErrorCode.WRITE_FAILED) {
        message.error('写库失败，本批已整批回滚（不会出现半截配置），参数缓存已重新加载');
        await Promise.all([loadItems(), loadCheck()]);
      } else if (e?.code === ConfigErrorCode.VALUE_INVALID) {
        message.error(
          '参数值不合法：不能为空，且必须是规范写法（不接受前导零、科学计数法与全角数字）',
        );
      } else if (e?.code === ConfigErrorCode.KEY_NOT_ALLOWED) {
        message.error('该参数不在打赏白名单内，本页只能改打赏相关的 23 个参数');
      } else if (e?.code === ConfigErrorCode.DUPLICATE_KEY) {
        message.error('同一批里出现了重复参数，请刷新后重试');
      } else if (e?.message) {
        // 兜底：把后端原文补出来（拦截器弹的那句是「服务器错误」）
        message.error(e.message);
      }
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------------
  // 刷新缓存
  // ------------------------------------------------------------------

  const doRefreshCache = async () => {
    setRefreshingCache(true);
    try {
      const res: any = await configApi.rewardConfigRefreshCache();
      if (res?.code === 200) {
        message.success(res.msg || '参数缓存已刷新');
        await Promise.all([loadItems(true), loadCheck()]);
      } else {
        message.error(res?.msg || '刷新参数缓存失败');
      }
    } catch (e: any) {
      message.error(e?.message || '刷新参数缓存失败');
    } finally {
      setRefreshingCache(false);
    }
  };

  // ------------------------------------------------------------------
  // 分账预览
  // ------------------------------------------------------------------

  const openPreview = () => {
    previewForm.resetFields();
    previewForm.setFieldsValue({ env: ENV_FOLLOW_CONFIG });
    setPreview(null);
    setPreviewOpen(true);
  };

  const runPreview = async () => {
    const v = previewForm.getFieldsValue();
    setPreviewLoading(true);
    try {
      const body: Record<string, unknown> = {};
      // 留空的字段干脆不传：后端会取当前生效值。
      // 传空串会被当成「假设值是空」，语义完全不同
      (
        [
          ['shareRateAndroid', v.shareRateAndroid],
          ['shareRateIos', v.shareRateIos],
          ['commissionRate', v.commissionRate],
          ['channelFeeAndroid', v.channelFeeAndroid],
          ['channelFeeIos', v.channelFeeIos],
        ] as const
      ).forEach(([k, val]) => {
        if (val !== undefined && val !== null && `${val}` !== '') body[k] = `${val}`;
      });
      if (v.env) body.env = v.env;

      const res: any = await configApi.rewardConfigPreview(body as any);
      if (res?.code === 200) {
        setPreview(res.data as SharePreview);
        const blocked = (res.data as SharePreview)?.blockedCount ?? 0;
        if (blocked > 0) {
          message.warning(`有 ${blocked} 个档位会被资损闸门拒掉，真实下单会失败`);
        }
      } else {
        message.error(res?.msg || '试算失败');
      }
    } catch (e: any) {
      message.error(e?.message || '试算失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // 渲染：值编辑控件
  // ------------------------------------------------------------------

  const renderEditor = (item: ConfigItem) => {
    const raw = draft[item.configKey] ?? item.currentValue ?? '';
    const dirty = item.configKey in draft;
    const illegal = dirty && normalizeDraft(item, raw) == null;
    const type = item.valueType;

    if (type === ConfigValueTypeEnum.BOOL) {
      return (
        <Space size={4}>
          <Switch
            size="small"
            checked={raw === TRUE_VALUE}
            onChange={(checked) =>
              setDraftValue(item.configKey, checked ? TRUE_VALUE : FALSE_VALUE)
            }
          />
          <Text type="secondary">{raw === TRUE_VALUE ? '开' : '关'}</Text>
        </Space>
      );
    }

    if (type === ConfigValueTypeEnum.ENUM) {
      return (
        <Select
          size="small"
          style={{ minWidth: 140 }}
          value={raw || undefined}
          status={illegal ? 'error' : undefined}
          onChange={(val: string) => setDraftValue(item.configKey, val)}
          options={(item.options ?? []).map((o) => ({ label: o, value: o }))}
        />
      );
    }

    return (
      <Space size={4}>
        {/*
          ⚠️ 这里**刻意不设 min/max**（缺陷 58）。
          rc-input-number 在输入值超出 [min,max] 时只更新输入框文本、**不触发 onChange**，
          要等 blur 才钳制回边界。于是「把 78 改成 150」的实际效果是：
          draft 停在上一个合法前缀 '15'，输入框却明晃晃显示 150，
          点保存就把商家分成率从 78% 写成了 15% —— 一次静默的资损，
          而且页面上完全看不出异常（保存成功、列表刷新后显示 15%）。
          范围校验统一交给 normalizeDraft：越界值进 invalidDrafts，
          输入框标红 + 顶部 Alert 点名 + 保存按钮禁用，用户看得见的失败远好过看不见的错值。
        */}
        <InputNumber
          size="small"
          style={{ width: 120 }}
          controls={false}
          status={illegal ? 'error' : undefined}
          value={raw === '' ? null : Number(raw)}
          onChange={(val) => setDraftValue(item.configKey, val == null ? '' : `${val}`)}
        />
        {item.unit ? <Text type="secondary">{item.unit}</Text> : null}
      </Space>
    );
  };

  /** 「运行时生效值」单元格：这一列才是系统真在用的数字，必须比库值更显眼 */
  const renderEffective = (item: ConfigItem) => {
    const bad = isUsingBadValue(item);
    const different =
      item.effectiveDifferent !== undefined
        ? item.effectiveDifferent
        : item.currentValue != null && item.currentValue !== item.effectiveValue;

    if (item.missing) {
      return (
        <Tooltip title="库里没有这条参数，运行时正在用代码里的默认值。保存一次即可补建">
          <Tag color="orange">未初始化，用默认 {item.effectiveValue ?? '--'}</Tag>
        </Tooltip>
      );
    }
    if (bad) {
      return (
        <Tooltip title="库里的值异常，而运行时钳制没有发生——系统正在使用这个异常值。这是最危险的一种状态">
          <Text strong type="danger">
            {item.effectiveValue ?? '--'}（正在使用异常值）
          </Text>
        </Tooltip>
      );
    }
    if (different) {
      return (
        <Tooltip
          title={`库值是 ${item.currentValue ?? '--'}，但解析失败或越界，运行时已回退到默认值`}
        >
          <Text type="warning" strong>
            {item.effectiveValue ?? '--'}（已回退默认）
          </Text>
        </Tooltip>
      );
    }
    return <Text>{item.effectiveValue ?? '--'}</Text>;
  };

  // ------------------------------------------------------------------
  // 渲染：参数表
  // ------------------------------------------------------------------

  const columns = [
    {
      title: '参数',
      dataIndex: 'configName',
      width: 300,
      render: (_: unknown, item: ConfigItem) => (
        <Space direction="vertical" size={0}>
          <Space size={4} wrap>
            <Text strong>{item.configName || item.configKey}</Text>
            {item.risk && item.risk !== ConfigRiskEnum.NORMAL ? (
              <Tooltip
                title={
                  item.risk === ConfigRiskEnum.CRITICAL
                    ? '关键参数：改动必须填写理由，会记入操作日志'
                    : '资金相关参数：改错会直接造成资损或让商家少拿钱'
                }
              >
                <Tag color={ConfigRiskColor[item.risk] || 'default'}>
                  {ConfigRiskLabel[item.risk] || item.risk}
                </Tag>
              </Tooltip>
            ) : null}
            {item.missing ? <Tag color="orange">未初始化</Tag> : null}
            {item.invalid ? <Tag color="red">值无法解析</Tag> : null}
            {item.outOfRange ? <Tag color="volcano">越界</Tag> : null}
            {item.configKey in draft ? <Tag color="processing">已修改</Tag> : null}
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {item.configKey}
          </Text>
          {item.hint ? (
            <Tooltip title={item.hint} placement="topLeft" overlayStyle={{ maxWidth: 480 }}>
              <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                <ExclamationCircleOutlined /> 说明
              </Text>
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
    {
      title: '当前值（库）',
      dataIndex: 'currentValue',
      width: 190,
      render: (_: unknown, item: ConfigItem) => renderEditor(item),
    },
    {
      title: '运行时生效值',
      dataIndex: 'effectiveValue',
      width: 170,
      render: (_: unknown, item: ConfigItem) => renderEffective(item),
    },
    {
      title: '默认 / 范围',
      width: 140,
      render: (_: unknown, item: ConfigItem) => (
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            默认 {item.defaultValue ?? '--'}
            {item.unit ? item.unit : ''}
          </Text>
          {item.valueType === ConfigValueTypeEnum.ENUM ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              可选 {(item.options ?? []).join(' / ') || '--'}
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              范围 {rangeText(item)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '生效范围',
      dataIndex: 'effectLabel',
      width: 150,
      render: (_: unknown, item: ConfigItem) =>
        item.effectScope ? (
          <Tooltip title={item.effectLabel || item.effectScope}>
            <Tag color={ConfigEffectColor[item.effectScope] || 'default'}>{item.effectScope}</Tag>
          </Tooltip>
        ) : (
          '--'
        ),
    },
    {
      title: '最近修改',
      width: 170,
      render: (_: unknown, item: ConfigItem) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{item.updateBy || '--'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {fmtTime(item.updateTime)}
          </Text>
        </Space>
      ),
    },
  ];

  const groups = useMemo(() => {
    const map = new Map<string, { code: string; label: string; rows: ConfigItem[] }>();
    items.forEach((it) => {
      const code = it.groupCode || 'other';
      const cur = map.get(code) || { code, label: it.groupLabel || code, rows: [] };
      cur.rows.push(it);
      map.set(code, cur);
    });
    return Array.from(map.values()).sort((a, b) => groupIndexOf(a.code) - groupIndexOf(b.code));
  }, [items]);

  useEffect(() => {
    if (groupsExpandedRef.current || groups.length === 0) return;
    groupsExpandedRef.current = true;
    setActiveGroups(groups.map((g) => g.code));
  }, [groups]);

  // ------------------------------------------------------------------
  // 渲染：自检面板
  // ------------------------------------------------------------------

  const gateTag = (label: string, on?: boolean) => (
    <Tag color={on ? 'green' : 'default'}>
      {label}：{on ? '已开启' : '关闭'}
    </Tag>
  );

  const sortedIssues = useMemo(() => {
    const order: Record<string, number> = {
      [ConfigIssueLevelEnum.DANGER]: 0,
      [ConfigIssueLevelEnum.WARN]: 1,
      [ConfigIssueLevelEnum.INFO]: 2,
    };
    return [...(check?.issues ?? [])].sort(
      (a, b) => (order[a.level ?? ''] ?? 9) - (order[b.level ?? ''] ?? 9),
    );
  }, [check]);

  const unsafeMerchants = check?.unsafeMerchants ?? [];

  const renderCheckPanel = () => {
    if (!check) {
      return <Text type="secondary">自检结果尚未加载</Text>;
    }
    const danger = check.dangerCount ?? 0;
    const warn = check.warnCount ?? 0;
    const info = check.infoCount ?? 0;
    return (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space size={8} wrap>
          {gateTag('打赏', check.rewardEnabled)}
          {gateTag('主动退款', check.refundEnabled)}
          {gateTag('商家结算', check.settleEnabled)}
          <Tag color={check.sandbox ? 'orange' : 'red'}>
            环境：
            {check.sandbox
              ? RewardEnvLabel[RewardEnvEnum.SANDBOX]
              : RewardEnvLabel[RewardEnvEnum.PROD]}
          </Tag>
          <Tag color={danger > 0 ? 'red' : warn > 0 ? 'orange' : 'green'}>
            危险 {danger} · 警告 {warn} · 提示 {info}
          </Tag>
        </Space>

        <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3, lg: 6 }} bordered>
          <Descriptions.Item label="安卓分成率">
            {check.shareRateAndroid ?? '--'}%
          </Descriptions.Item>
          <Descriptions.Item label="iOS分成率">{check.shareRateIos ?? '--'}%</Descriptions.Item>
          <Descriptions.Item label="平台佣金率">{check.commissionRate ?? '--'}%</Descriptions.Item>
          <Descriptions.Item label="安卓渠道费">
            {check.channelFeeAndroid ?? '--'}%
          </Descriptions.Item>
          <Descriptions.Item label="iOS渠道费">{check.channelFeeIos ?? '--'}%</Descriptions.Item>
          <Descriptions.Item label="分成率上限">
            安卓 {check.androidShareRateCeiling ?? '--'}% / iOS {check.iosShareRateCeiling ?? '--'}%
          </Descriptions.Item>
        </Descriptions>

        {/* 严格判 false：字段缺失时不该凭空报一条「环境不一致」的警告 */}
        {check.envConsistent === false ? (
          <Alert
            type="warning"
            showIcon
            message="档位环境与系统环境不一致"
            description="这不是致命错误（可以只上架沙箱档位做联调），但上线前必须核对：现网环境下若只有沙箱档位，前台会一个档位都拉不到。"
          />
        ) : null}

        {sortedIssues.length > 0 ? (
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              {sortedIssues.map((issue, idx) => (
                <Alert
                  key={`${issue.level}-${issue.configKey}-${idx}`}
                  type={
                    issue.level === ConfigIssueLevelEnum.DANGER
                      ? 'error'
                      : issue.level === ConfigIssueLevelEnum.WARN
                        ? 'warning'
                        : 'info'
                  }
                  showIcon
                  message={
                    <Space size={6} wrap>
                      <Tag color={ConfigIssueLevelColor[issue.level ?? ''] || 'default'}>
                        {ConfigIssueLevelLabel[issue.level ?? ''] || issue.level}
                      </Tag>
                      {issue.configKey ? <Text code>{issue.configKey}</Text> : null}
                      <span>{issue.message}</span>
                    </Space>
                  }
                />
              ))}
            </Space>
          </div>
        ) : (
          <Alert type="success" showIcon message="自检未发现问题" />
        )}

        {unsafeMerchants.length > 0 ? (
          <div data-testid="unsafe-merchants">
            <Text strong>
              分成率超过安全上限的覆盖（{unsafeMerchants.length} 条
              {check.unsafeLineCount ? `，另有 ${check.unsafeLineCount} 条线路级覆盖` : ''}）
            </Text>
            <Table<UnsafeOverride>
              size="small"
              rowKey={(r) => `${r.targetType}-${r.targetId}`}
              pagination={false}
              dataSource={unsafeMerchants}
              style={{ marginTop: 6 }}
              columns={[
                { title: '类型', dataIndex: 'targetType', width: 80 },
                { title: 'ID', dataIndex: 'targetId', width: 80 },
                { title: '名称', dataIndex: 'targetName', ellipsis: true },
                { title: '安卓分成率', dataIndex: 'androidShareRate', width: 110 },
                { title: 'iOS分成率', dataIndex: 'iosShareRate', width: 110 },
                { title: '问题', dataIndex: 'message', ellipsis: true },
              ]}
            />
          </div>
        ) : check.unsafeLineCount ? (
          <Alert
            type="error"
            showIcon
            message={`${check.unsafeLineCount} 条线路的分成率覆盖超过安全上限`}
            description="线路级覆盖优先于商户级，请到「线路管理」里筛出这些线路修正。这些线路的打赏在真实下单时会被资损闸门拒掉。"
          />
        ) : null}
      </Space>
    );
  };

  // ------------------------------------------------------------------
  // 渲染：预览抽屉
  // ------------------------------------------------------------------

  /**
   * 带口径说明的列标题。
   *
   * 真实数据里这三列的数字**互不相等**（1 元 iOS 档：平台净额 88 分、平台佣金 22 分、
   * 平台净收益 10 分），不说清口径必然被误读成「平台抽了 22%」——而设计文档 §4.3 明确
   * 规定对外统一口径是「商家分成 78%」，**不得宣称平台仅抽佣 10%**。
   * - 平台净额 = 实付 − 渠道费（微信/Apple 先扣走的那一刀）
   * - 平台佣金 = 实付 − 商家应付（对外披露口径，**含渠道费**，不参与分账计算）
   * - 平台净收益 = 平台净额 − 商家应付（平台真正到手的钱）
   */
  const colTitle = (text: string, tip: string) => (
    <Tooltip title={tip}>
      <Space size={3}>
        {text}
        <QuestionCircleOutlined style={{ color: '#8c8c8c' }} />
      </Space>
    </Tooltip>
  );

  const previewColumns = [
    {
      title: '档位',
      width: 160,
      render: (_: unknown, r: PreviewRow) => (
        <Space direction="vertical" size={0}>
          <Text>{r.tierName || '--'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.tierCode}
            {r.isTest === '1' ? ' · 测试档' : ''}
          </Text>
        </Space>
      ),
    },
    {
      title: '端 / 环境',
      width: 120,
      render: (_: unknown, r: PreviewRow) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{r.platform || '--'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.env === RewardEnvEnum.SANDBOX ? '沙箱' : '现网'}
          </Text>
        </Space>
      ),
    },
    {
      title: '售价',
      dataIndex: 'priceFen',
      width: 90,
      align: 'right' as const,
      render: (v?: number | null) => `${fenToYuan(v)} 元`,
    },
    {
      title: colTitle(
        '渠道费',
        '渠道费 = 实付 × 该平台渠道费率（安卓 1%、iOS 12%），由微信/Apple 直接扣走',
      ),
      width: 120,
      align: 'right' as const,
      render: (_: unknown, r: PreviewRow) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{fenToYuan(r.channelFeeFen)} 元</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.channelFeeRate ?? '--'}%
          </Text>
        </Space>
      ),
    },
    {
      title: colTitle(
        '平台净额',
        '平台净额 = 实付 − 渠道费。微信/Apple 先扣走渠道费，剩下的才进入分账',
      ),
      dataIndex: 'platformNetFen',
      width: 100,
      align: 'right' as const,
      render: (v?: number | null) => `${fenToYuan(v)} 元`,
    },
    {
      title: '商家分成',
      width: 120,
      align: 'right' as const,
      render: (_: unknown, r: PreviewRow) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{fenToYuan(r.shareFen)} 元</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.shareRate ?? '--'}%
          </Text>
        </Space>
      ),
    },
    {
      title: colTitle(
        '平台佣金',
        '平台佣金 = 实付 − 商家应付，是对外披露口径，**已含渠道费**，不参与分账计算。它比「平台净收益」大，差额就是渠道费',
      ),
      dataIndex: 'commissionFen',
      width: 100,
      align: 'right' as const,
      render: (v?: number | null) => `${fenToYuan(v)} 元`,
    },
    {
      title: colTitle(
        '平台净收益',
        '平台净收益 = 平台净额 − 商家应付，即平台真正到手的钱。资损闸门看的是它：为负（分成 > 平台净额）就拒单',
      ),
      dataIndex: 'platformProfitFen',
      width: 110,
      align: 'right' as const,
      render: (v: number | null | undefined, r: PreviewRow) =>
        r.blocked ? <Text type="danger">被闸门拒</Text> : <Text strong>{fenToYuan(v)} 元</Text>,
    },
  ];

  return (
    <>
      <Card
        size="small"
        style={{ marginBottom: 12 }}
        title={
          <Space size={6}>
            <SafetyCertificateOutlined />
            <span>参数自检</span>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
              把「单看任何一行都看不出来」的问题一次列全
            </Text>
          </Space>
        }
        extra={
          <Space>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={checkLoading}
              onClick={loadCheck}
            >
              重新自检
            </Button>
            <Popconfirm
              title="按数据库重新加载参数缓存？"
              description="运行时会立即改用库里的值。若库里的值本身是坏的，这一步会让坏值当场生效——请先看自检结果。"
              onConfirm={doRefreshCache}
              okText="确认刷新"
              cancelText="取消"
            >
              <Button size="small" loading={refreshingCache}>
                刷新参数缓存
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <Spin spinning={checkLoading}>{renderCheckPanel()}</Spin>
      </Card>

      <Card
        size="small"
        title={
          <Space size={6}>
            <span>打赏参数</span>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
              共 {items.length} 项 · 白名单外的参数本页改不了
            </Text>
          </Space>
        }
        extra={
          <Space>
            <Button
              size="small"
              icon={<UndoOutlined />}
              disabled={changes.length === 0}
              onClick={resetDraft}
            >
              放弃改动
            </Button>
            <Button size="small" onClick={openPreview}>
              分账预览
            </Button>
            <Button
              size="small"
              type="primary"
              icon={<SaveOutlined />}
              disabled={changes.length === 0}
              onClick={openSave}
            >
              保存改动{changes.length > 0 ? `（${changes.length}）` : ''}
            </Button>
          </Space>
        }
      >
        <Spin spinning={loading}>
          {invalidDrafts.length > 0 ? (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              message={`有 ${invalidDrafts.length} 项填写不合法，修正后才能保存`}
              description={
                <Space direction="vertical" size={2}>
                  {invalidDrafts.map((d) => (
                    <Text key={d.item.configKey} style={{ fontSize: 12 }}>
                      {d.item.configName || d.item.configKey}：「{d.value || '空'}」不合法（
                      {d.item.valueType === ConfigValueTypeEnum.ENUM
                        ? `可选 ${(d.item.options ?? []).join(' / ')}`
                        : `范围 ${rangeText(d.item)}`}
                      ）
                    </Text>
                  ))}
                </Space>
              }
            />
          ) : null}

          <Collapse
            activeKey={activeGroups}
            onChange={(keys) => setActiveGroups(Array.isArray(keys) ? keys : [keys])}
            items={groups.map((g) => ({
              key: g.code,
              label: (
                <Space size={6}>
                  <Tag color={ConfigGroupColor[g.code] || 'default'}>{g.label}</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {g.rows.length} 项
                  </Text>
                  {g.rows.some((r) => r.configKey in draft) ? (
                    <Tag color="processing">有改动</Tag>
                  ) : null}
                </Space>
              ),
              children: (
                <Table<ConfigItem>
                  size="small"
                  rowKey="configKey"
                  pagination={false}
                  dataSource={g.rows}
                  columns={columns as any}
                  onRow={(r) =>
                    // 「运行时正在使用异常值」的行整行标红：这是全页最危险的状态，
                    // 只靠一个 Tag 容易被扫过去（缺陷 57）
                    isUsingBadValue(r) ? { style: { background: '#fff1f0' } } : {}
                  }
                />
              ),
            }))}
          />
        </Spin>
      </Card>

      {/* 保存确认：改动清单 + 理由一次填完，避免「确认完再弹一个理由框」 */}
      <Modal
        title={hasCriticalChange ? '确认保存（含关键参数，必须填写理由）' : '确认保存'}
        open={saveOpen}
        onCancel={() => setSaveOpen(false)}
        onOk={submitSave}
        confirmLoading={saving}
        okText="确认保存"
        cancelText="再看看"
        width={720}
        destroyOnHidden
      >
        <Alert
          type={hasCriticalChange ? 'warning' : 'info'}
          showIcon
          style={{ marginBottom: 12 }}
          message={
            hasCriticalChange
              ? '本批包含关键参数（上线闸门）。保存即整批生效，参数缓存会同步刷新，运行时立刻按新值跑。'
              : '整批原子生效：要么全部保存成功，要么整批回滚，不会出现半截配置。'
          }
        />
        <Table
          size="small"
          pagination={false}
          rowKey={(r) => r.item.configKey}
          dataSource={changes}
          scroll={{ y: 240 }}
          style={{ marginBottom: 12 }}
          columns={[
            {
              title: '参数',
              render: (_: unknown, r: (typeof changes)[number]) => (
                <Space size={4}>
                  <span>{r.item.configName || r.item.configKey}</span>
                  {r.item.risk === ConfigRiskEnum.CRITICAL ? <Tag color="red">关键</Tag> : null}
                </Space>
              ),
            },
            {
              title: '原值',
              width: 120,
              render: (_: unknown, r: (typeof changes)[number]) => (
                <Text delete type="secondary">
                  {r.from ?? '（未初始化）'}
                </Text>
              ),
            },
            {
              title: '新值',
              width: 120,
              render: (_: unknown, r: (typeof changes)[number]) => <Text strong>{r.to}</Text>,
            },
            {
              title: '生效范围',
              width: 130,
              render: (_: unknown, r: (typeof changes)[number]) => (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {r.item.effectLabel || r.item.effectScope || '--'}
                </Text>
              ),
            },
          ]}
        />
        <Form form={saveForm} layout="vertical">
          <Form.Item
            name="reason"
            label={
              <Space size={4}>
                <span>改动理由</span>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  写入操作日志（sys_oper_log），不会覆盖参数说明文档
                </Text>
              </Space>
            }
            rules={
              hasCriticalChange
                ? [
                    { required: true, message: '关键参数改动必须填写理由' },
                    { max: CFG_REASON_MAX_LEN, message: `理由不能超过 ${CFG_REASON_MAX_LEN} 字` },
                  ]
                : [{ max: CFG_REASON_MAX_LEN, message: `理由不能超过 ${CFG_REASON_MAX_LEN} 字` }]
            }
          >
            <Input.TextArea
              rows={3}
              showCount
              maxLength={CFG_REASON_MAX_LEN}
              placeholder={
                hasCriticalChange
                  ? '例如：ICP/EDI 证已下发，按上线评审结论打开打赏总开关（工单号 xxx）'
                  : '选填。填了会一并记入操作日志，便于事后追溯'
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="分账预览（只读试算，不落库）"
        width={960}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        destroyOnHidden
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="按「假设费率」逐档试算，用来在真正改参数之前先看清后果"
          description="留空的字段取当前生效值。佣金率只影响展示口径，不参与金额计算。标红的档位表示真实下单时会被资损闸门拒掉。"
        />
        <Form form={previewForm} layout="inline" style={{ marginBottom: 12, rowGap: 8 }}>
          <Form.Item name="shareRateAndroid" label="安卓分成率%">
            <InputNumber size="small" style={{ width: 90 }} controls={false} min={0} max={100} />
          </Form.Item>
          <Form.Item name="shareRateIos" label="iOS分成率%">
            <InputNumber size="small" style={{ width: 90 }} controls={false} min={0} max={100} />
          </Form.Item>
          <Form.Item name="commissionRate" label="佣金率%">
            <InputNumber size="small" style={{ width: 90 }} controls={false} min={0} max={100} />
          </Form.Item>
          <Form.Item name="channelFeeAndroid" label="安卓渠道费%">
            <InputNumber size="small" style={{ width: 90 }} controls={false} min={0} max={100} />
          </Form.Item>
          <Form.Item name="channelFeeIos" label="iOS渠道费%">
            <InputNumber size="small" style={{ width: 90 }} controls={false} min={0} max={100} />
          </Form.Item>
          <Form.Item name="env" label="环境">
            <Select
              size="small"
              style={{ width: 130 }}
              options={[
                { label: '跟随系统配置', value: ENV_FOLLOW_CONFIG },
                { label: RewardEnvLabel[RewardEnvEnum.PROD], value: RewardEnvEnum.PROD },
                { label: RewardEnvLabel[RewardEnvEnum.SANDBOX], value: RewardEnvEnum.SANDBOX },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Button size="small" type="primary" loading={previewLoading} onClick={runPreview}>
              试算
            </Button>
          </Form.Item>
        </Form>

        {preview ? (
          <>
            <Descriptions
              size="small"
              column={{ xs: 1, sm: 2, md: 3 }}
              bordered
              style={{ marginBottom: 12 }}
            >
              <Descriptions.Item label="安卓分成率">
                {preview.shareRateAndroid ?? '--'}%
              </Descriptions.Item>
              <Descriptions.Item label="iOS分成率">
                {preview.shareRateIos ?? '--'}%
              </Descriptions.Item>
              <Descriptions.Item label="平台佣金率">
                {preview.commissionRate ?? '--'}%
              </Descriptions.Item>
              <Descriptions.Item label="安卓渠道费">
                {preview.channelFeeAndroid ?? '--'}%
              </Descriptions.Item>
              <Descriptions.Item label="iOS渠道费">
                {preview.channelFeeIos ?? '--'}%
              </Descriptions.Item>
              <Descriptions.Item label="是否覆盖生效值">
                {preview.overridden ? (
                  <Tag color="gold">是（试算用假设值）</Tag>
                ) : (
                  <Tag>否（用当前生效值）</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="被闸门拒的档位数">
                {preview.blockedCount ? (
                  <Text type="danger" strong>
                    {preview.blockedCount}
                  </Text>
                ) : (
                  <Text type="success">0</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="最小平台净收益">
                {/* null 表示没有可比的行（例如该环境下没有已发布档位）。
                    显示 0.00 会被读成「平台一分钱不赚」，那是完全不同的结论 */}
                {preview.minPlatformProfitFen == null ? (
                  <Text type="secondary">—</Text>
                ) : (
                  <Text>{fenToYuan(preview.minPlatformProfitFen)} 元</Text>
                )}
              </Descriptions.Item>
            </Descriptions>
            <Table<PreviewRow>
              size="small"
              rowKey={(r) => `${r.tierId}-${r.platform}-${r.env}`}
              pagination={false}
              dataSource={preview.rows ?? []}
              columns={previewColumns}
              onRow={(r) => (r.blocked ? { style: { background: '#fff1f0' } } : {})}
              locale={{ emptyText: '没有可试算的档位（该环境下没有已发布档位？）' }}
            />
          </>
        ) : (
          <Paragraph type="secondary">填好假设费率后点「试算」。</Paragraph>
        )}
      </Drawer>
    </>
  );
};

export default RewardConfig;
