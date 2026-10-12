/**
 * 前端权限/角色判定。
 *
 * 项目里原本没有统一的 `hasPermi`（既有页面全靠 `src/router.tsx` 内部的 `useIsAdmin`），
 * 达人模块要按 RuoYi 权限串 gate 按钮，所以在这里补一个，口径**刻意与既有 `useIsAdmin` 一致**：
 *
 * ```ts
 * // src/router.tsx:304-307
 * return !roles || roles.length === 0 || roles.includes('admin');  // roles 为空 → 判定为 admin
 * ```
 *
 * 即「`/getInfo` 还没回来时按可见处理，避免菜单/按钮闪烁」。
 *
 * ⚠️ 这不是安全边界，只是可见性：后端 `@PreAuthorize("@ss.hasPermi('...')")` 才是真闸门。
 *    设计文档 §7.4 已记录这个既有隐患（roles 为空时达人会看到 admin 菜单，点进去 403），
 *    并明确「本次不改这个既有逻辑」。为把达人侧的误显示压到最小，下面对**审核/导出/绑定**
 *    这类资金相关按钮额外叠了一层「roles 里明确有 daren 就隐藏」的 fail-closed 判定
 *    —— 这一层只在 roles 已知时才生效，roles 未回来时不改变既有行为。
 */

import { useAuthStore } from '@/stores/authStore';

/** /getInfo 返回的用户体：{ roles: string[], permissions: string[] } */
type AuthUserLike = { roles?: string[]; permissions?: string[] } | null;

/** RuoYi 超级管理员通配权限 */
const ALL_PERMISSION = '*:*:*';
const ADMIN_ROLE = 'admin';
/** 达人角色 role_key，必须精确小写（后端 @AuthorDataScope 实时查库判定） */
const DAREN_ROLE = 'daren';

const useAuthUser = (): AuthUserLike => useAuthStore((state) => state.user) as AuthUserLike;

/** 当前用户是否 admin 角色（与 router.tsx 的 useIsAdmin 同口径：roles 为空按 admin 处理） */
export const useIsAdminRole = (): boolean => {
  const user = useAuthUser();
  const roles = user?.roles;
  return !roles || roles.length === 0 || roles.includes(ADMIN_ROLE);
};

/** 当前用户是否**明确**带达人角色（roles 未知时返回 false，不做猜测） */
export const useIsDarenRole = (): boolean => {
  const user = useAuthUser();
  return !!user?.roles?.includes(DAREN_ROLE);
};

/**
 * 是否拥有某个 RuoYi 权限串。
 * permissions 未回来（undefined/空）时返回 true，理由见文件头。
 */
export const useHasPermi = (permi: string): boolean => {
  const user = useAuthUser();
  const permissions = user?.permissions;
  if (!permissions || permissions.length === 0) return true;
  return permissions.includes(ALL_PERMISSION) || permissions.includes(permi);
};

/** 达人模块的权限串（与 sys_menu 2210~2262 逐条对应，改这里等于改前端 gate） */
export const EXPERT_PERMS = {
  routeList: 'travel18:expertRoute:list',
  routeQuery: 'travel18:expertRoute:query',
  routeAdd: 'travel18:expertRoute:add',
  routeEdit: 'travel18:expertRoute:edit',
  routeRemove: 'travel18:expertRoute:remove',
  /** ⚠️ 审核动作是 `:audit`，不是契约文档旧稿里的 `:edit`（menu_id=2232） */
  routeAudit: 'travel18:expertRouteAudit:audit',
  routeAuditList: 'travel18:expertRouteAudit:list',
  attractionList: 'travel18:expertAttraction:list',
  attractionAdd: 'travel18:expertAttraction:add',
  attractionEdit: 'travel18:expertAttraction:edit',
  attractionRemove: 'travel18:expertAttraction:remove',
  merchantExpertList: 'travel18:merchantExpert:list',
  merchantExpertAdd: 'travel18:merchantExpert:add',
  merchantExpertEdit: 'travel18:merchantExpert:edit',
  /** ⚠️ 解绑是 `:unbind`，不是 `:edit`（menu_id=2244） */
  merchantExpertUnbind: 'travel18:merchantExpert:unbind',
  rewardOrderList: 'travel18:expertRewardOrder:list',
  /** ⚠️ 不授予 daren（menu_id=2252） */
  rewardOrderExport: 'travel18:expertRewardOrder:export',
  payableList: 'travel18:expertPayable:list',
  /** ⚠️ 不授予 daren（menu_id=2262）：达人只看流水，对账单导出收回 admin */
  payableExport: 'travel18:expertPayable:export',
} as const;

