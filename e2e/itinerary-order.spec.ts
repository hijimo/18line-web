import { apiRequest, expect, test } from './helpers/crud';

test.describe.configure({ mode: 'serial' });

test.describe('行程景点排序 API', () => {
  let itineraryId: number | null = null;
  let dayNumber = 1;

  test.beforeAll(async ({ loggedInPage }) => {
    const page = loggedInPage;
    // 查询现有行程用于测试
    const listResult = await apiRequest(page, '/wx/itinerary/list', 'GET');
    if (listResult.data && listResult.data.length > 0) {
      itineraryId = listResult.data[0].itineraryId;
    }
  });

  test('更新日程景点顺序（replace=true）— 保存新顺序', async ({ loggedInPage }) => {
    test.skip(!itineraryId, '无可用行程数据');
    const page = loggedInPage;

    // 先获取行程详情
    const detail = await apiRequest(page, `/wx/itinerary/${itineraryId}`, 'GET');
    expect(detail.code).toBe(200);

    const days = detail.data?.daysList;
    if (!days || days.length === 0) {
      test.skip(true, '行程无日程数据');
      return;
    }

    const day = days[0];
    dayNumber = day.dayNumber || 1;
    const attractions = day.attractionList || day.touristAttractionList;
    if (!attractions || attractions.length < 2) {
      test.skip(true, '日程景点不足2个，无法测试排序');
      return;
    }

    // 反转景点顺序
    const reversedIds = [...attractions]
      .reverse()
      .map((a: any) => a.attractionId)
      .join(',');

    const result = await apiRequest(
      page,
      `/wx/itinerary/${itineraryId}/day/${dayNumber}/attractions?replace=true`,
      'POST',
      reversedIds,
    );
    expect(result.code).toBe(200);

    // 验证新顺序已保存
    const verify = await apiRequest(page, `/wx/itinerary/${itineraryId}`, 'GET');
    const verifyDay = verify.data?.daysList?.find((d: any) => d.dayNumber === dayNumber);
    const savedList = verifyDay?.touristAttractionList || verifyDay?.attractionList;
    if (savedList && savedList.length >= 2) {
      // 验证顺序已反转
      const savedIds = savedList.map((a: any) => a.attractionId).join(',');
      expect(savedIds).toBe(reversedIds);
    }
  });

  test('重置日程景点为系统推荐顺序（空字符串 replace=true）', async ({ loggedInPage }) => {
    test.skip(!itineraryId, '无可用行程数据');
    const page = loggedInPage;

    const result = await apiRequest(
      page,
      `/wx/itinerary/${itineraryId}/day/${dayNumber}/attractions?replace=true`,
      'POST',
      '',
    );
    expect(result.code).toBe(200);

    // 验证 touristAttractionIds 已被清空（回退到 attractionList）
    const verify = await apiRequest(page, `/wx/itinerary/${itineraryId}`, 'GET');
    const verifyDay = verify.data?.daysList?.find((d: any) => d.dayNumber === dayNumber);
    // touristAttractionIds 应为 null 或空
    expect(verifyDay?.touristAttractionIds || '').toBeFalsy();
  });

  test('景点ID格式校验 — 非法格式应返回错误', async ({ loggedInPage }) => {
    test.skip(!itineraryId, '无可用行程数据');
    const page = loggedInPage;

    const result = await apiRequest(
      page,
      `/wx/itinerary/${itineraryId}/day/${dayNumber}/attractions?replace=true`,
      'POST',
      'abc,def',
    );
    expect(result.code).not.toBe(200);
  });
});
