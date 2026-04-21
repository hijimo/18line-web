/**
 * MSW handlers for CRUD page tests.
 *
 * Provides mock API responses for all travel18 endpoints
 * so that ProTable can render with data in tests.
 */

import { http, HttpResponse } from 'msw';

function createPaginatedResponse(data: Record<string, unknown>[], pageNo = 1, pageSize = 10) {
  return HttpResponse.json({
    code: 200,
    message: 'success',
    data: {
      data,
      pageNo,
      pageSize,
      totalCount: data.length,
      totalPage: Math.ceil(data.length / pageSize),
    },
    sessionId: 'test-session',
  });
}

function createSuccessResponse(data?: Record<string, unknown>) {
  return HttpResponse.json({
    code: 200,
    message: '操作成功',
    ...(data ? { data } : {}),
    sessionId: 'test-session',
  });
}

// Shared mock data for each module
const mockAttractions = [
  { id: 1, name: '测试景点A', status: '1', created: '2024-01-01 12:00:00', creatorName: 'admin' },
  { id: 2, name: '测试景点B', status: '0', created: '2024-02-01 12:00:00', creatorName: 'admin' },
];

const mockCheckins = [
  { id: 1, name: '打卡点A', status: '1', created: '2024-01-01 12:00:00', creatorName: 'admin' },
];

const mockDishes = [
  { id: 1, name: '菜品A', status: '1', created: '2024-01-01 12:00:00', creatorName: 'admin' },
];

const mockAccommodations = [
  { id: 1, name: '住宿A', status: '1', created: '2024-01-01 12:00:00', creatorName: 'admin' },
];

const mockDinings = [
  { id: 1, name: '餐饮A', status: '1', created: '2024-01-01 12:00:00', creatorName: 'admin' },
];

const mockPhotographies = [
  { id: 1, name: '跟拍A', status: '1', created: '2024-01-01 12:00:00', creatorName: 'admin' },
];

const mockCars = [
  { id: 1, name: '包车A', status: '1', created: '2024-01-01 12:00:00', creatorName: 'admin' },
];

const mockLines = [
  { id: 1, name: '线路A', status: '1', created: '2024-01-01 12:00:00', creatorName: 'admin' },
];

const mockTemplates = [
  { id: 1, name: '行程模板A', status: '1', created: '2024-01-01 12:00:00', creatorName: 'admin' },
];

const mockUsers = [
  { id: 1, email: 'test@example.com', displayName: '测试用户', phone: '13800138000', roles: ['user'], isActive: true },
];

export const crudHandlers = [
  // 景点管理
  http.post('*/travel18/attraction/list', () => createPaginatedResponse(mockAttractions)),
  http.post('*/travel18/attraction/add', () => createSuccessResponse()),
  http.post('*/travel18/attraction/edit', () => createSuccessResponse()),
  http.post('*/travel18/attraction/remove', () => createSuccessResponse()),
  http.get('*/travel18/attraction/:id', ({ params }) =>
    createSuccessResponse({ ...mockAttractions[0], id: Number(params.id) }),
  ),
  http.get('*/travel18/attraction/checkin/:id', () => createSuccessResponse(mockCheckins)),

  // 打卡点管理
  http.post('*/travel18/checkin/list', () => createPaginatedResponse(mockCheckins)),
  http.post('*/travel18/checkin/add', () => createSuccessResponse()),
  http.post('*/travel18/checkin/edit', () => createSuccessResponse()),
  http.post('*/travel18/checkin/remove', () => createSuccessResponse()),
  http.get('*/travel18/checkin/:id', ({ params }) =>
    createSuccessResponse({ ...mockCheckins[0], id: Number(params.id) }),
  ),

  // 菜品管理
  http.post('*/travel18/dish/list', () => createPaginatedResponse(mockDishes)),
  http.post('*/travel18/dish/add', () => createSuccessResponse()),
  http.post('*/travel18/dish/edit', () => createSuccessResponse()),
  http.post('*/travel18/dish/remove', () => createSuccessResponse()),
  http.get('*/travel18/dish/:id', ({ params }) =>
    createSuccessResponse({ ...mockDishes[0], id: Number(params.id) }),
  ),

  // 住宿管理
  http.post('*/travel18/accommodation/list', () => createPaginatedResponse(mockAccommodations)),
  http.post('*/travel18/accommodation/add', () => createSuccessResponse()),
  http.post('*/travel18/accommodation/edit', () => createSuccessResponse()),
  http.post('*/travel18/accommodation/remove', () => createSuccessResponse()),
  http.get('*/travel18/accommodation/:id', ({ params }) =>
    createSuccessResponse({ ...mockAccommodations[0], id: Number(params.id) }),
  ),

  // 餐饮管理
  http.post('*/travel18/dining/list', () => createPaginatedResponse(mockDinings)),
  http.post('*/travel18/dining/add', () => createSuccessResponse()),
  http.post('*/travel18/dining/edit', () => createSuccessResponse()),
  http.post('*/travel18/dining/remove', () => createSuccessResponse()),
  http.get('*/travel18/dining/:id', ({ params }) =>
    createSuccessResponse({ ...mockDinings[0], id: Number(params.id) }),
  ),
  http.get('*/travel18/dining/:id/dishes', () => createSuccessResponse(mockDishes)),

  // 跟拍管理
  http.post('*/travel18/photography/list', () => createPaginatedResponse(mockPhotographies)),
  http.post('*/travel18/photography/add', () => createSuccessResponse()),
  http.post('*/travel18/photography/edit', () => createSuccessResponse()),
  http.post('*/travel18/photography/remove', () => createSuccessResponse()),
  http.get('*/travel18/photography/:id', ({ params }) =>
    createSuccessResponse({ ...mockPhotographies[0], id: Number(params.id) }),
  ),

  // 包车管理
  http.post('*/travel18/car/list', () => createPaginatedResponse(mockCars)),
  http.post('*/travel18/car/add', () => createSuccessResponse()),
  http.post('*/travel18/car/edit', () => createSuccessResponse()),
  http.post('*/travel18/car/remove', () => createSuccessResponse()),
  http.get('*/travel18/car/:id', ({ params }) =>
    createSuccessResponse({ ...mockCars[0], id: Number(params.id) }),
  ),

  // 线路管理
  http.post('*/travel18/line/list', () => createPaginatedResponse(mockLines)),
  http.post('*/travel18/line/add', () => createSuccessResponse()),
  http.post('*/travel18/line/edit', () => createSuccessResponse()),
  http.post('*/travel18/line/remove', () => createSuccessResponse()),

  // 行程模板管理
  http.get('*/travel18/template/list', () => createPaginatedResponse(mockTemplates)),
  http.post('*/travel18/template', () => createSuccessResponse()),
  http.post('*/travel18/template/edit', () => createSuccessResponse()),
  http.post('*/travel18/template/remove', () => createSuccessResponse()),
  http.post('*/travel18/template/generate', () => createSuccessResponse()),
  http.get('*/travel18/template/:id', ({ params }) =>
    createSuccessResponse({ ...mockTemplates[0], id: Number(params.id) }),
  ),

  // 用户管理
  http.get('*/system/user/list', () => createPaginatedResponse(mockUsers)),
  http.get('*/system/user/:id', ({ params }) =>
    createSuccessResponse({ ...mockUsers[0], id: Number(params.id) }),
  ),
  http.put('*/system/user', () => createSuccessResponse()),
  http.post('*/system/user', () => createSuccessResponse()),
  http.put('*/system/user/changeStatus', () => createSuccessResponse()),
];