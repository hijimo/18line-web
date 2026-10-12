/**
 * 达人路线保存 payload 的组装与校验（纯函数）。
 *
 * 这是整个达人路线编辑器唯一「错了就写脏数据」的地方，所以逐字段断言：
 * - body 必须严格是契约 §2 A1 的 `ExpertRouteSaveDTO` 形状；
 * - 前端专用的回显字段（attractionName/ownerUserId/blindStatus/ownerAuditStatus）**不得**出现在 body 里
 *   （后端 DTO 没有这些字段，多传虽然会被 Jackson 忽略，但会让"字段是否被后端认"这件事看不出来）；
 * - `dayIndex` 必须重写成连续 1..n，`sortOrder` 必须等于数组下标（后端按下标重写，前端不能传跳号）；
 * - `recommendWeight` 只有 admin 才提交（达人不得自调运营字段）。
 */

import {
  buildSavePayload,
  collectBlindHints,
  toFormValues,
  validateRouteDays,
} from '../payload';
import type { ExpertRouteFormValues } from '../payload';
import type { ExpertRouteDetail } from '@/types/expert';

const baseValues: ExpertRouteFormValues = {
  routeTitle: '  松阳三日·古村与茶园  ',
  intro: '一条适合慢走的路线',
  region: { province: '330000', city: '331100', district: '331124' },
  rewardEnabled: '1',
  status: '0',
  remark: '内部备注',
  recommendWeight: 88,
  coverFiles: [{ url: 'https://cdn/cover.jpg', name: 'cover' }],
  days: [
    {
      dayTheme: 'Day1 抵达',
      dayIntro: '下午到松阳',
      accommodationId: 12,
      breakfastDiningId: null,
      lunchDiningId: 21,
      dinnerDiningId: 22,
      carId: 31,
      photographyId: 41,
      attractions: [
        {
          attractionId: 15,
          attractionName: '陈家铺',
          ownerUserId: null,
          blindStatus: '0',
          expertIntro: '建议傍晚来',
        },
        {
          attractionId: 16,
          attractionName: '某全盲点',
          ownerUserId: 77,
          ownerAuditStatus: '1',
          blindStatus: '1',
          expertIntro: '',
        },
      ],
    },
    {
      dayTheme: 'Day2 茶园',
      attractions: [{ attractionId: 17, expertIntro: '带伞' }],
    },
  ],
};

describe('buildSavePayload · 契约 A1 body', () => {
  it('顶层字段与契约一致，标题去首尾空格，封面取第一张图 url', () => {
    const payload = buildSavePayload(baseValues, { routeId: null });
    expect(payload).toMatchObject({
      routeId: null,
      routeTitle: '松阳三日·古村与茶园',
      coverUrl: 'https://cdn/cover.jpg',
      intro: '一条适合慢走的路线',
      province: '330000',
      city: '331100',
      district: '331124',
      rewardEnabled: '1',
      status: '0',
      remark: '内部备注',
    });
  });

  it('days 的 dayIndex 重写成连续 1..n，attractions.sortOrder 等于数组下标', () => {
    const payload = buildSavePayload(baseValues, { routeId: 9 });
    expect(payload.routeId).toBe(9);
    expect(payload.days.map((d) => d.dayIndex)).toEqual([1, 2]);
    expect(payload.days[0]?.attractions?.map((a) => a.sortOrder)).toEqual([0, 1]);
    expect(payload.days[1]?.attractions?.map((a) => a.sortOrder)).toEqual([0]);
  });

  it('景点项只保留 attractionId / expertIntro / sortOrder，前端回显字段全部剔除', () => {
    const payload = buildSavePayload(baseValues, { routeId: 9 });
    expect(payload.days[0]?.attractions?.[0]).toEqual({
      attractionId: 15,
      expertIntro: '建议傍晚来',
      sortOrder: 0,
    });
    // 空讲解要显式传 null（后端 @Size 校验 null 合法，传 '' 也合法，但不能是 undefined 被 JSON 丢掉）
    expect(payload.days[0]?.attractions?.[1]).toEqual({
      attractionId: 16,
      expertIntro: null,
      sortOrder: 1,
    });
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('attractionName');
    expect(serialized).not.toContain('ownerUserId');
    expect(serialized).not.toContain('blindStatus');
    expect(serialized).not.toContain('ownerAuditStatus');
  });

  it('recommendWeight：admin 提交，达人**整个字段都不出现**（而不是传 null 把已有权重冲掉）', () => {
    const asAdmin = buildSavePayload(baseValues, { routeId: 1, includeRecommendWeight: true });
    expect(asAdmin.recommendWeight).toBe(88);

    const asDaren = buildSavePayload(baseValues, { routeId: 1, includeRecommendWeight: false });
    expect('recommendWeight' in asDaren).toBe(false);
    expect(JSON.stringify(asDaren)).not.toContain('recommendWeight');
  });

  it('未选封面/未填地区时传 null，而不是 undefined 被 JSON 丢字段', () => {
    const payload = buildSavePayload(
      { routeTitle: 'T', days: [{ attractions: [{ attractionId: 1 }] }] },
      { routeId: null },
    );
    expect(JSON.parse(JSON.stringify(payload))).toMatchObject({
      coverUrl: null,
      intro: null,
      province: null,
      city: null,
      district: null,
      rewardEnabled: '0',
      status: '0',
    });
  });

  it('不含 authorUserId / auditStatus（服务端从登录态取，审核只能走 A2）', () => {
    const serialized = JSON.stringify(buildSavePayload(baseValues, { routeId: 1 }));
    expect(serialized).not.toContain('authorUserId');
    expect(serialized).not.toContain('auditStatus');
  });
});

