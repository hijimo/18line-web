/**
 * A7 达人应付/对账单 + A10 达人收入（后台接口）。
 *
 * ⚠️ **施工期手写垫片**，后端部署后改为 `pnpm api` 生成产物并删除本文件
 *    （迁移步骤见同目录 `expertRoute.ts` 文件头）。
 *
 * 路径唯一真相源：`docs/contracts/expert-route-api-v1.md` §2 A7 / A10；
 * SQL 口径见 `docs/architecture/expert-route-design.md` §8.2（明细）/ §8.3（汇总）/ §8.4（导出）。
 * 权限串：`travel18:expertPayable:list|query|export`（**export 不授予 daren**，menu_id=2262）。
 *
 * ⚠️ 资金口径红线（前端不负责过滤，但必须知道后端在做什么，否则会把空列表当 bug）：
 * - 明细/汇总/导出都必须带 `expert_route_id IS NOT NULL`，否则会把「商家线路打赏」
 *   算进达人收入（两者 author_user_id 可能相同），对账金额虚高（设计文档 V16）。
 * - 达人「只看自己」靠后端 SQL 层 `author_user_id = 当前登录用户`，
 *   **前端不要传 authorUserId 来决定看谁**，后端一律不信前端传的参数。
 * - 🔴 账期口径是 **`p.create_time`（记账时间）**，不是 `o.paid_time`：后端
 *   `TravelExpertRewardMapper.xml` 的 `incomeWhere`/`selectIncomeDetail` 都按 create_time
 *   过滤与排序，为的是与结算批次 `claimForBatch`/`sumPendingForBatch` 同口径
 *   （刻意偏离设计文档 §8.2，详见 `types/expert.ts` 的 ExpertIncomeQuery 注释）。
 *   `paidTime` 仍会返回，仅用于让差异可见可解释。
 *   ⚠️ A4 达人鼓励订单页是另一套口径（`t.paid_time`），两者不要互相套用。
 */

import request from '@/utils/request';
import type { ResponseData, ResponsePaginationData } from '@/types/common';
import type {
  ExpertIncomeDetail,
  ExpertIncomeQuery,
  ExpertIncomeSummaryItem,
} from '@/types/expert';
import { postForDownload } from './download';

const INCOME_BASE = '/travel18/expertIncome';
const PAYABLE_BASE = '/travel18/expertPayable';

/** A10 GET /summary 顶部汇总卡片（后端按 terminal_group 分组，安卓/iOS 不合并） */
export const getExpertIncomeSummary = (params: ExpertIncomeQuery) =>
  request<ResponseData<ExpertIncomeSummaryItem[]>>(`${INCOME_BASE}/summary`, { params });

/** A10 GET /detail 明细分页 */
export const listExpertIncomeDetail = (params: ExpertIncomeQuery) =>
  request<ResponsePaginationData<ExpertIncomeDetail>>(`${INCOME_BASE}/detail`, { params });

/** A7 GET /list 应付流水分页（admin 视角，可按商家/达人筛） */
export const listExpertPayable = (params: ExpertIncomeQuery) =>
  request<ResponsePaginationData<ExpertIncomeDetail>>(`${PAYABLE_BASE}/list`, { params });

/**
 * A7 POST /export 按商家导出对账单（Excel 文件流）。
 *
 * ⚠️ 导出范围 = **当前筛选条件**，不是全量（避免达人导出别人的数据）。
 *    这条是资金数据越界红线：admin 按「某商家 + 某账期」筛选后导出，
 *    如果筛选条件没传到后端，Excel 里会是全平台全账期，发给入驻商家即越界交付（§8.4）。
 * ⚠️ 筛选条件走 **query string**，不是 JSON body：RuoYi 的 export 控制器签名是
 *    `export(HttpServletResponse response, ExpertIncomeQuery query)`，**无 `@RequestBody`**，
 *    JSON body 一律绑不上（详见 `download.ts` 文件头）。
 * ⚠️ A7/A10 的时间区间是**顶层** `beginTime`/`endTime`（后端建独立 query 对象承接），
 *    与 A4 的 RuoYi `params[beginTime]` 形态**不同**，不要互相套用。
 * ⚠️ 走 `postForDownload` 而不是 `request`：`utils/request.ts` 的响应拦截器
 *    会解构 `res.data.code`，文件流没有 code，会被当成业务错误抛掉。
 */
export const exportExpertPayable = (params: ExpertIncomeQuery) =>
  postForDownload(`${PAYABLE_BASE}/export`, params, '达人对账单.xlsx');
