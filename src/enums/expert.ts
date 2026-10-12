/**
 * 达人推荐路线模块枚举。
 *
 * ⚠️ 取值与语义严格对齐 `docs/contracts/expert-route-api-v1.md` 与 travel18 的
 *    `ExpertConstants` / `travel_expert_route.*` 列注释，以及字典
 *    `travel_expert_audit_status` / `travel_owner_audit_status` / `travel_expert_bind_status`。
 *    改错一个字符，后台就会把「已拒绝」显示成「已通过」，而审核通过是下单闸门 G2 的必要条件。
 */

// ==================================================================
// 达人路线审核状态 —— travel_expert_route.audit_status
// ==================================================================

export const ExpertAuditStatusEnum = {
  /** 待审核（新建强制从此起步；达人改已发布路线时服务层强制回到这里） */
  PENDING: '0',
  /** 已通过 */
  APPROVED: '1',
  /** 已拒绝 */
  REJECTED: '2',
} as const;
export type ExpertAuditStatusValue =
  (typeof ExpertAuditStatusEnum)[keyof typeof ExpertAuditStatusEnum];

export const ExpertAuditStatusLabel = {
  [ExpertAuditStatusEnum.PENDING]: '待审核',
  [ExpertAuditStatusEnum.APPROVED]: '已通过',
  [ExpertAuditStatusEnum.REJECTED]: '已拒绝',
} as const;

export const ExpertAuditStatusColor: Record<string, string> = {
  [ExpertAuditStatusEnum.PENDING]: 'processing',
  [ExpertAuditStatusEnum.APPROVED]: 'success',
  [ExpertAuditStatusEnum.REJECTED]: 'error',
};

/** ProTable valueEnum 形态 */
export const ExpertAuditStatusDesc = {
  [ExpertAuditStatusEnum.PENDING]: { text: '待审核', status: 'Processing' },
  [ExpertAuditStatusEnum.APPROVED]: { text: '已通过', status: 'Success' },
  [ExpertAuditStatusEnum.REJECTED]: { text: '已拒绝', status: 'Error' },
} as const;

// ==================================================================
// 鼓励开关 —— travel_expert_route.reward_enabled（下单闸门 G3 的数据源）
// ==================================================================

export const ExpertRewardEnabledEnum = { OFF: '0', ON: '1' } as const;

export const ExpertRewardEnabledLabel = {
  [ExpertRewardEnabledEnum.OFF]: '未开放',
  [ExpertRewardEnabledEnum.ON]: '已开放',
} as const;

// ==================================================================
// 达人↔商家绑定状态 —— travel_merchant_expert.bind_status（下单闸门 G4 的数据源）
// ==================================================================

export const ExpertBindStatusEnum = {
  /** 生效 */
  ACTIVE: '0',
  /** 已解绑（解绑历史永久保留，不做物理删除） */
  RELEASED: '1',
} as const;

export const ExpertBindStatusLabel = {
  [ExpertBindStatusEnum.ACTIVE]: '生效中',
  [ExpertBindStatusEnum.RELEASED]: '已解绑',
} as const;

export const ExpertBindStatusColor: Record<string, string> = {
  [ExpertBindStatusEnum.ACTIVE]: 'success',
  [ExpertBindStatusEnum.RELEASED]: 'default',
};

// ==================================================================
// 达人私域资源审核状态 —— travel_attraction.owner_audit_status
// 景点/住宿/餐饮 = 后置审核（建即 '1'）；admin 可置 '2' 封禁
// ==================================================================

export const OwnerAuditStatusEnum = {
  /** 待审核（用车/摄影等前置审核资源新建时的状态） */
  PENDING: '0',
  /** 已通过（景点后置审核：建即通过） */
  APPROVED: '1',
  /** 已封禁（admin 主动置入，封禁后不得编入路线） */
  BANNED: '2',
} as const;

export const OwnerAuditStatusLabel = {
  [OwnerAuditStatusEnum.PENDING]: '待审核',
  [OwnerAuditStatusEnum.APPROVED]: '已通过',
  [OwnerAuditStatusEnum.BANNED]: '已封禁',
} as const;

export const OwnerAuditStatusColor: Record<string, string> = {
  [OwnerAuditStatusEnum.PENDING]: 'processing',
  [OwnerAuditStatusEnum.APPROVED]: 'success',
  [OwnerAuditStatusEnum.BANNED]: 'error',
};

// ==================================================================
// 应付流水状态 —— travel_merchant_payable.pay_status（达人收入页）
// ==================================================================

export const PayablePayStatusEnum = {
  /** 待结算 */
  PENDING: '0',
  /** 已入批次 */
  BATCHED: '1',
  /** 已转账 */
  PAID: '2',
  /** 已作废（退款） */
  VOIDED: '3',
} as const;

export const PayablePayStatusLabel = {
  [PayablePayStatusEnum.PENDING]: '待结算',
  [PayablePayStatusEnum.BATCHED]: '已入批次',
  [PayablePayStatusEnum.PAID]: '已转账',
  [PayablePayStatusEnum.VOIDED]: '已作废(退款)',
} as const;

export const PayablePayStatusColor: Record<string, string> = {
  [PayablePayStatusEnum.PENDING]: 'processing',
  [PayablePayStatusEnum.BATCHED]: 'warning',
  [PayablePayStatusEnum.PAID]: 'success',
  [PayablePayStatusEnum.VOIDED]: 'error',
};

export const EXPERT_AUDIT_STATUS_OPTIONS = Object.entries(ExpertAuditStatusLabel).map(
  ([value, label]) => ({ label, value }),
);

export const EXPERT_BIND_STATUS_OPTIONS = Object.entries(ExpertBindStatusLabel).map(
  ([value, label]) => ({ label, value }),
);

export const PAYABLE_PAY_STATUS_OPTIONS = Object.entries(PayablePayStatusLabel).map(
  ([value, label]) => ({ label, value }),
);

/** 每天最多编排 20 个景点（后端 MAX_DAY_ATTRACTION_COUNT，V4 强约束） */
export const MAX_DAY_ATTRACTION_COUNT = 20;

/** 最多 30 天（ExpertRouteSaveDTO.days 的 @Size(max=30)） */
export const MAX_ROUTE_DAY_COUNT = 30;
