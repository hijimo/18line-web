/**
 * 线路打赏（虚拟支付）相关枚举。
 *
 * ⚠️ 取值与语义严格对齐后端 `travel18-core` 的 `RewardConstants`，
 * 改动前必须同步核对，否则后台会把「退款中」显示成「已退款」这类致命误导。
 * 每个常量后面都注明了对应的后端字段名，便于双向检索。
 */

import { StatusEnum } from './travel';

// ==================================================================
// 打赏订单状态 —— travel_reward_order.order_status
// ==================================================================

export const RewardOrderStatusEnum = {
  /** 待支付 */
  UNPAID: '0',
  /** 已支付待发货 */
  PAID: '1',
  /** 已发货已记账（正常终态） */
  PROVIDED: '2',
  /** 已关闭 */
  CLOSED: '3',
  /** 退款中 */
  REFUNDING: '4',
  /** 已退款（终态） */
  REFUNDED: '5',
  /** 退款失败，需人工介入 */
  REFUND_FAILED: '6',
} as const;
export type RewardOrderStatus = (typeof RewardOrderStatusEnum)[keyof typeof RewardOrderStatusEnum];

export const RewardOrderStatusLabel = {
  [RewardOrderStatusEnum.UNPAID]: '待支付',
  [RewardOrderStatusEnum.PAID]: '已支付待发货',
  [RewardOrderStatusEnum.PROVIDED]: '已发货',
  [RewardOrderStatusEnum.CLOSED]: '已关闭',
  [RewardOrderStatusEnum.REFUNDING]: '退款中',
  [RewardOrderStatusEnum.REFUNDED]: '已退款',
  [RewardOrderStatusEnum.REFUND_FAILED]: '退款失败',
} as const;

/** ProTable valueEnum 形态，status 决定 Badge 颜色 */
export const RewardOrderStatusDesc = {
  [RewardOrderStatusEnum.UNPAID]: { text: '待支付', status: 'Default' },
  [RewardOrderStatusEnum.PAID]: { text: '已支付待发货', status: 'Processing' },
  [RewardOrderStatusEnum.PROVIDED]: { text: '已发货', status: 'Success' },
  [RewardOrderStatusEnum.CLOSED]: { text: '已关闭', status: 'Default' },
  [RewardOrderStatusEnum.REFUNDING]: { text: '退款中', status: 'Warning' },
  [RewardOrderStatusEnum.REFUNDED]: { text: '已退款', status: 'Error' },
  [RewardOrderStatusEnum.REFUND_FAILED]: { text: '退款失败', status: 'Error' },
} as const;

/** Tag 颜色，与 Badge 语义保持一致 */
export const RewardOrderStatusColor: Record<string, string> = {
  [RewardOrderStatusEnum.UNPAID]: 'default',
  [RewardOrderStatusEnum.PAID]: 'processing',
  [RewardOrderStatusEnum.PROVIDED]: 'success',
  [RewardOrderStatusEnum.CLOSED]: 'default',
  [RewardOrderStatusEnum.REFUNDING]: 'warning',
  [RewardOrderStatusEnum.REFUNDED]: 'error',
  [RewardOrderStatusEnum.REFUND_FAILED]: 'error',
};

/**
 * 允许发起主动退款的订单状态。
 * 只有「已发货」才是钱已收、服务已履约的正常终态；
 * 「退款失败(6)」也放开，因为官方允许同一退款单号同参重试（技术方案 §9.1.3 红线 4）。
 */
export const REFUNDABLE_ORDER_STATUS: string[] = [
  RewardOrderStatusEnum.PROVIDED,
  RewardOrderStatusEnum.REFUND_FAILED,
];

/**
 * 允许发起主动退款的订单状态 —— **达人鼓励单专用**，比上面那份多一个「已支付待发货(1)」。
 *
 * <p>为什么要单列一份、而不是直接往 `REFUNDABLE_ORDER_STATUS` 里加 '1'：
 * 加进去会同时改掉「打赏订单」页（线路打赏）的行为，那是本次改动明确要求不碰的回归面。
 *
 * <p>为什么达人单必须放开 '1'：
 * 1. **后端本来就允许**。`RewardRefundServiceImpl` 的预览闸门放行 `PAID('1')` / `PROVIDED('2')` /
 *    `REFUND_FAILED('6')` 三态，发起闸门放行 `PAID('1')` / `PROVIDED('2')`。前端把 '1' 挡掉，
 *    等于前端比后端更严 —— 拦住的不是风险，是运营唯一能自救的入口。
 * 2. **'1' 确实会持久停留，不是理论状态**。支付回调先 `markPaid` 置 '1'、再 `markProvided` 置 '2'，
 *    两步之间存在早退路径（费率配置错误拒绝记账、`markProvided` 影响行数为 0 时 `retryLater`）。
 *    `RewardAccountingServiceImpl` 里甚至明写「已支付但还没记账：不能直接跳过，继续往下走记账，
 *    否则钱收了商家拿不到」—— 这句话本身就承认订单会卡在 '1'。
 * 3. **达人单没有第二个入口兜底**。旧「打赏订单」页 SQL 硬编码 `expert_route_id IS NULL`
 *    （`TravelRewardOrderMapper.xml:90`），达人单永远不出现在那一页。
 *    线路打赏单卡在 '1' 时至少还有旧页可查，达人单则是**两个后台页面都没有退款按钮**，
 *    运营只能人工改库或直连接口 —— 这正是「能收钱、无处可退」的死单。
 *
 * <p>方向是 fail-safe 的：弹窗内能否提交以后端 `refundable` 为准
 * （`RewardRefundModal` 的
 * `canSubmitRefund = !!preview?.refundable && !previewUnknown && !iosUnsupported`），
 * 后端又强制可退金额取微信 `query_order` 的 `left_fee`、查不到即拒、超额即拒。
 * 所以放开 '1' 不会带来越退/错退，只是让本来就该能退的单退得出去。
 *
 * <p>注意 `iosUnsupported` 这一项与状态无关：iOS（Apple 支付）单**任何状态**都不能由开发者
 * 发起退款（官方《虚拟支付：企业、个体户》§2.4「iOS 退款问询推送」#背景：
 * 「Apple 支付不支持开发者主动向用户发起退款，用户可在 App Store 申请退款」），
 * 只能引导用户去 App Store 申请，详见 `components/RewardRefundModal/iosRefundGuide.tsx`。
 */
export const EXPERT_REFUNDABLE_ORDER_STATUS: string[] = [
  RewardOrderStatusEnum.PAID,
  RewardOrderStatusEnum.PROVIDED,
  RewardOrderStatusEnum.REFUND_FAILED,
];

// ==================================================================
// iOS 退款问询应答 —— travel_reward_order.ios_refund_result
// ==================================================================

