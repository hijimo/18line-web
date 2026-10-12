/**
 * 达人路线编辑器的**纯数据层**：表单值 ↔ 契约 body 的双向转换与校验。
 *
 * 单独抽出来的原因：这是整个页面唯一「错了就写脏数据」的地方
 * （提交结构见 `docs/contracts/expert-route-api-v1.md` §2 A1 `ExpertRouteSaveDTO`），
 * 而 Drawer + Form.List + Collapse 的 DOM 在 jsdom 里既慢又脆。
 * 把 payload 组装做成纯函数，单测可以逐字段断言，不用靠点 UI 反推。
 *
 * ⚠️ 序列化约定与设计文档 §7.1 的差异（R18 已作废旧口径）：
 * - **不**flatten 成 `lineAttractions` 平铺数组，也**不**用 Template 页的逗号分隔字符串；
 *   达人景点带 `expertIntro` 附属字段，字符串编码装不下。
 * - 直接按契约提交 `days[].attractions[] = {attractionId, expertIntro, sortOrder}` 嵌套结构。
 * - `sortOrder` 前端按数组下标写（0 起），但**后端会按数组下标重写、不信任前端传值**
 *   （`ExpertRouteSaveDTO.AttractionItem.sortOrder` 的注释原文），所以这里的顺序即真相。
 */

import type { ExpertAttractionRef } from '@/components/DataSelect/ExpertAttractionSelect';
import { BlindStatusEnum } from '@/enums';
import { MAX_DAY_ATTRACTION_COUNT, MAX_ROUTE_DAY_COUNT } from '@/enums/expert';
import type { ExpertRouteDetail, ExpertRouteSaveDTO } from '@/types/expert';

/** 编辑器的景点行 = 选择器引用 + 达人讲解 */
export type ExpertRouteAttractionFormItem = ExpertAttractionRef & {
  expertIntro?: string | null;
};

export type ExpertRouteFormDay = {
  dayTheme?: string | null;
  dayIntro?: string | null;
  accommodationId?: number | null;
  breakfastDiningId?: number | null;
  lunchDiningId?: number | null;
  dinnerDiningId?: number | null;
  carId?: number | null;
  photographyId?: number | null;
  attractions?: ExpertRouteAttractionFormItem[];
};

/** UploadList 的 fileList 元素（只用到 url/name，避免依赖 Upload 组件的内部类型） */
export type UploadFileLike = { url?: string; name?: string };

export type ExpertRouteFormValues = {
  routeTitle?: string;
  intro?: string | null;
  region?: { province?: string; city?: string; district?: string };
  rewardEnabled?: string;
  recommendWeight?: number | null;
  status?: string;
  remark?: string | null;
  coverFiles?: UploadFileLike[];
  days?: ExpertRouteFormDay[];
};

export type BuildPayloadOptions = {
  /** 修改时带上；新增传 null */
  routeId?: number | null;
  /**
   * 是否提交 `recommendWeight`（推荐权重）。
   * ⚠️ 只有 admin 该有这个开关：它是瀑布流排序的运营字段，达人不得自调。
   *    后端 `ExpertRouteSaveDTO` **有这个字段**，拦截发生在服务层
   *    `resolveRecommendWeight`（非 admin 忽略 + 记 warn），前端这里只是不主动送上去。
   * 传 false 时**整个字段都不出现在 body 里**。注意后端把 `null` 也解释为「不改」，
   * 所以两种写法都不会把已有权重清零；仍然选择整体省略，是为了让「达人视角没有这个
   * 运营字段」在请求体上就是可见的事实（抓包即可判断），而不是依赖后端悄悄忽略。
   */
  includeRecommendWeight?: boolean;
};

/** 详情 → 表单值（子表按 dayIndex / sortOrder 升序，保证与后端展示顺序一致） */
export const toFormValues = (detail: ExpertRouteDetail): ExpertRouteFormValues => {
  const days = [...(detail.days ?? [])]
    .sort((a, b) => (a.dayIndex ?? 0) - (b.dayIndex ?? 0))
    .map((day) => ({
      dayTheme: day.dayTheme ?? undefined,
      dayIntro: day.dayIntro ?? undefined,
      accommodationId: day.accommodationId ?? null,
      breakfastDiningId: day.breakfastDiningId ?? null,
      lunchDiningId: day.lunchDiningId ?? null,
      dinnerDiningId: day.dinnerDiningId ?? null,
      carId: day.carId ?? null,
      photographyId: day.photographyId ?? null,
      attractions: [...(day.attractions ?? [])]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((item) => ({
          attractionId: item.attractionId,
          attractionName: item.attractionName,
          ownerUserId: item.ownerUserId ?? null,
          ownerAuditStatus: item.ownerAuditStatus ?? null,
          blindStatus: item.blindStatus ?? null,
          expertIntro: item.expertIntro ?? '',
        })),
    }));

  return {
    routeTitle: detail.routeTitle,
    intro: detail.intro ?? undefined,
    region: {
      province: detail.province ?? undefined,
      city: detail.city ?? undefined,
      district: detail.district ?? undefined,
    },
    rewardEnabled: detail.rewardEnabled ?? '0',
    recommendWeight: detail.recommendWeight ?? 0,
    status: detail.status ?? '0',
    remark: detail.remark ?? undefined,
    coverFiles: detail.coverUrl ? [{ url: detail.coverUrl, name: 'cover' }] : [],
    days,
  };
};

