/**
 * Tests for orval-generated API service modules.
 *
 * These tests verify method signatures and endpoint URLs,
 * NOT the internal implementation of the mutator.
 */

import vi from 'vitest';

// Mock the orval mutator so we can inspect what endpoints are called
vi.mock('@/utils/orval-mutator', () => ({
  orvalMutator: vi.fn(({ url, method }) => Promise.resolve({ url, method })),
}));

import { orvalMutator } from '@/utils/orval-mutator';

// Import all service modules
import { get as attractionService } from '@/services/api/景点管理/景点管理';
import { get as checkinService } from '@/services/api/打卡点管理/打卡点管理';
import { get as dishService } from '@/services/api/菜品管理/菜品管理';
import { get as accommodationService } from '@/services/api/住宿管理/住宿管理';
import { get as diningService } from '@/services/api/餐饮管理/餐饮管理';
import { get as photographyService } from '@/services/api/跟拍管理/跟拍管理';
import { get as carService } from '@/services/api/包车管理/包车管理';
import { get as lineService } from '@/services/api/线路管理/线路管理';
import { get as templateService } from '@/services/api/行程模板管理/行程模板管理';
import { get as userService } from '@/services/api/用户管理/用户管理';

describe('API Service Structure Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper: verify a service exposes expected method names
  function verifyServiceMethods(
    serviceName: string,
    service: ReturnType<typeof get>,
    expectedMethods: string[],
  ) {
    it(`${serviceName} has expected methods`, () => {
      const actualMethods = Object.keys(service());
      for (const method of expectedMethods) {
        expect(actualMethods).toContain(method);
      }
    });
  }

  // Helper: verify an API call hits the correct endpoint
  async function verifyEndpoint(
    serviceName: string,
    methodName: string,
    methodFn: (params: any) => Promise<any>,
    expectedUrl: string,
    expectedMethod: string,
    params: any = {},
  ) {
    it(`${serviceName}.${methodName} calls ${expectedMethod} ${expectedUrl}`, async () => {
      await methodFn(params);
      expect(orvalMutator).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expectedUrl,
          method: expectedMethod,
        }),
      );
    });
  }

  // --- Attraction (景点) ---
  const attraction = attractionService();
  verifyServiceMethods('景点管理', attractionService, [
    'remove9', 'list7', 'export6', 'editSave7', 'addSave7', 'getInfo11', 'checkinList',
  ]);

  it('景点管理.list7 calls POST /travel18/attraction/list', async () => {
    await attraction.list7({});
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/attraction/list', method: 'POST' }),
    );
  });

  it('景点管理.addSave7 calls POST /travel18/attraction/add', async () => {
    await attraction.addSave7({});
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/attraction/add', method: 'POST' }),
    );
  });

  it('景点管理.editSave7 calls POST /travel18/attraction/edit', async () => {
    await attraction.editSave7({});
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/attraction/edit', method: 'POST' }),
    );
  });

  it('景点管理.getInfo11 calls GET /travel18/attraction/{id}', async () => {
    await attraction.getInfo11({ attractionId: 1 });
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/attraction/1', method: 'GET' }),
    );
  });

  it('景点管理.remove9 calls POST /travel18/attraction/remove', async () => {
    await attraction.remove9({});
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/attraction/remove', method: 'POST' }),
    );
  });

  it('景点管理.checkinList calls GET /travel18/attraction/checkin/{id}', async () => {
    await attraction.checkinList({ attractionId: 1 });
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/attraction/checkin/1', method: 'GET' }),
    );
  });

  // --- Checkin (打卡点) ---
  const checkin = checkinService();
  verifyServiceMethods('打卡点管理', checkinService, [
    'remove7', 'list5', 'export4', 'editSave5', 'addSave5', 'getInfo9',
  ]);

  it('打卡点管理.list5 calls POST /travel18/checkin/list', async () => {
    await checkin.list5({});
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/checkin/list', method: 'POST' }),
    );
  });

  it('打卡点管理.addSave5 calls POST /travel18/checkin/add', async () => {
    await checkin.addSave5({});
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/checkin/add', method: 'POST' }),
    );
  });

  it('打卡点管理.getInfo9 calls GET /travel18/checkin/{id}', async () => {
    await checkin.getInfo9({ checkinId: 1 });
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/checkin/1', method: 'GET' }),
    );
  });

  // --- Dish (菜品) ---
  const dish = dishService();
  verifyServiceMethods('菜品管理', dishService, [
    'remove5', 'list3', 'export2', 'editSave3', 'addSave3', 'getInfo7',
  ]);

  it('菜品管理.list3 calls POST /travel18/dish/list', async () => {
    await dish.list3({});
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/dish/list', method: 'POST' }),
    );
  });

  it('菜品管理.addSave3 calls POST /travel18/dish/add', async () => {
    await dish.addSave3({});
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/dish/add', method: 'POST' }),
    );
  });

  // --- Accommodation (住宿) ---
  const accommodation = accommodationService();
  verifyServiceMethods('住宿管理', accommodationService, [
    'remove11', 'list8', 'export7', 'editSave8', 'addSave8', 'getInfo13',
  ]);

  it('住宿管理.list8 calls POST /travel18/accommodation/list', async () => {
    await accommodation.list8({});
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/accommodation/list', method: 'POST' }),
    );
  });

  it('住宿管理.getInfo13 calls GET /travel18/accommodation/{id}', async () => {
    await accommodation.getInfo13({ accommodationId: 1 });
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/accommodation/1', method: 'GET' }),
    );
  });

  // --- Dining (餐饮) ---
  const dining = diningService();
  verifyServiceMethods('餐饮管理', diningService, [
    'remove6', 'list4', 'export3', 'editSave4', 'addSave4', 'getInfo8', 'getDishesByDining',
  ]);

  it('餐饮管理.list4 calls POST /travel18/dining/list', async () => {
    await dining.list4({});
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/dining/list', method: 'POST' }),
    );
  });

  it('餐饮管理.getDishesByDining calls GET /travel18/dining/{id}/dishes', async () => {
    await dining.getDishesByDining({ diningId: 1 });
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/dining/1/dishes', method: 'GET' }),
    );
  });

  // --- Photography (跟拍) ---
  const photography = photographyService();
  verifyServiceMethods('跟拍管理', photographyService, [
    'remove3', 'list1', '_export', 'editSave1', 'addSave1', 'getInfo6',
  ]);

  it('跟拍管理.list1 calls POST /travel18/photography/list', async () => {
    await photography.list1({});
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/photography/list', method: 'POST' }),
    );
  });

  it('跟拍管理.getInfo6 calls GET /travel18/photography/{id}', async () => {
    await photography.getInfo6({ photographyId: 1 });
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/photography/1', method: 'GET' }),
    );
  });

  // --- Car (包车) ---
  const car = carService();
  verifyServiceMethods('包车管理', carService, [
    'remove8', 'list6', 'export5', 'editSave6', 'addSave6', 'getInfo10',
  ]);

  it('包车管理.list6 calls POST /travel18/car/list', async () => {
    await car.list6({});
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/car/list', method: 'POST' }),
    );
  });

  it('包车管理.getInfo10 calls GET /travel18/car/{id}', async () => {
    await car.getInfo10({ carId: 1 });
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/car/1', method: 'GET' }),
    );
  });

  // --- Line (线路) ---
  const line = lineService();
  verifyServiceMethods('线路管理', lineService, [
    'remove4', 'list2', 'export1', 'editSave2', 'addSave2',
  ]);

  it('线路管理.list2 calls POST /travel18/line/list', async () => {
    await line.list2({});
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/line/list', method: 'POST' }),
    );
  });

  // Note: 线路管理 has no getInfo endpoint -- only CRUD

  // --- Template (行程模板) ---
  const template = templateService();
  verifyServiceMethods('行程模板管理', templateService, [
    'add1', 'remove1', 'generate', 'edit13', 'getInfo3', 'list12',
  ]);

  it('行程模板管理.list12 calls GET /travel18/template/list', async () => {
    await template.list12({});
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/template/list', method: 'GET' }),
    );
  });

  it('行程模板管理.getInfo3 calls GET /travel18/template/{id}', async () => {
    await template.getInfo3({ templateId: 1 });
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/travel18/template/1', method: 'GET' }),
    );
  });

  // --- User (用户) ---
  const user = userService();
  verifyServiceMethods('用户管理', userService, [
    'edit3', 'add3', 'resetPwd', 'changeStatus', 'insertAuthRole',
    'importTemplate', 'importData', 'export8', 'list15', 'deptTree',
    'authRole', 'getInfo14', 'getInfo15', 'remove14',
  ]);

  it('用户管理.list15 calls GET /system/user/list', async () => {
    await user.list15({});
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/system/user/list', method: 'GET' }),
    );
  });

  it('用户管理.getInfo15 calls GET /system/user/{id}', async () => {
    await user.getInfo15({ userId: 1 });
    expect(orvalMutator).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/system/user/1', method: 'GET' }),
    );
  });
});