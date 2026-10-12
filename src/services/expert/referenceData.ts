/**
 * 达人模块要用到的**既有**参照数据（公共景点 / 入驻商家 / 达人用户）。
 *
 * 这里不新造接口，全部复用 Orval 生成产物；本文件只做两件事：
 * 1. **参数形状修正**：orval 把 RuoYi 的 `@ParameterObject` 解析成了 `{ attraction: TravelAttraction }`
 *    这类包装类型，而运行时真实发出去的是**扁平 query**（既有页面一律用 `as any` 绕过，
 *    例如 `components/DataSelect/AttractionSelect.tsx:20`）。新代码里 `@typescript-eslint/no-explicit-any`
 *    是 error，所以给一个**显式命名**的 cast（`asFlatQuery`），把"这是在绕过生成类型"写在明面上。
 * 2. **行数据收窄**：生成的 `TableDataInfo.rows` 是 `{ [key: string]: unknown }[]`，
 *    直接点字段全是 unknown，这里统一 narrow 成本模块自己的类型。
 *
 * ⚠️ 后端补出 `/travel18/expertRoute` 等 Controller 并跑 `pnpm api` 之后，
 *    若生成产物里出现了「只列 daren 角色用户」的候选接口（设计文档 §7.3 提到的
 *    `/travel18/expert/binding/candidate-users`），`listDarenUsers` 应改用它，
 *    不再靠「查角色 → allocatedList」两步拼。
 */

import { get as getMerchantApi } from '@/services/api/打赏商户管理/打赏商户管理';
import { get as getAttractionApi } from '@/services/api/景点管理/景点管理';
import { get as getUserApi } from '@/services/api/用户管理/用户管理';
import { get as getRoleApi } from '@/services/api/角色管理/角色管理';
import type { TableDataInfo } from '@/types/api/tableDataInfo';

const attractionApi = getAttractionApi();
const merchantApi = getMerchantApi();
const roleApi = getRoleApi();
const userApi = getUserApi();

/** 达人角色 role_key（`sql/202610121300_expert_menu_dict_role.sql` 第 4 节，必须精确小写） */
export const DAREN_ROLE_KEY = 'daren';

/** 生成类型 → 运行时扁平 query 的显式 cast（见文件头第 1 条） */
const asFlatQuery = <T>(params: Record<string, unknown>): T => params as unknown as T;

type Row = Record<string, unknown>;

const rowsOf = (res: unknown): Row[] => {
  const table = res as TableDataInfo | undefined;
  return (table?.rows ?? []) as Row[];
};

const numOf = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
const strOf = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

// ------------------------------------------------------------------
// 公共景点（travel_attraction.owner_user_id IS NULL，后端硬编码过滤）
// ------------------------------------------------------------------

export type PublicAttractionOption = {
  attractionId: number;
  attractionName: string;
  blindStatus?: string;
};

/**
 * 查公共景点。
 * ⚠️ 走的是既有 `/travel18/attraction/list`，后端在该 statement 里硬编码追加了
 *    `owner_user_id IS NULL`（契约 §3），所以这里**不可能**查到达人私域景点，
 *    私域景点必须走 A9 `/travel18/expertAttraction/list`。
 */
export const listPublicAttractions = async (
  keyword?: string,
  pageSize = 50,
): Promise<PublicAttractionOption[]> => {
  const res = await attractionApi.list8(
    asFlatQuery({ pageNum: 1, pageSize, attractionName: keyword || undefined }),
  );
  return rowsOf(res)
    .map((r) => ({
      attractionId: numOf(r.attractionId) ?? 0,
      attractionName: strOf(r.attractionName) ?? `#${String(r.attractionId ?? '')}`,
      blindStatus: strOf(r.blindStatus),
    }))
    .filter((item) => item.attractionId > 0);
};