/**
 * 讲解文案归一化：去首尾空白，空串 → null。
 * 为什么不能留空串：`expert_intro` 在 C 端遮挡态也会展示（契约 §1 W2），
 * 空串会让小程序渲染出一个空气泡，而 NULL 走的是「不展示」分支。
 */
const normalizeIntro = (intro?: string | null): string | null => {
  const trimmed = intro?.trim();
  return trimmed ? trimmed : null;
};

/** 表单值 → 契约 A1 body。`days` 为空时由调用方先拦（validateRouteDays） */
export const buildSavePayload = (
  values: ExpertRouteFormValues,
  options: BuildPayloadOptions = {},
): ExpertRouteSaveDTO => {
  const { routeId = null, includeRecommendWeight = false } = options;
  const days = values.days ?? [];

  const payload: ExpertRouteSaveDTO = {
    routeId,
    routeTitle: (values.routeTitle ?? '').trim(),
    coverUrl: values.coverFiles?.[0]?.url ?? null,
    intro: values.intro ?? null,
    province: values.region?.province ?? null,
    city: values.region?.city ?? null,
    district: values.region?.district ?? null,
    rewardEnabled: values.rewardEnabled ?? '0',
    status: values.status ?? '0',
    remark: values.remark ?? null,
    days: days.map((day, dayIdx) => ({
      // dayIndex 按数组下标重写成连续 1..n：后端「按提交顺序重排，不信任前端传值」，
      // 但前端也不能传跳号，否则 route.day_count 与 Form.List 长度对不上（§7.1 校验 1）
      dayIndex: dayIdx + 1,
      dayTheme: day.dayTheme ?? null,
      dayIntro: day.dayIntro ?? null,
      accommodationId: day.accommodationId ?? null,
      breakfastDiningId: day.breakfastDiningId ?? null,
      lunchDiningId: day.lunchDiningId ?? null,
      dinnerDiningId: day.dinnerDiningId ?? null,
      carId: day.carId ?? null,
      photographyId: day.photographyId ?? null,
      attractions: (day.attractions ?? []).map((item, idx) => ({
        attractionId: item.attractionId,
        expertIntro: normalizeIntro(item.expertIntro),
        sortOrder: idx,
      })),
    })),
  };

  if (includeRecommendWeight && values.recommendWeight !== undefined) {
    payload.recommendWeight = values.recommendWeight ?? null;
  }

  return payload;
};

/**
 * 分天编排校验（设计文档 §7.1「编辑器必须有的 3 个校验/提示」的第 1 条 + V4 上限）。
 * 返回**可直接展示**的中文错误列表，空数组 = 通过。
 */
export const validateRouteDays = (days: ExpertRouteFormDay[] = []): string[] => {
  const errors: string[] = [];
  if (!days.length) {
    errors.push('至少需要编排一天');
    return errors;
  }
  if (days.length > MAX_ROUTE_DAY_COUNT) {
    errors.push(`最多支持 ${MAX_ROUTE_DAY_COUNT} 天`);
  }
  days.forEach((day, idx) => {
    const count = day.attractions?.length ?? 0;
    if (count === 0) {
      errors.push(`第 ${idx + 1} 天至少选择 1 个景点`);
    } else if (count > MAX_DAY_ATTRACTION_COUNT) {
      errors.push(`第 ${idx + 1} 天景点数超过 ${MAX_DAY_ATTRACTION_COUNT} 个上限`);
    }
    // 同一天内重复选同一个景点：后端唯一键会撞，前端先拦
    const ids = (day.attractions ?? []).map((a) => a.attractionId);
    const duplicated = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicated.length) {
      errors.push(`第 ${idx + 1} 天存在重复景点（ID: ${[...new Set(duplicated)].join(', ')}）`);
    }
  });
  return errors;
};

export type BlindHint = {
  dayIndex: number;
  /** warning = 讲解会剧透；info = 首站盲盒软提示（不拦截） */
  level: 'warning' | 'info';
  text: string;
};

/**
 * 全盲景点提示（§7.1 校验 2 与校验 3）。
 * - 当天选了全盲景点 → warning：讲解在揭晓前也会展示，别写景点名与具体位置；
 * - 当天**第一个**景点是全盲 → info：用户创建行程后第一站即盲盒（软提示，不拦截）。
 */
export const collectBlindHints = (days: ExpertRouteFormDay[] = []): BlindHint[] => {
  const hints: BlindHint[] = [];
  days.forEach((day, idx) => {
    const attractions = day.attractions ?? [];
    const hasBlind = attractions.some((a) => a.blindStatus === BlindStatusEnum.YES);
    if (hasBlind) {
      hints.push({
        dayIndex: idx + 1,
        level: 'warning',
        text: '本日含全盲景点：这段讲解会在揭晓前展示给用户，请勿写出景点名称与具体位置。',
      });
    }
    if (attractions[0]?.blindStatus === BlindStatusEnum.YES) {
      hints.push({
        dayIndex: idx + 1,
        level: 'info',
        text: '本日首个景点为全盲景点，用户创建行程后第一站即为盲盒（不会明文显示）。',
      });
    }
  });
  return hints;
};
