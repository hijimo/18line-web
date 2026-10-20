/**
 * 达人推荐路线（expert route）模块的共享类型。
 *
 * ⚠️ 施工期手写类型，唯一真相源是 `docs/contracts/expert-route-api-v1.md`（§2 后台接口 A1~A10），
 *    并与 `travel18` 已落地的 `ExpertRouteSaveDTO` / `ExpertRouteAuditDTO` / `MerchantExpertBindDTO`
 *    / `TravelExpertRoute*` domain 逐字段对齐。
 * ⚠️ 刻意【不】放在 `src/types/api/`：那是 Orval 生成产物目录，后端部署后跑 `pnpm api`
 *    会整体覆盖，手写类型放进去必丢。后端接口进 OpenAPI 之后，本文件应删除并改引生成类型。
 *
 * 约定：
 * - 金额一律「分」，字段名以 `Fen` 结尾（与后端 bigint 一致）。
 * - 时间字符串 `yyyy-MM-dd HH:mm:ss`。
 * - 状态类字段是 RuoYi 风格的单字符字符串枚举（'0'/'1'/'2'），不是 boolean。
 */

// ==================================================================
// A1 达人路线 /travel18/expertRoute
// ==================================================================

/** 审核状态：travel_expert_route.audit_status（字典 travel_expert_audit_status） */
export type ExpertAuditStatus = '0' | '1' | '2';

/** 上下架：travel_expert_route.status（0上架 1下架，与既有 StatusEnum 同义） */
export type ExpertRouteStatus = '0' | '1';

/** 鼓励开关：travel_expert_route.reward_enabled（0否 1是） */
export type ExpertRewardEnabled = '0' | '1';

/** 后台列表行 = 后端 TravelExpertRoute domain（selectRouteList 的列） */
export type ExpertRoute = {
  routeId: number;
  routeTitle: string;
  coverUrl?: string | null;
  /** 达人 sys_user.user_id；服务端写入，前端只读 */
  authorUserId?: number | null;
  authorNickname?: string | null;
  authorAvatar?: string | null;
  intro?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  /** 服务端按子表重算，前端提交无意义 */
  dayCount?: number | null;
  attractionCount?: number | null;
  rewardEnabled?: ExpertRewardEnabled | string | null;
  recommendWeight?: number | null;
  auditStatus?: ExpertAuditStatus | string | null;
  auditBy?: string | null;
  auditTime?: string | null;
  auditRemark?: string | null;
  status?: ExpertRouteStatus | string | null;
  delFlag?: string | null;
  createBy?: string | null;
  createTime?: string | null;
  updateBy?: string | null;
  updateTime?: string | null;
  remark?: string | null;
};

/** A1 list 查询参数（契约 §2「A1 list query」） */
export type ExpertRouteListQuery = {
  pageNum?: number;
  pageSize?: number;
  routeTitle?: string;
  auditStatus?: string;
  status?: string;
  authorUserId?: number;
  city?: string;
};

/** 天内景点编排项（提交与回显同构） */
export type ExpertRouteAttractionItem = {
  attractionId: number;
  /** 达人讲解。⚠️ 全盲景点在遮挡态也会展示这段文字，编辑页必须给警示文案 */
  expertIntro?: string | null;
  /** 服务层按数组下标重写，不信任前端传值；前端仍按序提交便于自查 */
  sortOrder?: number;
  /** 仅前端使用：选择器回显名称，提交前剔除 */
  attractionName?: string;
  /** 仅前端使用：来源（公共 / 达人私域），提交前剔除 */
  ownerUserId?: number | null;
  /** 仅前端使用：私域景点审核状态（'2'=已封禁不可编入），提交前剔除 */
  ownerAuditStatus?: string | null;
  /** 仅前端使用：景点盲态（'1'=全盲），编辑页据此给讲解警示，提交前剔除 */
  blindStatus?: string | null;
};

/** 分天编排项（ExpertRouteSaveDTO.DayItem） */
export type ExpertRouteDayItem = {
  dayIndex?: number;
  dayTheme?: string | null;
  dayIntro?: string | null;
  accommodationId?: number | null;
  breakfastDiningId?: number | null;
  lunchDiningId?: number | null;
  dinnerDiningId?: number | null;
  carId?: number | null;
  photographyId?: number | null;
  attractions?: ExpertRouteAttractionItem[];
};