/**
 * 用户在 App Store 申请退款后，Apple 经微信下发「退款问询」，我方必须在 **3 秒内同步应答**，
 * 且协议只给了两档（`IosRefundQueryResponse.result_code`）：0 放过（建议退款）/ 1 拦截（拒绝退款）。
 *
 * ⚠️ **没有第三档**：协议里不存在「待定 / 转人工 / 需复核」。所以后台看到的这个值是
 * 系统按运营事先配好的策略自动给出的，**没有人参与当次那一答**。
 * 策略在「打赏参数配置」页（`/reward-config`）的「退款」分组里调。
 *
 * ⚠️ 唯一另一种可能是「沉默」：连续 3 次未在 3 秒内应答，微信代答「不确定」、决定权全交 Apple。
 * 那种情况下 `ios_refund_result` 为 **null**（我方从未应答），页面显示 `--`，不要显示成 0。
 */
export const IosRefundResultEnum = {
  /** 放过，建议退款 */
  ALLOW: '0',
  /** 拦截，拒绝退款 */
  BLOCK: '1',
} as const;

export const IosRefundResultLabel: Record<string, string> = {
  [IosRefundResultEnum.ALLOW]: '同意退款',
  [IosRefundResultEnum.BLOCK]: '拒绝退款',
};

/** 颜色语义：拒绝=红（用户拿不到钱，最容易被投诉）、同意=绿 */
export const IosRefundResultColor: Record<string, string> = {
  [IosRefundResultEnum.ALLOW]: 'success',
  [IosRefundResultEnum.BLOCK]: 'error',
};

// ==================================================================
// 支付环境与终端 —— travel_reward_order.env / .platform
// ==================================================================

/** env：0 现网 / 1 沙箱。注意与 query_order 的 env_type(1现网/2沙箱) 编码不同 */
export const RewardEnvEnum = { PROD: '0', SANDBOX: '1' } as const;
export const RewardEnvLabel = {
  [RewardEnvEnum.PROD]: '现网',
  [RewardEnvEnum.SANDBOX]: '沙箱',
} as const;
export const RewardEnvColor: Record<string, string> = {
  [RewardEnvEnum.PROD]: 'blue',
  [RewardEnvEnum.SANDBOX]: 'orange',
};

/**
 * 订单 platform 字段（travel_reward_order.platform）的中文标签。
 *
 * 取值来自 wx.getSystemInfoSync().platform 的**微信官方合法值**：
 * ios / android / ohos（鸿蒙手机）/ ohos_pc（鸿蒙 PC）/ windows / mac / devtools。
 * 鸿蒙是 `ohos`，微信从不返回 `harmony`（历史误写已修正，见后端 RewardConstants.PLATFORM_OHOS）。
 * mac 与 devtools 后端会拒单（4003）故不会入库，此处仅保留 devtools 供历史数据展示；
 * 未收录的值在页面侧会回退成原始字符串，不会显示成空白。
 */
export const RewardPlatformLabel = {
  android: '安卓',
  ios: 'iOS',
  ohos: '鸿蒙',
  ohos_pc: '鸿蒙PC',
  windows: 'Windows',
  devtools: '开发者工具',
} as const;

// ==================================================================
// 退款原因 —— travel_reward_order.refund_reason（微信要求的枚举，不可自定义）
// ==================================================================

export const RefundReasonEnum = {
  NONE: '0',
  PRODUCT: '1',
  AFTERSALE: '2',
  WILLINGNESS: '3',
  PRICE: '4',
  OTHER: '5',
} as const;

export const RefundReasonLabel = {
  [RefundReasonEnum.NONE]: '暂无描述',
  [RefundReasonEnum.PRODUCT]: '产品问题，影响使用或效果不佳',
  [RefundReasonEnum.AFTERSALE]: '售后问题，无法满足需求',
  [RefundReasonEnum.WILLINGNESS]: '意愿问题，用户主动退款',
  [RefundReasonEnum.PRICE]: '价格问题',
  [RefundReasonEnum.OTHER]: '其他原因',
} as const;

export const RefundReasonOptions = Object.entries(RefundReasonLabel).map(([value, label]) => ({
  label,
  value,
}));

// ==================================================================
// 商家应付流水状态 —— travel_merchant_payable.pay_status
// ==================================================================

export const PayableStatusEnum = {
  /** 待结算 */
  PENDING: '0',
  /** 已入结算批次 */
  BATCHED: '1',
  /** 已对公转账 */
  PAID: '2',
  /** 已作废（订单退款冲销 / 批次作废） */
  VOID: '3',
} as const;

export const PayableStatusLabel = {
  [PayableStatusEnum.PENDING]: '待结算',
  [PayableStatusEnum.BATCHED]: '已入批次',
  [PayableStatusEnum.PAID]: '已转账',
  [PayableStatusEnum.VOID]: '已作废',
} as const;

export const PayableStatusColor: Record<string, string> = {
  [PayableStatusEnum.PENDING]: 'default',
  [PayableStatusEnum.BATCHED]: 'processing',
  [PayableStatusEnum.PAID]: 'success',
  [PayableStatusEnum.VOID]: 'error',
};

// ==================================================================
// 结算批次状态 —— travel_settlement_batch.batch_status
// 状态机只能单向前进：0→1→2→3→4；0/1 可作废为 5
// ==================================================================

export const SettleStatusEnum = {
  PENDING_CONFIRM: '0',
  PENDING_TRANSFER: '1',
  TRANSFERRED: '2',
  INVOICED: '3',
  COMPLETED: '4',
  VOID: '5',
} as const;
export type SettleStatus = (typeof SettleStatusEnum)[keyof typeof SettleStatusEnum];

export const SettleStatusLabel = {
  [SettleStatusEnum.PENDING_CONFIRM]: '待确认',
  [SettleStatusEnum.PENDING_TRANSFER]: '待转账',
  [SettleStatusEnum.TRANSFERRED]: '已转账',
  [SettleStatusEnum.INVOICED]: '已收票',
  [SettleStatusEnum.COMPLETED]: '已完成',
  [SettleStatusEnum.VOID]: '已作废',
} as const;

export const SettleStatusDesc = {
  [SettleStatusEnum.PENDING_CONFIRM]: { text: '待确认', status: 'Processing' },
  [SettleStatusEnum.PENDING_TRANSFER]: { text: '待转账', status: 'Warning' },
  [SettleStatusEnum.TRANSFERRED]: { text: '已转账', status: 'Success' },
  [SettleStatusEnum.INVOICED]: { text: '已收票', status: 'Success' },
  [SettleStatusEnum.COMPLETED]: { text: '已完成', status: 'Default' },
  [SettleStatusEnum.VOID]: { text: '已作废', status: 'Error' },
} as const;

export const SettleStatusColor: Record<string, string> = {
  [SettleStatusEnum.PENDING_CONFIRM]: 'processing',
  [SettleStatusEnum.PENDING_TRANSFER]: 'warning',
  [SettleStatusEnum.TRANSFERRED]: 'success',
  [SettleStatusEnum.INVOICED]: 'cyan',
  [SettleStatusEnum.COMPLETED]: 'default',
  [SettleStatusEnum.VOID]: 'error',
};

