/**
 * A4 达人鼓励订单（后台接口，独立页 F3）。
 *
 * ⚠️ **施工期手写垫片**，后端部署后改为 `pnpm api` 生成产物并删除本文件
 *    （迁移步骤见同目录 `expertRoute.ts` 文件头）。
 *
 * 路径唯一真相源：`docs/contracts/expert-route-api-v1.md` §2 A4。
 * 权限串：`travel18:expertRewardOrder:list|query|export`（**export 不授予 daren**，menu_id=2252）。
 *
 * ⚠️ 本页只看 `expert_route_id IS NOT NULL` 的单；既有「打赏订单」页
 *    （`/travel18/reward/order/list`）由后端加 `expert_route_id IS NULL` 默认过滤，
 *    两页不重叠。达人单的 `line_id` **恒为 NULL**，所有渲染必须空值防御。
 */

import request from '@/utils/request';
import type { ResponseData, ResponsePaginationData } from '@/types/common';
import type { ExpertRewardOrder, ExpertRewardOrderListQuery } from '@/types/expert';
import { postForDownload } from './download';

const BASE = '/travel18/expertRewardOrder';

/** GET /list 分页列表 */
export const listExpertRewardOrder = (params: ExpertRewardOrderListQuery) =>
  request<ResponsePaginationData<ExpertRewardOrder>>(`${BASE}/list`, { params });

/** GET /{orderId} 详情 */
export const getExpertRewardOrder = (orderId: number | string) =>
  request<ResponseData<ExpertRewardOrder>>(`${BASE}/${orderId}`, { method: 'GET' });

/**
 * POST /export 导出（Excel 文件流）。
 *
 * ⚠️ 权限 `travel18:expertRewardOrder:export` **不授予 daren**（menu_id=2252）：
 *    达人只看自己的流水，导出属对账交付物，收回 admin（设计文档 §13.14.4）。
 * ⚠️ 导出范围 = 当前筛选条件，不是全量。
 * ⚠️ 筛选条件走 **query string**，不是 JSON body：RuoYi 的 export 控制器无
 *    `@RequestBody`，body 绑不上 → 后端 `<if>` 全不成立 → 静默导出全量。
 *    详见 `download.ts` 文件头。
 * ⚠️ 调用方必须传"和 list 完全同形"的 query（含 `params[beginTime]`/`params[endTime]`），
 *    否则时间区间会丢，导出的账期范围和页面上看到的不一致。
 */
export const exportExpertRewardOrder = (params: ExpertRewardOrderListQuery) =>
  postForDownload(`${BASE}/export`, params as Record<string, unknown>, '达人鼓励订单.xlsx');
