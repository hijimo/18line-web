import { describe, it, expect } from 'vitest';
import { get as getAttractionApi } from '@/services/api/景点管理/景点管理';
import { get as getCheckinApi } from '@/services/api/打卡点管理/打卡点管理';
import { get as getDishApi } from '@/services/api/菜品管理/菜品管理';
import { get as getStayApi } from '@/services/api/住宿管理/住宿管理';
import { get as getDiningApi } from '@/services/api/餐饮管理/餐饮管理';
import { get as getPhotographyApi } from '@/services/api/跟拍管理/跟拍管理';
import { get as getCarApi } from '@/services/api/包车管理/包车管理';
import { get as getRouteApi } from '@/services/api/线路管理/线路管理';
import { get as getTouristApi } from '@/services/api/游客管理/游客管理';
import { get as getEasterEggApi } from '@/services/api/彩蛋管理/彩蛋管理';

const requiredMethods = ['list', 'add', 'edit', 'remove', 'getInfo'];

describe('API Service Structure', () => {
  const modules = [
    { name: '景点管理', api: getAttractionApi(), methods: ['list7', 'addSave7', 'editSave7', 'remove9', 'getInfo11', 'export6', 'checkinList'] },
    { name: '打卡点管理', api: getCheckinApi(), methods: ['list5', 'addSave5', 'editSave5', 'remove7', 'getInfo9', 'export4'] },
    { name: '菜品管理', api: getDishApi(), methods: ['list3', 'addSave3', 'editSave3', 'remove5', 'getInfo7', 'export2'] },
    { name: '住宿管理', api: getStayApi(), methods: ['list8', 'addSave8', 'editSave8', 'remove11', 'getInfo13', 'export7'] },
    { name: '餐饮管理', api: getDiningApi(), methods: ['list4', 'addSave4', 'editSave4', 'remove6', 'getInfo8', 'export3', 'getDishesByDining'] },
    { name: '跟拍管理', api: getPhotographyApi(), methods: ['list1', 'addSave1', 'editSave1', 'remove3', 'getInfo6', '_export'] },
    { name: '包车管理', api: getCarApi(), methods: ['list6', 'addSave6', 'editSave6', 'remove8', 'getInfo10', 'export5'] },
    { name: '线路管理', api: getRouteApi(), methods: ['list2', 'addSave2', 'editSave2', 'remove4', 'export1'] },
    { name: '游客管理', api: getTouristApi(), methods: ['list11', 'edit1', 'getInfo2', 'remove12'] },
    { name: '彩蛋管理', api: getEasterEggApi(), methods: ['list', 'add', 'edit', 'remove', 'getInfo'] },
  ];

  modules.forEach(({ name, api, methods }) => {
    describe(name, () => {
      it('has all required methods', () => {
        methods.forEach((method) => {
          expect(api[method]).toBeDefined();
          expect(typeof api[method]).toBe('function');
        });
      });

      it('get() returns an object with all methods', () => {
        expect(typeof api).toBe('object');
        expect(Object.keys(api).length).toBe(methods.length);
      });
    });
  });
});