// ==================================================================
// 终端分组 —— travel_settlement_batch.terminal_group
// iOS 与安卓必须分批：安卓 T+3 到平台账，iOS 要等 Apple 45~60 天，
// 混在一批等于平台垫资（技术方案 §10.4.1）
// ==================================================================

export const TerminalGroupEnum = { ANDROID: 'android', IOS: 'ios' } as const;

export const TerminalGroupLabel = {
  [TerminalGroupEnum.ANDROID]: '安卓系（T+3 到账）',
  [TerminalGroupEnum.IOS]: 'iOS（Apple 45~60 天）',
} as const;

/** 搜索下拉用的简短文案 */
export const TerminalGroupShortLabel = {
  [TerminalGroupEnum.ANDROID]: '安卓系',
  [TerminalGroupEnum.IOS]: 'iOS',
} as const;

export const TerminalGroupOptions = Object.entries(TerminalGroupShortLabel).map(
  ([value, label]) => ({ label, value }),
);

export const TerminalGroupColor: Record<string, string> = {
  [TerminalGroupEnum.ANDROID]: 'green',
  [TerminalGroupEnum.IOS]: 'purple',
};

// ==================================================================
// 结算业务错误码 —— RewardConstants.ERR_SETTLE_*
// 后端业务失败不抛异常，而是 HTTP 200 + data.code，页面必须自行分派文案
// ==================================================================

export const SettleErrorCode = {
  DISABLED: 4020,
  MERCHANT_INVALID: 4021,
  PERIOD_INVALID: 4022,
  BATCH_EXISTS: 4023,
  NO_PAYABLE: 4024,
  BELOW_MINIMUM: 4025,
  STATE_INVALID: 4026,
  AMOUNT_MISMATCH: 4027,
  CONFLICT: 4028,
  TRANSFER_NO_DUPLICATED: 4029,
  PARAM_INVALID: 4030,
  BATCH_NOT_FOUND: 4031,
  /** 批次内有流水已退款，账面不可信，禁止继续转账 */
  BATCH_BROKEN: 4032,
} as const;

// ==================================================================
// 打赏/退款业务错误码 —— RewardConstants.ERR_*
// ==================================================================

export const RewardErrorCode = {
  SESSION_KEY_INVALID: 4001,
  REFUND_DISABLED: 4010,
  STATUS_NOT_ALLOWED: 4011,
  AMOUNT_INVALID: 4012,
  OUT_OF_WINDOW: 4013,
  QUERY_FAILED: 4014,
  CLAIM_FAILED: 4015,
  /** 受理结果未知：订单保持「退款中」，严禁重复发起 */
  UNKNOWN_OUTCOME: 4016,
  REJECTED: 4017,
  PARAM_INVALID: 4018,
  /**
   * iOS（Apple 支付）单：开发者不能发起退款，只能引导用户去 App Store 申请。
   *
   * 与 4017（REJECTED）刻意分开 —— 4017 的语义是「微信拒绝但改一改还能退」，
   * 本码是「这条路根本不通」。混用会让操作者反复点重试，
   * 2026-10-19 的生产事故就是这么来的。
   */
  IOS_UNSUPPORTED: 4019,
} as const;

/** 分转元展示。金额一律以「分」在前后端传递，只在渲染层转换 */
export const fenToYuan = (fen?: number | null): string => {
  if (fen === null || fen === undefined) return '--';
  return (fen / 100).toFixed(2);
};

// ==================================================================
// 档位道具上传状态 —— travel_reward_tier.upload_status
//
// 「上传中(3)」是必须的中间态：start_upload_goods 返回 errcode=0 只代表
// 微信**受理了任务**，终态要靠 query_upload_goods 查。页面若把它当成
// 「未上传」，运营会再点一次，第二次必然撞 268490012（同环境任务运行中），
// 表现为「明明提交成功了却报失败」。
// ==================================================================

export const TierUploadStatusEnum = {
  /** 未上传 */
  NONE: '0',
  /** 已上传（微信侧确认成功） */
  DONE: '1',
  /** 上传失败 */
  FAILED: '2',
  /** 上传中：任务已受理，终态待同步 */
  RUNNING: '3',
} as const;
export type TierUploadStatus = (typeof TierUploadStatusEnum)[keyof typeof TierUploadStatusEnum];

export const TierUploadStatusLabel = {
  [TierUploadStatusEnum.NONE]: '未上传',
  [TierUploadStatusEnum.DONE]: '已上传',
  [TierUploadStatusEnum.FAILED]: '上传失败',
  [TierUploadStatusEnum.RUNNING]: '上传中',
} as const;

export const TierUploadStatusColor: Record<string, string> = {
  [TierUploadStatusEnum.NONE]: 'default',
  [TierUploadStatusEnum.DONE]: 'success',
  [TierUploadStatusEnum.FAILED]: 'error',
  [TierUploadStatusEnum.RUNNING]: 'warning',
};

// ==================================================================
// 档位道具发布状态 —— travel_reward_tier.publish_status
//
// ⚠️ 「已发布(2)」≠「已生效」：官方约 10 分钟后生效，生效前用户下单报
// 客户端错误码 -15014。是否生效由后端 RewardTierGate 依 effective_time 判定，
// 前端只做展示提示，**不要**在前端复刻闸门逻辑当权威。
// ==================================================================

export const TierPublishStatusEnum = {
  /** 未发布 */
  NONE: '0',
  /** 发布中：任务已受理，终态待同步 */
  RUNNING: '1',
  /** 已发布 */
  DONE: '2',
  /** 发布失败 */
  FAILED: '3',
  /** 审核不通过 */
  REJECTED: '4',
} as const;
export type TierPublishStatus = (typeof TierPublishStatusEnum)[keyof typeof TierPublishStatusEnum];

export const TierPublishStatusLabel = {
  [TierPublishStatusEnum.NONE]: '未发布',
  [TierPublishStatusEnum.RUNNING]: '发布中',
  [TierPublishStatusEnum.DONE]: '已发布',
  [TierPublishStatusEnum.FAILED]: '发布失败',
  [TierPublishStatusEnum.REJECTED]: '审核不通过',
} as const;

export const TierPublishStatusColor: Record<string, string> = {
  [TierPublishStatusEnum.NONE]: 'default',
  [TierPublishStatusEnum.RUNNING]: 'warning',
  [TierPublishStatusEnum.DONE]: 'success',
  [TierPublishStatusEnum.FAILED]: 'error',
  [TierPublishStatusEnum.REJECTED]: 'error',
};

/** 道具是否已上传到微信（含上传中）。命中即锁 price/wxProductId/env */
export const isTierUploaded = (uploadStatus?: string | null): boolean =>
  uploadStatus === TierUploadStatusEnum.DONE || uploadStatus === TierUploadStatusEnum.RUNNING;

// ==================================================================
// 道具业务错误码 —— RewardConstants.ERR_GOODS_*
// 与退款页同理：业务失败不抛异常，HTTP 200 + data.code，页面自行分派文案
// ==================================================================

