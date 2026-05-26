import { describe, expect, it } from 'vitest';
import { get as getStayApi } from '@/services/api/住宿管理/住宿管理';
import { get as getCarApi } from '@/services/api/包车管理/包车管理';
import { get as getCheckinApi } from '@/services/api/打卡点管理/打卡点管理';
import { get as getAttractionApi } from '@/services/api/景点管理/景点管理';
import { get as getTouristApi } from '@/services/api/游客管理/游客管理';
import { get as getRouteApi } from '@/services/api/线路管理/线路管理';
import { get as getDishApi } from '@/services/api/菜品管理/菜品管理';
import { get as getPhotographyApi } from '@/services/api/跟拍管理/跟拍管理';
import { get as getDiningApi } from '@/services/api/餐饮管理/餐饮管理';

describe('API Service Structure', () => {
  const modules = [
    {
      name: '景点管理',
      api: getAttractionApi(),
      methods: [
        'list8',
        'addSave9',
        'editSave8',
        'remove10',
        'getInfo17',
        'export7',
        'checkinList',
      ],
    },
    {
      name: '打卡点管理',
      api: getCheckinApi(),
      methods: ['list6', 'addSave7', 'editSave6', 'remove8', 'getInfo15', 'export5'],
    },
    {
      name: '菜品管理',
      api: getDishApi(),
      methods: ['list4', 'addSave5', 'editSave4', 'remove6', 'getInfo13', 'export3'],
    },
    {
      name: '住宿管理',
      api: getStayApi(),
      methods: ['list9', 'addSave10', 'editSave9', 'remove12', 'getInfo19', 'export8'],
    },
    {
      name: '餐饮管理',
      api: getDiningApi(),
      methods: [
        'list5',
        'addSave6',
        'editSave5',
        'remove7',
        'getInfo14',
        'export4',
        'getDishesByDining',
      ],
    },
    {
      name: '跟拍管理',
      api: getPhotographyApi(),
      methods: ['list1', 'addSave2', 'editSave1', 'remove3', 'getInfo11', '_export'],
    },
    {
      name: '包车管理',
      api: getCarApi(),
      methods: ['list7', 'addSave8', 'editSave7', 'remove9', 'getInfo16', 'export6'],
    },
    {
      name: '线路管理',
      api: getRouteApi(),
      methods: ['list3', 'addSave4', 'editSave3', 'remove5', 'export2'],
    },
    {
      name: '游客管理',
      api: getTouristApi(),
      methods: ['list17', 'edit1', 'getInfo7', 'remove13'],
    },
  ];

  modules.forEach(({ name, api, methods }) => {
    describe(name, () => {
      it('has all required methods', () => {
        methods.forEach((method) => {
          expect((api as Record<string, unknown>)[method]).toBeDefined();
          expect(typeof (api as Record<string, unknown>)[method]).toBe('function');
        });
      });

      it('get() returns an object with all methods', () => {
        expect(typeof api).toBe('object');
        expect(Object.keys(api).length).toBe(methods.length);
      });
    });
  });
});