describe('toFormValues · 详情回填', () => {
  const detail: ExpertRouteDetail = {
    routeId: 5,
    routeTitle: '回填路线',
    coverUrl: 'https://cdn/c.jpg',
    intro: 'intro',
    province: '330000',
    city: '331100',
    district: null,
    rewardEnabled: '1',
    recommendWeight: 7,
    status: '0',
    remark: 'r',
    auditStatus: '1',
    days: [
      // 故意乱序，验证按 dayIndex / sortOrder 升序回填
      {
        dayIndex: 2,
        dayTheme: 'D2',
        attractions: [{ attractionId: 30, expertIntro: 'c', sortOrder: 0 }],
      },
      {
        dayIndex: 1,
        dayTheme: 'D1',
        attractions: [
          { attractionId: 20, expertIntro: 'b', sortOrder: 1 },
          { attractionId: 10, expertIntro: 'a', sortOrder: 0 },
        ],
      },
    ],
  };

  it('days 按 dayIndex 升序、天内景点按 sortOrder 升序', () => {
    const values = toFormValues(detail);
    expect(values.days?.map((d) => d.dayTheme)).toEqual(['D1', 'D2']);
    expect(values.days?.[0]?.attractions?.map((a) => a.attractionId)).toEqual([10, 20]);
  });

  it('封面 url 还原成 UploadList 的 fileList 形状，district 为 null 时给 undefined', () => {
    const values = toFormValues(detail);
    expect(values.coverFiles).toEqual([{ url: 'https://cdn/c.jpg', name: 'cover' }]);
    expect(values.region).toEqual({
      province: '330000',
      city: '331100',
      district: undefined,
    });
  });

  it('没有封面时给空数组（否则 UploadList 会渲染出一个 undefined 项）', () => {
    expect(toFormValues({ ...detail, coverUrl: null }).coverFiles).toEqual([]);
  });
});

describe('validateRouteDays · §7.1 校验 1 + V4 上限', () => {
  it('0 天 → 至少一天', () => {
    expect(validateRouteDays([])).toEqual(['至少需要编排一天']);
  });

  it('某天没有景点 → 指出是第几天', () => {
    const errors = validateRouteDays([
      { attractions: [{ attractionId: 1 }] },
      { attractions: [] },
    ]);
    expect(errors).toEqual(['第 2 天至少选择 1 个景点']);
  });

  it('超过 20 个景点/天 → 报错（与后端 MAX_DAY_ATTRACTION_COUNT 对齐）', () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ attractionId: i + 1 }));
    expect(validateRouteDays([{ attractions: many }])[0]).toContain('超过 20 个上限');
  });

  it('超过 30 天 → 报错（ExpertRouteSaveDTO.days @Size(max=30)）', () => {
    const days = Array.from({ length: 31 }, () => ({ attractions: [{ attractionId: 1 }] }));
    expect(validateRouteDays(days)[0]).toContain('最多支持 30 天');
  });

  it('同一天重复选同一景点 → 报错（后端唯一键会撞）', () => {
    const errors = validateRouteDays([
      { attractions: [{ attractionId: 1 }, { attractionId: 1 }] },
    ]);
    expect(errors[0]).toContain('重复景点');
  });

  it('合法编排返回空数组', () => {
    expect(validateRouteDays([{ attractions: [{ attractionId: 1 }] }])).toEqual([]);
  });
});

describe('collectBlindHints · §7.1 校验 2/3', () => {
  it('含全盲景点 → warning：讲解会在揭晓前展示', () => {
    const hints = collectBlindHints([
      { attractions: [{ attractionId: 1, blindStatus: '0' }, { attractionId: 2, blindStatus: '1' }] },
    ]);
    expect(hints.some((h) => h.level === 'warning' && h.text.includes('请勿写出景点名称'))).toBe(true);
  });

  it('首个景点是全盲 → info 软提示，且不拦截', () => {
    const hints = collectBlindHints([{ attractions: [{ attractionId: 1, blindStatus: '1' }] }]);
    expect(hints.some((h) => h.level === 'info' && h.text.includes('第一站即为盲盒'))).toBe(true);
  });

  it('没有全盲景点 → 无提示', () => {
    expect(collectBlindHints([{ attractions: [{ attractionId: 1, blindStatus: '0' }] }])).toEqual([]);
  });
});