export const GoodsErrorCode = {
  TIER_NOT_FOUND: 4040,
  PARAM_INVALID: 4041,
  /** 道具图片缺失/非法：最常见的漏配项，引导去填 item_url */
  IMAGE_MISSING: 4042,
  /** 同环境已有任务在运行（微信 268490012）：不是失败，等一会再同步 */
  TASK_RUNNING: 4043,
  NOT_UPLOADED: 4044,
  /** 本地价格与微信侧道具价格不一致：资损红线，禁止发布 */
  PRICE_MISMATCH: 4045,
  /** 已上传后 price/wxProductId/env 被锁 */
  FIELD_LOCKED: 4046,
  CALL_FAILED: 4047,
  TIER_NOT_EFFECTIVE: 4048,
  UPLOAD_FAILED: 4049,
  PUBLISH_FAILED: 4050,
} as const;

// ==================================================================
// 微信道具字段约束（官方 upload_item 逐字约束）
// 长度按**码点**计：官方说「中文算一个字符」，用 String.length 会把 emoji
// 与部分生僻字算成 2，出现「本地判超限、微信判合法」的白拒。
// ==================================================================

export const GOODS_ID_MAX_LEN = 20;
export const GOODS_NAME_MAX_LEN = 20;
export const GOODS_REMARK_MAX_LEN = 1024;

/** 道具 id 允许的字符：字母、数字、下划线、连字符 */
export const GOODS_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/** 与后端 String.codePointCount 对齐的长度计算 */
export const codePointLength = (value?: string | null): number => Array.from(value ?? '').length;

/** 道具发布到生效的官方延迟（约 10 分钟），仅用于倒计时展示 */
export const GOODS_EFFECTIVE_DELAY_MS = 10 * 60 * 1000;

/**
 * 档位可下单终端。allow_platforms 逗号分隔存储，默认五个全开。
 *
 * ⚠️ 值必须与微信 `wx.getSystemInfoSync().platform` 官方合法值逐字一致，
 * 且必须与后端 `RewardOrderServiceImpl.SUPPORTED_PLATFORMS`、
 * 前端小程序 `virtual-payment.ts` 的 `SUPPORTED_PLATFORMS` 三方同步。
 * 鸿蒙是 `ohos` / `ohos_pc`，**不是 `harmony`** —— 写错会让鸿蒙真机拿不到任何档位，
 * 前台只显示「打赏暂未开放」，且服务端不留日志。
 * 不含 `mac`（官方设备路由表未列 macOS 微信）与 `devtools`（工具内无法真实支付）。
 */
export const TierPlatformEnum = {
  ANDROID: 'android',
  IOS: 'ios',
  OHOS: 'ohos',
  OHOS_PC: 'ohos_pc',
  WINDOWS: 'windows',
} as const;

export const TierPlatformLabel = {
  [TierPlatformEnum.ANDROID]: '安卓',
  [TierPlatformEnum.IOS]: 'iOS',
  [TierPlatformEnum.OHOS]: '鸿蒙',
  [TierPlatformEnum.OHOS_PC]: '鸿蒙PC',
  [TierPlatformEnum.WINDOWS]: 'Windows',
} as const;

export const TierPlatformOptions = Object.entries(TierPlatformLabel).map(([value, label]) => ({
  label,
  value,
}));

export const DEFAULT_ALLOW_PLATFORMS = Object.keys(TierPlatformLabel).join(',');

/** allow_platforms 字符串 → 数组（空值按「未限制」处理，返回空数组） */
export const parseAllowPlatforms = (value?: string | null): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

/**
 * 常用档位金额（分）。
 *
 * 产品定档：1/5/10/20/30 元，另有 1 分档专门用于真机联调
 * （真机走真实扣款，1 分把试错成本压到最低）。
 */
export const TIER_PRICE_PRESETS: { label: string; value: number }[] = [
  { label: '0.01 元（联调用）', value: 1 },
  { label: '1 元', value: 100 },
  { label: '5 元', value: 500 },
  { label: '10 元', value: 1000 },
  { label: '20 元', value: 2000 },
  { label: '30 元', value: 3000 },
];

// ==================================================================
// 商户入驻审核状态 —— travel_merchant.audit_status
//
// ⚠️ 「已通过」的含义是**平台同意与该主体签约合作并对公结算**，
// 不是「微信批准了这个商户」：虚拟支付商户号只能由小程序主体（18线）开通，
// 商家在微信支付侧没有任何账户（见 ADR 第 4A 节）。
// 审核字段只能由后端 auditMerchant 写，新增/修改接口会强制忽略入参里的审核字段。
// ==================================================================

export const MerchantAuditStatusEnum = {
  /** 待审核：新增商户一律从这个状态起步 */
  PENDING: '0',
  /** 已通过：可收款主体，信用代码被锁定 */
  APPROVED: '1',
  /** 已拒绝：拒绝必填审核意见 */
  REJECTED: '2',
} as const;
export type MerchantAuditStatus =
  (typeof MerchantAuditStatusEnum)[keyof typeof MerchantAuditStatusEnum];

export const MerchantAuditStatusLabel = {
  [MerchantAuditStatusEnum.PENDING]: '待审核',
  [MerchantAuditStatusEnum.APPROVED]: '已通过',
  [MerchantAuditStatusEnum.REJECTED]: '已拒绝',
} as const;

export const MerchantAuditStatusColor: Record<string, string> = {
  [MerchantAuditStatusEnum.PENDING]: 'warning',
  [MerchantAuditStatusEnum.APPROVED]: 'success',
  [MerchantAuditStatusEnum.REJECTED]: 'error',
};

/** ProTable valueEnum 形态，status 决定 Badge 颜色 */
export const MerchantAuditStatusDesc = {
  [MerchantAuditStatusEnum.PENDING]: { text: '待审核', status: 'Warning' },
  [MerchantAuditStatusEnum.APPROVED]: { text: '已通过', status: 'Success' },
  [MerchantAuditStatusEnum.REJECTED]: { text: '已拒绝', status: 'Error' },
} as const;

export const MerchantAuditStatusOptions = Object.entries(MerchantAuditStatusLabel).map(
  ([value, label]) => ({ label, value }),
);

// ==================================================================
// 商户开票能力 —— travel_merchant.invoice_capability
// 字典 travel_merchant_invoice（202609271000 建）
//
// 「无(0)」不是可选项而是**入驻硬门槛**：平台以自己名义收款并全额确认收入，
// 再对公付给商家，商家开不出发票这笔分成就无法税前扣除（后端 4063）。
// ==================================================================

export const MerchantInvoiceEnum = {
  NONE: '0',
  /** 小规模纳税人 */
  SMALL: '1',
  /** 一般纳税人 */
  GENERAL: '2',
} as const;

export const MerchantInvoiceLabel = {
  [MerchantInvoiceEnum.NONE]: '无',
  [MerchantInvoiceEnum.SMALL]: '小规模纳税人',
  [MerchantInvoiceEnum.GENERAL]: '一般纳税人',
} as const;