/**
 * A1 保存 body（新增与修改共用）。
 *
 * `recommendWeight`（推荐权重）与后端**一致**：字段确实存在于 `ExpertRouteSaveDTO`
 * （`travel18-core/src/main/java/com/ruoyi/travel18/domain/dto/ExpertRouteSaveDTO.java:95`），
 * 「达人不得自调」是在**服务层**执行的 —— `TravelExpertRouteServiceImpl.resolveRecommendWeight`：
 *   - 非 admin 提交 → **忽略该值并记 warn**（刻意不抛异常：抛了会让达人连路线都存不了，
 *     而忽略就等于伪造请求无效）；
 *   - `null` = 「不改」（新建回落 0，修改回落库里现值）；⚠️ 与「0 = 改成 0」严格区分，
 *     把 null 当 0 会让 admin 每次编辑都把运营调好的权重清零且无报错；
 *   - 负数按 0 处理。
 * 所以这里做成可选字段、且只在 admin 视角提交（见 `pages/ExpertRoute/payload.ts` 的
 * `includeRecommendWeight`）；不提交 = 不改动已有权重，不会把权重冲成 0。
 */
export type ExpertRouteSaveDTO = {
  routeId?: number | null;
  routeTitle: string;
  coverUrl?: string | null;
  intro?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  rewardEnabled?: ExpertRewardEnabled | string | null;
  recommendWeight?: number | null;
  status?: ExpertRouteStatus | string | null;
  remark?: string | null;
  days: ExpertRouteDayItem[];
};

/** A1 详情（getInfo）：主表 + days 子树 */
export type ExpertRouteDetail = ExpertRoute & {
  days?: (ExpertRouteDayItem & { routeDayId?: number })[];
};

/** A2 审核 body（ExpertRouteAuditDTO） */
export type ExpertRouteAuditDTO = {
  routeId: number;
  /** '1' 通过 / '2' 拒绝；不接受 '0' */
  auditStatus: '1' | '2';
  /** 拒绝时必填（服务层校验），前端也拦一道 */
  auditRemark?: string | null;
};

// ==================================================================
// A3 达人↔商家绑定 /travel18/merchantExpert
// ==================================================================

/** 绑定状态：travel_merchant_expert.bind_status（字典 travel_expert_bind_status） */
export type MerchantExpertBindStatus = '0' | '1';

export type MerchantExpert = {
  id: number;
  merchantId: number;
  merchantName?: string | null;
  authorUserId: number;
  authorNickname?: string | null;
  bindStatus?: MerchantExpertBindStatus | string | null;
  bindTime?: string | null;
  unbindTime?: string | null;
  /** 商家↔达人内部二次分账比例(%)，null = 平台不管，仅备注 */
  settleRatio?: number | null;
  remark?: string | null;
  createTime?: string | null;
};

export type MerchantExpertListQuery = {
  pageNum?: number;
  pageSize?: number;
  merchantId?: number;
  authorUserId?: number;
  bindStatus?: string;
};

/** A3 POST /bind body（MerchantExpertBindDTO） */
export type MerchantExpertBindDTO = {
  merchantId: number;
  authorUserId: number;
  settleRatio?: number | null;
  remark?: string | null;
};

// ==================================================================
// A4 达人鼓励订单 /travel18/expertRewardOrder（expert_route_id IS NOT NULL）
// ==================================================================

export type ExpertRewardOrder = {
  orderId: number;
  orderNo?: string | null;
  outTradeNo?: string | null;
  userOpenid?: string | null;
  /** 达人单的 line_id 恒为 NULL —— 所有渲染必须空值防御 */
  lineId?: number | null;
  lineName?: string | null;
  expertRouteId?: number | null;
  expertRouteTitle?: string | null;
  authorUserId?: number | null;
  authorNickname?: string | null;
  merchantId?: number | null;
  merchantName?: string | null;
  tierId?: number | null;
  tierName?: string | null;
  wxProductId?: string | null;
  origPriceFen?: number | null;
  actualPriceFen?: number | null;
  shareRate?: number | null;
  shareFen?: number | null;
  channelFeeRate?: number | null;
  channelFeeFen?: number | null;
  commissionRate?: number | null;
  commissionFen?: number | null;
  env?: string | null;
  platform?: string | null;
  orderStatus?: string | null;
  refundFeeFen?: number | null;
  /**
   * iOS 退款问询累计次数（安卓/鸿蒙单恒为 0）。
   * 只能当「至少 N 次」看：官方称重复问询 3 次，2026-10-20 现网实测两笔各只到 2 次。
   */
  iosRefundQueryCount?: number | null;
  /**
   * iOS 退款问询最近一次应答：0 同意退款 / 1 拒绝退款 / null 从未被问询。
   * 后端刻意不下发 evidence 与用户退款理由（本页对 daren 角色开放，见 ExpertRewardOrderVO 注释）。
   */
  iosRefundResult?: string | null;
  paidTime?: string | null;
  createTime?: string | null;
};

