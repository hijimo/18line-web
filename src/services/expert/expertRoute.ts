/**
 * A1 达人路线 + A2 达人路线审核（后台接口）。
 *
 * ⚠️ **施工期手写垫片**：后端 `TravelExpertRouteController` 尚未部署，`pnpm api`
 *    （`scripts/sync-api-doc.js` 拉 `http://127.0.0.1:8080/api/v3/api-docs.yaml` → orval）
 *    现在跑不出这些接口。**后端部署后应改为 `pnpm api` 生成产物并删除本文件**，迁移步骤：
 *      1. 后端 Controller 写显式 `operationId`（不写会占用 `list_N` 槽位，让既有
 *         `xxxApi.list22` 集体错位失效 —— `WxRewardNotifyController` 类注释的血泪教训）；
 *      2. `pnpm api` 生成 `src/services/api/达人路线/`；
 *      3. 页面里的 `expertRouteApi.xxx` 换成生成产物同名函数，删掉本文件与 `src/types/expert.ts`。
 *
 * 路径 / 字段 / 权限串唯一真相源：`docs/contracts/expert-route-api-v1.md` §2。
 * 权限串：`travel18:expertRoute:list|query|add|edit|remove`、`travel18:expertRouteAudit:list|query|audit`。
 */

import request from '@/utils/request';
import type { ResponseData, ResponsePaginationData } from '@/types/common';
import type {
  ExpertRoute,
  ExpertRouteAuditDTO,
  ExpertRouteDetail,
  ExpertRouteListQuery,
  ExpertRouteSaveDTO,
} from '@/types/expert';

const BASE = '/travel18/expertRoute';

/** GET /list 分页列表。daren 角色由后端 @AuthorDataScope 自动追加 author_user_id = 当前用户 */
export const listExpertRoute = (params: ExpertRouteListQuery) =>
  request<ResponsePaginationData<ExpertRoute>>(`${BASE}/list`, { params });

/** GET /{routeId} 详情（主表 + days 子树） */
export const getExpertRoute = (routeId: number | string) =>
  request<ResponseData<ExpertRouteDetail>>(`${BASE}/${routeId}`, { method: 'GET' });

/** POST 新增。authorUserId 一律取登录态，audit_status 服务端强制 '0' */
export const addExpertRoute = (data: ExpertRouteSaveDTO) =>
  request<ResponseData<void>>(BASE, { method: 'POST', data });

/** PUT 修改。达人改已通过路线 → 服务层强制 audit_status 回 '0' 重审（先审后发） */
export const updateExpertRoute = (data: ExpertRouteSaveDTO) =>
  request<ResponseData<void>>(BASE, { method: 'PUT', data });

/** DELETE /{routeIds} 删除（RuoYi 风格：逗号分隔多个 id） */
export const removeExpertRoute = (routeIds: number | string) =>
  request<ResponseData<void>>(`${BASE}/${routeIds}`, { method: 'DELETE' });

/**
 * PUT /audit 审核（A2，仅 admin）。
 *
 * ⚠️ 权限串是 `travel18:expertRouteAudit:audit`
 *    （以 `travel18/sql/202610121300_expert_menu_dict_role.sql` menu_id=2232 为准，
 *     契约文档 `docs/contracts/expert-route-api-v1.md` A2 已与此对齐）。
 * ⚠️ 审核通过是下单闸门 G2 的必要条件，属资金相关动作。
 */
export const auditExpertRoute = (data: ExpertRouteAuditDTO) =>
  request<ResponseData<void>>(`${BASE}/audit`, { method: 'PUT', data });