export const MerchantInvoiceColor: Record<string, string> = {
  [MerchantInvoiceEnum.NONE]: 'error',
  [MerchantInvoiceEnum.SMALL]: 'warning',
  [MerchantInvoiceEnum.GENERAL]: 'success',
};

export const MerchantInvoiceOptions = Object.entries(MerchantInvoiceLabel).map(
  ([value, label]) => ({ label, value }),
);

/** 是否具备开票能力。审核通过的前置条件之一 */
export const hasInvoiceCapability = (invoiceCapability?: string | null): boolean =>
  invoiceCapability === MerchantInvoiceEnum.SMALL ||
  invoiceCapability === MerchantInvoiceEnum.GENERAL;

// ==================================================================
// 商户状态 —— travel_merchant.status
//
// ⚠️ 不复用通用 StatusLabel（那里是「上架/下架」）：商户的停用意味着
// 「名下线路立即不能被打赏」，但主体与账务仍保留，文案必须说清后果。
// ==================================================================

export const MerchantStatusLabel = {
  [StatusEnum.NORMAL]: '正常',
  [StatusEnum.DISABLED]: '停用',
} as const;

export const MerchantStatusOptions = Object.entries(MerchantStatusLabel).map(([value, label]) => ({
  label,
  value,
}));

// ==================================================================
// 商户业务错误码 —— RewardConstants.ERR_MERCHANT_*（4060~4069）
//
// ⚠️ 与档位/退款页的「HTTP 200 + data.code」不同：商户 CRUD 的业务失败由服务层抛
// ServiceException，全局异常处理器转成**顶层** code，request.ts 拦截器会
// 「弹后端原文 + throw（Error 上挂 code）」。所以页面只在 catch 里按 code 补充引导，
// 绝不要再 message.error 一遍，否则同一条原因弹两次。
// ==================================================================

export const MerchantErrorCode = {
  NOT_FOUND: 4060,
  PARAM_INVALID: 4061,
  /** 统一社会信用代码已存在。一个主体只能有一条合作记录 */
  CREDIT_CODE_DUPLICATED: 4062,
  /** 无开票能力，不得通过审核 */
  INVOICE_REQUIRED: 4063,
  /** 费率覆盖非法（含分成率超过 100-渠道费率） */
  RATE_INVALID: 4064,
  /** 有未结算应付流水，禁止删除；应改为「停用」 */
  HAS_UNSETTLED: 4065,
  /** 审核状态流转非法（重复审核） */
  AUDIT_STATE_INVALID: 4066,
  /** 对公账户名/账号未登记，不得通过审核 */
  BANK_REQUIRED: 4067,
  /** 营业执照附件未上传，不得通过审核 */
  LICENSE_REQUIRED: 4068,
  /** 已通过审核后禁止改统一社会信用代码 */
  CREDIT_CODE_LOCKED: 4069,
} as const;

/** 统一社会信用代码长度（GB 32100-2015） */
export const CREDIT_CODE_LEN = 18;

/**
 * 统一社会信用代码字符集。
 * 国标刻意排除 I O Z S V 五个字母（与数字 1 0 2 5 易混）——
 * 与后端 RewardConstants.CREDIT_CODE_PATTERN 逐字一致，
 * 两边不同步就会出现「前端放过、后端拒收」的白提交。
 */
export const CREDIT_CODE_PATTERN = /^[0-9A-HJ-NPQRTUWXY]{18}$/;

/**
 * 渠道费率默认值（%），仅用于前端即时提示分成率上限。
 *
 * ⚠️ 权威值在 sys_config：reward.channel.fee.rate.android / .ios。
 * 后端 validateRates 会按参数实时校验（4064），前端这里只是让用户在填表时
 * 就看到上限，别等提交后才报错。改参数时记得同步这两个默认值。
 */
export const CHANNEL_FEE_ANDROID_DEFAULT = 1;
export const CHANNEL_FEE_IOS_DEFAULT = 12;

/** 分成率上限 = 100 - 该平台渠道费率。超过会让下单被资损闸门拒掉 */
export const shareRateMax = (channelFeeRate: number): number =>
  Math.round((100 - channelFeeRate) * 100) / 100;

/**
 * 对公账号列表脱敏：只留后 4 位。
 *
 * 列表页会被很多人看到，账号完整展示等于把收款账户贴在大屏上；
 * 编辑表单需要回填完整值，所以详情/编辑接口返回全量（后端刻意为之），
 * 脱敏只发生在**列表展示层**。
 */
export const maskBankAccountNo = (accountNo?: string | null): string => {
  if (!accountNo) return '--';
  if (accountNo.length <= 4) return '****';
  return `**** **** ${accountNo.slice(-4)}`;
};

// ==================================================================
// 推送日志 —— travel_reward_notify_log（B4，只读）
//
// ⚠️ 事件类型字符串是微信定义的常量，逐字对齐后端 RewardConstants.EVENT_*。
// 运营在筛选框里看到 xpay_subscribe_ios_refund_query_notify 是没法用的，
// 所以这里给短标签；字典 travel_reward_notify_event 供 RuoYi 原生 UI 使用。
// ==================================================================

export const NotifyEventEnum = {
  /** 道具发货（支付成功），驱动记账 */
  GOODS_DELIVER: 'xpay_goods_deliver_notify',
  /** 退款完成，冲销商家应付流水 */
  REFUND: 'xpay_refund_notify',
  /** Apple 退款问询，须 3 秒内同步应答 */
  IOS_REFUND_QUERY: 'xpay_subscribe_ios_refund_query_notify',
  /** 用户投诉 */
  COMPLAINT: 'xpay_complaint_notify',
  /** 风控 / 尽职调查事件 */
  WXPAY_CALLBACK: 'xpay_wxpay_callback_notify',
  /** 代币扣减成功。本项目未启用代币 */
  COIN_PAY: 'xpay_coin_pay_notify',
} as const;

export const NotifyEventLabel = {
  [NotifyEventEnum.GOODS_DELIVER]: '道具发货（支付成功）',
  [NotifyEventEnum.REFUND]: '退款完成',
  [NotifyEventEnum.IOS_REFUND_QUERY]: 'iOS 退款问询',
  [NotifyEventEnum.COMPLAINT]: '用户投诉',
  [NotifyEventEnum.WXPAY_CALLBACK]: '风控/尽职调查',
  [NotifyEventEnum.COIN_PAY]: '代币扣减（未启用）',
} as const;

export const NotifyEventColor: Record<string, string> = {
  [NotifyEventEnum.GOODS_DELIVER]: 'blue',
  [NotifyEventEnum.REFUND]: 'orange',
  [NotifyEventEnum.IOS_REFUND_QUERY]: 'red',
  [NotifyEventEnum.COMPLAINT]: 'gold',
  [NotifyEventEnum.WXPAY_CALLBACK]: 'default',
  [NotifyEventEnum.COIN_PAY]: 'default',
};

export const NotifyEventOptions = Object.entries(NotifyEventLabel).map(([value, label]) => ({
  label,
  value,
}));

