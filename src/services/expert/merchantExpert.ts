/**
 * A3 达人↔入驻商家绑定（后台接口，仅 admin）。
 *
 * ⚠️ **施工期手写垫片**，后端部署后改为 `pnpm api` 生成产物并删除本文件
 *    （迁移步骤见同目录 `expertRoute.ts` 文件头）。
 *
 * 路径 / body 唯一真相源：`docs/contracts/expert-route-api-v1.md` §2 A3。
 * 权限串：`travel18:merchantExpert:list|query|add|edit|unbind`
 *   —— ⚠️ 解绑是 `:unbind`（menu_id=2244），不是 `:edit`。
 *
 * 业务不变量（写在这里防止后来者"顺手优化"）：
 * - 绑定是下单闸门 G4 的数据源：达人无生效绑定 → C 端 rewardAvailable=false，后端拒单。
 * - 换商家 = 先解绑再绑定，**不是 UPDATE merchant_id**：历史订单的 merchant_id 是下单快照，
 *   改了就没法追溯"这批账单该找哪个商家结"。
 * - 解绑 = UPDATE bind_status='1' + 写 unbind_time，保留完整换绑轨迹。
 */

import request from '@/utils/request';
import type { ResponseData, ResponsePaginationData } from '@/types/common';
import type {
  MerchantExpert,
  MerchantExpertBindDTO,
  MerchantExpertListQuery,
} from '@/types/expert';

const BASE = '/travel18/merchantExpert';

/** GET /list 分页列表 */
export const listMerchantExpert = (params: MerchantExpertListQuery) =>
  request<ResponsePaginationData<MerchantExpert>>(`${BASE}/list`, { params });

/** POST /bind 新建绑定 */
export const bindMerchantExpert = (data: MerchantExpertBindDTO) =>
  request<ResponseData<void>>(`${BASE}/bind`, { method: 'POST', data });

/**
 * PUT /{id}/release 解绑（二次确认在页面层做）。
 * 解绑会立即让该达人的路线在 C 端不可鼓励（G4 闸门），文案必须说清后果。
 */
export const releaseMerchantExpert = (id: number | string, remark?: string) =>
  request<ResponseData<void>>(`${BASE}/${id}/release`, {
    method: 'PUT',
    data: remark ? { remark } : undefined,
  });

/**
 * DELETE /{id} 删除绑定（权限串 `travel18:merchantExpert:unbind`）。
 * ⚠️ **不是物理删除**：后端 `remove()` 内部调 `merchantExpertService.release(id)`，
 *    等价于软解绑，历史绑定行与账单记录保留（`TravelMerchantExpertController.java:167-173`）。
 * ⚠️ 幂等：已是解绑态时后端也返回成功（msg「解绑成功」），调用方不要按文案分支。
 */
export const removeMerchantExpert = (id: number | string) =>
  request<ResponseData<void>>(`${BASE}/${id}`, { method: 'DELETE' });
