/**
 * A9 达人私域景点（后台接口）。
 *
 * ⚠️ **施工期手写垫片**，后端部署后改为 `pnpm api` 生成产物并删除本文件
 *    （迁移步骤见同目录 `expertRoute.ts` 文件头）。
 *
 * 路径唯一真相源：`docs/contracts/expert-route-api-v1.md` §2 A9。
 * 权限串：`travel18:expertAttraction:list|query|add|edit|remove`。
 *
 * ⚠️ 审核语义与公共景点不同：达人景点是**后置审核**（建即 owner_audit_status='1'，可直接编入路线），
 *    admin 可置 '2' 封禁。用车/摄影才是前置审核。别把两套语义混在一个页面里。
 * ⚠️ 数据隔离 fail-closed：daren 只能看到 owner_user_id = 自己的行，由后端 @AuthorDataScope 强制。
 */

import request from '@/utils/request';
import type { ResponseData, ResponsePaginationData } from '@/types/common';
import type { ExpertAttraction, ExpertAttractionListQuery } from '@/types/expert';

const BASE = '/travel18/expertAttraction';

/** GET /list 分页列表（默认只列当前达人的私域景点） */
export const listExpertAttraction = (params: ExpertAttractionListQuery) =>
  request<ResponsePaginationData<ExpertAttraction>>(`${BASE}/list`, { params });

/** GET /{attractionId} 详情 */
export const getExpertAttraction = (attractionId: number | string) =>
  request<ResponseData<ExpertAttraction>>(`${BASE}/${attractionId}`, { method: 'GET' });

/** POST 新增（owner_user_id 由服务端从登录态取，不接受请求体） */
export const addExpertAttraction = (data: Partial<ExpertAttraction>) =>
  request<ResponseData<void>>(BASE, { method: 'POST', data });

/** PUT 修改（越权防护在后端 OwnerGuard） */
export const updateExpertAttraction = (data: Partial<ExpertAttraction>) =>
  request<ResponseData<void>>(BASE, { method: 'PUT', data });

/** DELETE /{attractionIds} 删除（逗号分隔多个 id） */
export const removeExpertAttraction = (attractionIds: number | string) =>
  request<ResponseData<void>>(`${BASE}/${attractionIds}`, { method: 'DELETE' });