// ==================================================================
// 验签结果 —— travel_reward_notify_log.verify_result
// ==================================================================

export const NotifyVerifyEnum = { FAILED: '0', SUCCESS: '1' } as const;

export const NotifyVerifyLabel = {
  [NotifyVerifyEnum.FAILED]: '验签失败',
  [NotifyVerifyEnum.SUCCESS]: '验签成功',
} as const;

export const NotifyVerifyColor: Record<string, string> = {
  [NotifyVerifyEnum.FAILED]: 'error',
  [NotifyVerifyEnum.SUCCESS]: 'success',
};

export const NotifyVerifyOptions = Object.entries(NotifyVerifyLabel).map(([value, label]) => ({
  label,
  value,
}));

// ==================================================================
// 处理结果 —— travel_reward_notify_log.process_result
//
// ⚠️ 「幂等跳过(2)」是**正常现象**而不是失败：微信对同一条推送最多重推 15 次，
// 第二次的条件更新影响 0 行即记为幂等跳过。把它显示成「失败」会让运营
// 以为账没记上，进而去点根本不存在的「重放」按钮。
// ==================================================================

export const NotifyProcessEnum = {
  FAILED: '0',
  SUCCESS: '1',
  /** 重复推送，条件更新影响 0 行 */
  IDEMPOTENT_SKIPPED: '2',
} as const;

export const NotifyProcessLabel = {
  [NotifyProcessEnum.FAILED]: '处理失败',
  [NotifyProcessEnum.SUCCESS]: '处理成功',
  [NotifyProcessEnum.IDEMPOTENT_SKIPPED]: '幂等跳过',
} as const;

export const NotifyProcessColor: Record<string, string> = {
  [NotifyProcessEnum.FAILED]: 'error',
  [NotifyProcessEnum.SUCCESS]: 'success',
  [NotifyProcessEnum.IDEMPOTENT_SKIPPED]: 'default',
};

export const NotifyProcessOptions = Object.entries(NotifyProcessLabel).map(([value, label]) => ({
  label,
  value,
}));

/** 报文格式 —— travel_reward_notify_log.msg_format */
export const NotifyMsgFormatLabel = { J: 'JSON', X: 'XML' } as const;

/**
 * openid 脱敏：留前 6 位与后 4 位。
 *
 * 排障需要用 openid 反查是哪个用户，所以不能全遮；但推送日志页会被客服、
 * 运营、开发多方翻看，openid 是用户在本小程序内的唯一标识，整串铺开等于
 * 把用户身份摊在公共页面上。要完整值请查库。
 */
export const maskOpenid = (openid?: string | null): string => {
  if (!openid) return '--';
  if (openid.length <= 10) return `${openid.slice(0, 2)}****`;
  return `${openid.slice(0, 6)}****${openid.slice(-4)}`;
};

// ==================================================================
// 账单与订单明细下载 —— travel_reward_bill_task（A5）
//
// ⚠️ 三类账单的获取语义并不相同，页面必须分别对待，这是本模块最主要的复杂度：
//   0 日账单     download_bill —— 同一个接口既「触发生成」也「查询结果」，
//                                 首次调用极可能返回「生成中」（微信 268490011），
//                                 地址只有半小时寿命
//   1 iOS月结    download_ios_settlement_bill —— 同步返回 bill_list，
//                                 一次可能多个月，后端按月展开成多行（同批共享 batchNo）
//   2 订单明细   start/query_download_order —— 两段式，start 只是受理，
//                                 必然先是「生成中」，靠 wxTaskId 查进度
// ==================================================================

export const BillTypeEnum = {
  DAY: '0',
  IOS_MONTH: '1',
  ORDER: '2',
} as const;

export const BillTypeLabel = {
  [BillTypeEnum.DAY]: '日账单',
  [BillTypeEnum.IOS_MONTH]: 'iOS月结账单',
  [BillTypeEnum.ORDER]: '订单明细',
} as const;

export const BillTypeColor: Record<string, string> = {
  [BillTypeEnum.DAY]: 'blue',
  [BillTypeEnum.IOS_MONTH]: 'orange',
  [BillTypeEnum.ORDER]: 'green',
};

export const BillTypeOptions = Object.entries(BillTypeLabel).map(([value, label]) => ({
  label,
  value,
}));

// ==================================================================
// 下载任务状态 —— travel_reward_bill_task.status
//
// ⚠️ 「生成中(1)」是**正常中间态**而不是失败，必须用中性色。
// 日账单首次获取几乎总是先「生成中」（微信要先在侧生成文件），
// 订单明细 start 受理后也必然是「生成中」。标红会让财务以为账单丢了并反复重试，
// 进而撞上微信的频率限制（268490015），最终变成「怎么点都失败」。
// 处理原则与推送日志的「幂等跳过」一致。
// ==================================================================

export const BillStatusEnum = {
  PENDING: '0',
  GENERATING: '1',
  SUCCESS: '2',
  FAILED: '3',
} as const;

export const BillStatusLabel = {
  [BillStatusEnum.PENDING]: '待生成',
  [BillStatusEnum.GENERATING]: '生成中',
  [BillStatusEnum.SUCCESS]: '成功',
  [BillStatusEnum.FAILED]: '失败',
} as const;

export const BillStatusColor: Record<string, string> = {
  [BillStatusEnum.PENDING]: 'default',
  [BillStatusEnum.GENERATING]: 'processing',
  [BillStatusEnum.SUCCESS]: 'success',
  [BillStatusEnum.FAILED]: 'error',
};

export const BillStatusOptions = Object.entries(BillStatusLabel).map(([value, label]) => ({
  label,
  value,
}));

// ==================================================================
// start_download_order 的三个筛选维度（取值由微信定义，不是本项目枚举）
// ==================================================================

/**
 * 订单类型。本项目打赏走的是**道具直购(2)**：档位即道具，用户打赏等于直购一个道具。
 * 对账退款时用 4。
 */
export const BillOrderTypeEnum = {
  COIN: 1,
  GOODS: 2,
  SUBSCRIBE: 3,
  REFUND: 4,
} as const;

export const BillOrderTypeLabel: Record<number, string> = {
  [BillOrderTypeEnum.COIN]: '代币交易（未启用）',
  [BillOrderTypeEnum.GOODS]: '道具直购（本项目打赏）',
  [BillOrderTypeEnum.SUBSCRIBE]: '会员订阅（未使用）',
  [BillOrderTypeEnum.REFUND]: '退款订单',
};

export const BillOrderTypeOptions = Object.entries(BillOrderTypeLabel).map(([value, label]) => ({
  label,
  value: Number(value),
}));

/**
 * 支付渠道。**页面不给默认值，必须让财务显式选**：
 * 安卓由微信结算（T+3），iOS 由 Apple 结算（自然月结束后 45~60 天），
 * 两者的账期与结算主体完全不同。默认取一个等于让财务在不知情时拉错口径的明细，
 * 对账对不上还查不出原因——后端也会以 4080 拒掉空值。
 */