/**
 * 打赏退款权限串。
 *
 * ⚠️ 这**不是**达人模块的菜单项（不在 sys_menu 2200~2262 里），而是既有「打赏订单」模块
 *    的权限：后端 `/travel18/reward/refund/*` 三个端点都是
 *    `@ss.hasPermi('travel18:reward:refund')`，且**不授予 daren**。
 *    之所以在这里声明，是因为「达人鼓励订单」页要复用它 gate 退款入口 ——
 *    两个页面调的是同一条后端退款链路，权限串必须只有一份，不允许各写各的常量。
 */
export const REWARD_REFUND_PERM = 'travel18:reward:refund';

export type ExpertPermissionState = {
  isAdmin: boolean;
  isDaren: boolean;
  canEditRoute: boolean;
  canRemoveRoute: boolean;
  /** 达人不能审自己的路线：既要权限串，也不能是「明确的达人且非 admin」 */
  canAuditRoute: boolean;
  canManageBinding: boolean;
  canExportRewardOrder: boolean;
  canExportPayable: boolean;
  /**
   * 能否发起退款（资金动作）。
   * 达人单与线路单同表，退款接口按 `outTradeNo` 定位、不分来源，
   * 所以两个页面用的是同一个 gate：既要 `travel18:reward:refund`，
   * 也要「不是明确的达人」。daren 角色不授予该权限串，这里是第二道 fail-closed。
   */
  canRefundReward: boolean;
};

/**
 * 达人模块的按钮级 gate 汇总。
 *
 * 「资金/审核相关」的四项（canAuditRoute / canManageBinding / canExport* / canRefundReward）都叠了
 * `!(isDaren && !isAdmin)`：权限串没回来时可能短暂可见，但 roles 一旦明确是达人就立刻隐藏，
 * 这比单纯依赖 permissions 更早收敛（/getInfo 的 roles 与 permissions 是同一次响应，
 * 但页面里有的地方只读了 roles）。
 */
export const useExpertPermission = (): ExpertPermissionState => {
  const isAdmin = useIsAdminRole();
  const isDaren = useIsDarenRole();
  const notDarenOnly = !(isDaren && !isAdmin);

  // ⚠️ 逐个先取再组合：`useHasPermi(a) || useHasPermi(b)` 会短路，
  //    第二个 hook 有时不调用 → 触发 React「rendered fewer hooks」崩溃。
  const hasRouteEdit = useHasPermi(EXPERT_PERMS.routeEdit);
  const hasRouteAdd = useHasPermi(EXPERT_PERMS.routeAdd);
  const hasRouteRemove = useHasPermi(EXPERT_PERMS.routeRemove);
  const hasRouteAudit = useHasPermi(EXPERT_PERMS.routeAudit);
  const hasBindingAdd = useHasPermi(EXPERT_PERMS.merchantExpertAdd);
  const hasBindingUnbind = useHasPermi(EXPERT_PERMS.merchantExpertUnbind);
  const hasRewardOrderExport = useHasPermi(EXPERT_PERMS.rewardOrderExport);
  const hasPayableExport = useHasPermi(EXPERT_PERMS.payableExport);
  const hasRewardRefund = useHasPermi(REWARD_REFUND_PERM);

  const canEditRoute = hasRouteEdit || hasRouteAdd;
  const canRemoveRoute = hasRouteRemove;
  const canAuditRoute = hasRouteAudit && notDarenOnly;
  const canManageBinding = (hasBindingAdd || hasBindingUnbind) && notDarenOnly;
  const canExportRewardOrder = hasRewardOrderExport && notDarenOnly;
  const canExportPayable = hasPayableExport && notDarenOnly;
  const canRefundReward = hasRewardRefund && notDarenOnly;

  return {
    isAdmin,
    isDaren,
    canEditRoute,
    canRemoveRoute,
    canAuditRoute,
    canManageBinding,
    canExportRewardOrder,
    canExportPayable,
    canRefundReward,
  };
};