// ------------------------------------------------------------------
// 入驻商家（绑定收款主体，只列 audit_status='1' && status='0' 的可用商户）
// ------------------------------------------------------------------

export type MerchantOption = {
  merchantId: number;
  merchantName: string;
  auditStatus?: string;
  status?: string;
};

/**
 * 查入驻商家。
 * ⚠️ 闸门 G5 要求商户 `status='0' && audit_status='1'` 才能收钱，
 *    所以 `onlyAvailable` 默认 true，避免 admin 绑一个未过审的商家、
 *    达人路线审核通过后却一律拒单（表现是"钱收不到但不报错"）。
 *    对账/历史数据筛选场景才传 false（那时要看已停用商户的历史流水）。
 */
export const listBindableMerchants = async (
  keyword?: string,
  pageSize = 100,
  onlyAvailable = true,
): Promise<MerchantOption[]> => {
  const res = await merchantApi.merchantList(
    asFlatQuery({
      pageNum: 1,
      pageSize,
      merchantName: keyword || undefined,
      auditStatus: onlyAvailable ? '1' : undefined,
      status: onlyAvailable ? '0' : undefined,
    }),
  );
  return rowsOf(res)
    .map((r) => ({
      merchantId: numOf(r.merchantId) ?? 0,
      merchantName: strOf(r.merchantName) ?? `#${String(r.merchantId ?? '')}`,
      auditStatus: strOf(r.auditStatus),
      status: strOf(r.status),
    }))
    .filter((item) => item.merchantId > 0);
};

// ------------------------------------------------------------------
// 达人用户（有 daren 角色的 sys_user）
// ------------------------------------------------------------------

export type DarenUserOption = {
  userId: number;
  userName: string;
  nickName: string;
};

export type DarenUserLookup = {
  users: DarenUserOption[];
  /** false = 没找到 daren 角色（多半是菜单/角色 SQL 还没执行），此时 users 是全部用户的降级结果 */
  darenRoleFound: boolean;
  darenRoleId?: number;
};

const toUserOptions = (res: unknown): DarenUserOption[] =>
  rowsOf(res)
    .map((r) => ({
      userId: numOf(r.userId) ?? 0,
      userName: strOf(r.userName) ?? '',
      nickName: strOf(r.nickName) ?? strOf(r.userName) ?? '',
    }))
    .filter((u) => u.userId > 0);

/**
 * 查「有 daren 角色的用户」。
 *
 * 两步走：`/system/role/list` 找 role_key='daren' 的 roleId → `/system/role/authUser/allocatedList`。
 * ⚠️ **不要硬编码 roleId=101**：SQL 用的是 `WHERE NOT EXISTS` 守卫，若库里已存在同 role_key
 *    的角色，101 就不会被插入，硬编码会查错角色下的用户。
 * ⚠️ 找不到 daren 角色时**降级为全部用户 + darenRoleFound=false**，
 *    由页面显式提示；静默返回空列表会让 admin 以为"系统里没有达人"。
 */
export const listDarenUsers = async (
  keyword?: string,
  pageSize = 100,
): Promise<DarenUserLookup> => {
  const roleRes = await roleApi.list25(asFlatQuery({ pageNum: 1, pageSize: 100, status: '0' }));
  const roles = rowsOf(roleRes);
  const darenRole = roles.find((r) => strOf(r.roleKey) === DAREN_ROLE_KEY);
  const darenRoleId = numOf(darenRole?.roleId);

  if (darenRoleId) {
    const res = await roleApi.allocatedList(
      asFlatQuery({ roleId: darenRoleId, pageNum: 1, pageSize, userName: keyword || undefined }),
    );
    return { users: toUserOptions(res), darenRoleFound: true, darenRoleId };
  }

  const fallback = await userApi.list24(
    asFlatQuery({ pageNum: 1, pageSize, userName: keyword || undefined, status: '0' }),
  );
  return { users: toUserOptions(fallback), darenRoleFound: false };
};