export const BillPayChannelEnum = { NORMAL: 1, IOS_IAP: 2 } as const;

export const BillPayChannelLabel: Record<number, string> = {
  [BillPayChannelEnum.NORMAL]: '普通虚拟支付（安卓/鸿蒙/Windows）',
  [BillPayChannelEnum.IOS_IAP]: '苹果 IAP（iOS）',
};

export const BillPayChannelOptions = Object.entries(BillPayChannelLabel).map(([value, label]) => ({
  label,
  value: Number(value),
}));

/** 退款状态，仅 order_type=4（退款订单）时有效 */
export const BillRefundStatusEnum = { ALL: 0, REFUNDED: 2, REFUNDING: 4, FAILED: 5 } as const;

export const BillRefundStatusLabel: Record<number, string> = {
  [BillRefundStatusEnum.ALL]: '全部',
  [BillRefundStatusEnum.REFUNDED]: '已退款',
  [BillRefundStatusEnum.REFUNDING]: '退款中',
  [BillRefundStatusEnum.FAILED]: '退款失败',
};

export const BillRefundStatusOptions = Object.entries(BillRefundStatusLabel).map(
  ([value, label]) => ({
    label,
    value: Number(value),
  }),
);

/**
 * 订单明细的日期跨度上限（天），微信硬限制。
 *
 * 超限时后端给 4086 并在文案里算好该拆几段。前端也先拦一道：
 * 这是最常踩的一种参数错，等出网再报错要多等一个往返。
 */
export const BILL_ORDER_RANGE_MAX_DAYS = 31;

/**
 * 日账单地址的有效期（分钟）。官方说半小时，后端刻意按 28 分钟推算过期时间，
 * 留 2 分钟余量覆盖「取到地址 → 落库 → 用户点开」的链路耗时。
 */
export const BILL_DAY_URL_VALID_MINUTES = 28;

export const BillErrorCode = {
  PARAM_INVALID: 4080,
  /**
   * 账单正在生成中（微信 268490011/268490012，或订单明细任务还在跑）。
   * **不是失败**，提示「稍后刷新」而不是报错；订单明细还可能是
   * 「同账期已有生成中的任务」，此时要引导去刷新那一条。
   */
  GENERATING: 4081,
  /** 频率限制（微信 268490015）：与查单、退款、道具上传共用配额，要等而不是重试 */
  RATE_LIMIT: 4082,
  CALL_FAILED: 4083,
  TASK_NOT_FOUND: 4084,
  /** 地址已过期，必须重新获取。重发旧地址只会让财务点开一个失败页 */
  URL_EXPIRED: 4085,
  /** 跨度超 31 天：文案里会给出该拆几段 */
  RANGE_TOO_LARGE: 4086,
  /** 任务尚未成功（生成中或已失败），没有地址可给 */
  NOT_READY: 4087,
} as const;

/**
 * 下载地址此刻是否可点。
 *
 * 与后端 `TravelRewardBillTask.isUrlUsable()` 同口径：状态成功 + 有过期时间 + 未过期，
 * 三者缺一不可。**过期时间缺失按不可用处理**——宁可让财务多点一次「重新获取」，
 * 也不能把一个不知何时失效的链接当成有效凭证。
 *
 * 注意这只是「按钮该不该亮」的判断；真实地址仍要走 `billDownloadUrl` 接口取，
 * 那里会在**点击的那一刻**再校验一次过期（列表渲染到点击之间可能已经过去十几分钟，
 * 而日账单地址只有 28 分钟寿命）。
 */
export const isBillUrlUsable = (
  status?: string | null,
  expireAt?: string | number | Date | null,
): boolean => {
  if (status !== BillStatusEnum.SUCCESS) return false;
  if (!expireAt) return false;
  const ts = expireAt instanceof Date ? expireAt.getTime() : new Date(expireAt).getTime();
  if (Number.isNaN(ts)) return false;
  return ts > Date.now();
};

/**
 * 把 YYYYMMDD 数字格式化成可读日期（20260801 → 2026-08-01）。
 *
 * 账单账期在库里是 int（微信接口的入参形态就是数字），直接显示 20260801
 * 财务要自己数位点，容易看错成 2026-08-01 还是 2026-08-10。
 */
export const formatDs = (ds?: number | null): string => {
  if (ds == null) return '--';
  const s = String(ds);
  if (s.length !== 8) return s;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
};