export type ExpertRewardOrderListQuery = {
  pageNum?: number;
  pageSize?: number;
  orderNo?: string;
  outTradeNo?: string;
  expertRouteId?: number;
  authorUserId?: number;
  merchantId?: number;
  orderStatus?: string;
  platform?: string;
  env?: string;
};

// ==================================================================
// A7 应付/对账 + A10 达人收入 /travel18/expertPayable、/travel18/expertIncome
// ==================================================================

/** A10 GET /summary 的一行（后端按 terminal_group 分组，见设计文档 §8.3） */
export type ExpertIncomeSummaryItem = {
  /** android / ios；必须分开展示，iOS 到账周期是自然月后 45~60 天 */
  terminalGroup?: string | null;
  orderCount?: number | null;
  totalAmountFen?: number | null;
  totalChannelFeeFen?: number | null;
  totalCommissionFen?: number | null;
  merchantPayableFen?: number | null;
  voidedFen?: number | null;
};

/** A10 GET /detail 的一行（设计文档 §8.2 的 SELECT 列） */
export type ExpertIncomeDetail = {
  payableId?: number | null;
  payableNo?: string | null;
  outTradeNo?: string | null;
  orderNo?: string | null;
  routeId?: number | null;
  routeTitle?: string | null;
  expertName?: string | null;
  authorUserId?: number | null;
  merchantId?: number | null;
  merchantName?: string | null;
  terminalGroup?: string | null;
  orderAmountFen?: number | null;
  channelFeeFen?: number | null;
  commissionFen?: number | null;
  shareRate?: number | null;
  amountFen?: number | null;
  /** 0待结算 1已入批次 2已转账 3已作废(退款) */
  payStatus?: string | null;
  batchNo?: string | null;
  voidReason?: string | null;
  paidTime?: string | null;
  createTime?: string | null;
};

export type ExpertIncomeQuery = {
  pageNum?: number;
  pageSize?: number;
  merchantId?: number;
  authorUserId?: number;
  terminalGroup?: string;
  payStatus?: string;
  /**
   * 🔴 账期口径 = **`payable.create_time`（记账时间）**，不是 `o.paid_time`。
   * 后端实证：`TravelExpertRewardMapper.xml` 的 `incomeWhere` 用
   * `AND p.create_time >= #{beginTime}`，`selectIncomeDetail` 用 `order by p.create_time desc`；
   * 刻意偏离设计文档 §8.2，理由是要与结算批次 `claimForBatch`/`sumPendingForBatch` 同口径。
   * ⚠️ 顶层字段，不是 A4 那种 RuoYi `params[beginTime]` 形态。
   */
  beginTime?: string;
  endTime?: string;
};

// ==================================================================
// A9 达人私域景点 /travel18/expertAttraction
// ==================================================================

/** 达人私域资源审核状态：travel_attraction.owner_audit_status（字典 travel_owner_audit_status） */
export type OwnerAuditStatus = '0' | '1' | '2';

export type ExpertAttraction = {
  attractionId: number;
  attractionName: string;
  attractionShortName?: string | null;
  attractionDescription?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  // ⚠️ 刻意没有 `location` 字段：travel_attraction 表无该列、TravelAttraction 实体与
  //    后端 ExpertAttractionAdminVO 都不含它（orval 生成的 TravelAttraction 类型同样没有，
  //    可 grep 复核）。类型里留着会让人以为后端支持，进而在表单里加输入项 → 静默丢数据。
  longitude?: number | string | null;
  latitude?: number | string | null;
  visitDuration?: number | null;
  openTime?: string | null;
  classicRating?: number | null;
  leisureRating?: number | null;
  ticketPriceA?: number | null;
  ticketPriceC?: number | null;
  blindStatus?: string | null;
  /** 归属达人；NULL = 平台公共数据 */
  ownerUserId?: number | null;
  ownerNickname?: string | null;
  /** 后置审核：建即 '1'；admin 可置 '2' 封禁 */
  ownerAuditStatus?: OwnerAuditStatus | string | null;
  status?: string | null;
  attachments?: unknown[] | null;
  createTime?: string | null;
  remark?: string | null;
};

export type ExpertAttractionListQuery = {
  pageNum?: number;
  pageSize?: number;
  attractionName?: string;
  ownerAuditStatus?: string;
  status?: string;
};