/** 把 YYYYMM 格式化成可读月份（202608 → 2026-08） */
export const formatMonth = (month?: string | null): string => {
  if (!month) return '--';
  const s = String(month).trim();
  if (s.length !== 6) return s;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}`;
};

/**
 * 日期区间跨度（含首尾），用于前端先拦一道 31 天上限。
 *
 * 含首尾这一点很容易算错：20260801~20260831 是 31 天（合法），
 * 20260801~20260901 是 32 天（超限）。少算一天会让财务在白跑一次出网后才发现。
 */
export const billRangeDays = (begin?: number | null, end?: number | null): number | null => {
  if (begin == null || end == null) return null;
  const parse = (ds: number): number => {
    const s = String(ds);
    return Date.UTC(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
  };
  const diff = parse(end) - parse(begin);
  if (Number.isNaN(diff) || diff < 0) return null;
  return Math.floor(diff / 86400000) + 1;
};

// ==================================================================
// 打赏参数配置页 —— RewardConfigMeta / TravelRewardConfigController
//
// ⚠️ 本段的 code 全部对齐后端 `RewardConfigMeta` 的枚举 code（不是 name）：
//    Group/Risk/Effect/ValueType 在 VO 里都是以 code 下发的，
//    前端若按 Java 枚举名（GATE/CRITICAL/...）匹配会一条都对不上。
// 分组与生效范围的**中文名由后端下发**（groupLabel / effectLabel），
// 这里只维护排序、颜色与图标，避免中英文两份文案各自漂移。
// ==================================================================

/** 参数分组 —— RewardConfigMeta.Group.code */
export const ConfigGroupEnum = {
  /** 上线闸门：三个总开关，改动等于打开真实资金通道 */
  GATE: 'gate',
  /** 费率与分账 */
  RATE: 'rate',
  /** 环境与档位 */
  ENV: 'env',
  /** 订单与查单补偿 */
  ORDER: 'order',
  /** 退款 */
  REFUND: 'refund',
  /** 商家结算 */
  SETTLE: 'settle',
} as const;
export type ConfigGroup = (typeof ConfigGroupEnum)[keyof typeof ConfigGroupEnum];

/**
 * 分组展示顺序。
 *
 * 后端 `listItems()` 按登记表顺序返回，已经是这个次序；这里再显式排一遍，
 * 是为了让「未知分组」（后端将来新增而前端未同步）不至于插到闸门前面——
 * 排到最后，而不是靠 `sort` 的默认字符串序把 gate 挤到 env 后面。
 */
export const CONFIG_GROUP_ORDER: string[] = [
  ConfigGroupEnum.GATE,
  ConfigGroupEnum.RATE,
  ConfigGroupEnum.ENV,
  ConfigGroupEnum.ORDER,
  ConfigGroupEnum.REFUND,
  ConfigGroupEnum.SETTLE,
];

export const ConfigGroupColor: Record<string, string> = {
  [ConfigGroupEnum.GATE]: 'red',
  [ConfigGroupEnum.RATE]: 'gold',
  [ConfigGroupEnum.ENV]: 'blue',
  [ConfigGroupEnum.ORDER]: 'cyan',
  [ConfigGroupEnum.REFUND]: 'purple',
  [ConfigGroupEnum.SETTLE]: 'green',
};

/** 值类型 —— RewardConfigMeta.ValueType.code，决定用哪种输入控件 */
export const ConfigValueTypeEnum = {
  BOOL: 'bool',
  INT: 'int',
  LONG: 'long',
  DECIMAL: 'decimal',
  ENUM: 'enum',
} as const;
export type ConfigValueType = (typeof ConfigValueTypeEnum)[keyof typeof ConfigValueTypeEnum];

/** 风险级别 —— RewardConfigMeta.Risk.code */
export const ConfigRiskEnum = {
  /** 关键参数：改动必须填写理由（后端 4093 强校验，前端同步拦一道） */
  CRITICAL: 'critical',
  /** 资金相关：分成率/佣金率/渠道费率，改错直接造成资损或商家少拿钱 */
  MONEY: 'money',
  NORMAL: 'normal',
} as const;
export type ConfigRisk = (typeof ConfigRiskEnum)[keyof typeof ConfigRiskEnum];

export const ConfigRiskLabel: Record<string, string> = {
  [ConfigRiskEnum.CRITICAL]: '关键',
  [ConfigRiskEnum.MONEY]: '资金',
  [ConfigRiskEnum.NORMAL]: '常规',
};

export const ConfigRiskColor: Record<string, string> = {
  [ConfigRiskEnum.CRITICAL]: 'red',
  [ConfigRiskEnum.MONEY]: 'orange',
  [ConfigRiskEnum.NORMAL]: 'default',
} as const;

/** 生效范围 —— RewardConfigMeta.Effect.code（中文名用后端 effectLabel） */
export const ConfigEffectEnum = {
  IMMEDIATE: 'immediate',
  /** 仅影响新订单：历史订单已存费率快照 */
  NEW_ORDER_ONLY: 'newOrderOnly',
  /** 下一轮定时任务执行时生效 */
  NEXT_RUN: 'nextRun',
} as const;
export type ConfigEffect = (typeof ConfigEffectEnum)[keyof typeof ConfigEffectEnum];

export const ConfigEffectColor: Record<string, string> = {
  [ConfigEffectEnum.IMMEDIATE]: 'green',
  [ConfigEffectEnum.NEW_ORDER_ONLY]: 'blue',
  [ConfigEffectEnum.NEXT_RUN]: 'default',
} as const;

/** 自检问题级别 —— RewardConfigCheckVO.Issue.level */
export const ConfigIssueLevelEnum = {
  DANGER: 'danger',
  WARN: 'warn',
  INFO: 'info',
} as const;
export type ConfigIssueLevel = (typeof ConfigIssueLevelEnum)[keyof typeof ConfigIssueLevelEnum];

export const ConfigIssueLevelColor: Record<string, string> = {
  [ConfigIssueLevelEnum.DANGER]: 'red',
  [ConfigIssueLevelEnum.WARN]: 'orange',
  [ConfigIssueLevelEnum.INFO]: 'blue',
} as const;

export const ConfigIssueLevelLabel: Record<string, string> = {
  [ConfigIssueLevelEnum.DANGER]: '危险',
  [ConfigIssueLevelEnum.WARN]: '警告',
  [ConfigIssueLevelEnum.INFO]: '提示',
};

/** 批量保存上限 —— RewardConstants.CFG_BATCH_MAX_ITEMS */
export const CFG_BATCH_MAX_ITEMS = 64;
/** 改动理由长度上限 —— RewardConstants.CFG_REASON_MAX_LEN */
export const CFG_REASON_MAX_LEN = 500;

/**
 * 打赏参数配置业务码（4090~4096）。
 *
 * ⚠️ 与 4080~4087 一样，这批码全部 ≥500，会被 `utils/errorHandler` 的 parseError
 * 一律改写成「服务器错误，请稍后重试」（缺陷 49），**拦截器弹出的那句话不是后端原文**。
 * 所以页面 catch 里必须自己按 `e.code` 分派：先给一句「该怎么办」，
 * 再在兜底分支里把 `e.message`（拦截器没动过它）原文补出来。
 */
export const ConfigErrorCode = {
  /** 参数键不在 27 个白名单里：页面正常操作不会触发，触发即说明前端被改坏或有人直连接口 */
  KEY_NOT_ALLOWED: 4090,
  /** 值解析不出来 / 越界 / 空值 / 非规范字面量（如 `1e2`、`0200`、全角数字） */
  VALUE_INVALID: 4091,
  /** 资金不变量被破坏：合并视图里 share > 100 − channelFee */
  RATE_UNSAFE: 4092,
  /** 本批含关键参数但没填改动理由 */
  REASON_REQUIRED: 4093,
  /** 同一批里出现了重复的参数键 */
  DUPLICATE_KEY: 4094,
  /** 写库失败，整批已回滚（不会出现半截配置） */
  WRITE_FAILED: 4095,
  /** 提交值与库里完全一致：通常是别人刚改过，页面状态已过期 */
  NO_CHANGE: 4096,
} as const;

/**
 * 「运行时正在用这个异常值」——配置页最需要盯住的一种状态。
 *
 * 后端把参数分成两类语义（`RewardConfigMeta.isRuntimeClamped`）：
 * - **越界回退默认**（多数整型/枚举）：库值是坏的，但运行时用的是代码默认值；
 * - **越界照用不误**（`decimal` 与订单超时）：库值是坏的，运行时**就在用这个坏值**。
 *
 * 第二类是本页最大的盲区：原生「参数设置」只显示库值，于是页面写着 78%、
 * 运行时可能在用 150%，而这个偏差在界面上完全看不出来（缺陷 57）。
 *
 * 判据不依赖后端未下发的 `runtimeClamped`，只用 VO 已经给出的两个事实：
 * 值确实异常（missing 除外），但**生效值 == 库值**（即 `effectiveDifferent` 为假），
 * 说明钳制没有发生，坏值原样进了运行时。
 */
export const isUsingBadValue = (item: {
  currentValue?: string | null;
  effectiveValue?: string | null;
  effectiveDifferent?: boolean;
  missing?: boolean;
  invalid?: boolean;
  outOfRange?: boolean;
}): boolean => {
  if (item.missing) return false;
  if (!item.invalid && !item.outOfRange) return false;
  // effectiveDifferent 由后端 isEffectiveDifferent() 序列化而来；
  // 万一字段缺失就退回字面比对，两者等价
  if (item.effectiveDifferent !== undefined) return !item.effectiveDifferent;
  return item.currentValue === item.effectiveValue;
};
