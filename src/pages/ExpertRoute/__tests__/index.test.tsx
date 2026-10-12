/**
 * 达人路线列表页测试。
 *
 * 重点不是「表格渲染出来了」，而是三条会直接造成越权/误读的不变量：
 *   1. 地区必须显示**名称**而不是 6 位编码（既有缺陷 B6 在新页面不许重犯）；
 *   2. 审核状态必须显示中文枚举，不能出现裸的 '0'/'2'；
 *   3. **daren 角色看不到「审核」「删除」**（前端 gate；后端 @PreAuthorize 是第二道）。
 * 另外固化一条刻意的设计：本页**没有导出按钮**（契约 A1 没有 export 接口，
 * 前端拼 CSV 会绕过 @AuthorDataScope，达人就能导出别人的路线）。
 */

import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { server } from '../../../../mocks/server';
import { useAuthStore } from '@/stores/authStore';
import { render } from '@/test-utils';
import ExpertRoutePage from '../index';

const page = (rows: unknown[], total = rows.length) =>
  HttpResponse.json({ code: 200, msg: 'success', rows, total });
const ok = (data?: unknown) => HttpResponse.json({ code: 200, msg: '操作成功', data });

const routes = [
  {
    routeId: 1,
    routeTitle: '松阳三日·古村与茶园',
    authorUserId: 77,
    authorNickname: '达人甲',
    province: '330000',
    city: '331100',
    district: '331124',
    dayCount: 3,
    attractionCount: 6,
    rewardEnabled: '1',
    recommendWeight: 5,
    auditStatus: '0',
    status: '0',
    createTime: '2026-10-12 10:00:00',
  },
  {
    routeId: 2,
    routeTitle: '被拒的路线',
    authorUserId: 78,
    authorNickname: '达人乙',
    province: '330000',
    city: '331100',
    district: null,
    dayCount: 1,
    attractionCount: 1,
    rewardEnabled: '0',
    recommendWeight: 0,
    auditStatus: '2',
    auditRemark: '景点太少，请补充',
    status: '1',
    createTime: '2026-10-11 09:00:00',
  },
];

const regionTree = [
  {
    regionCode: '330000',
    regionName: '浙江省',
    children: [
      {
        regionCode: '331100',
        regionName: '丽水市',
        children: [{ regionCode: '331124', regionName: '松阳县', children: [] }],
      },
    ],
  },
];

const handlers = [
  http.get('*/travel18/expertRoute/list', () => page(routes)),
  http.get('*/system/region/tree', () => ok(regionTree)),
  /**
   * ⚠️ 必须 stub：筛选区的 `RegionSelect` 挂载即拉省级列表。不 stub 时 MSW 放行 →
   * jsdom XHR 网络错误 → `utils/request.ts` 的 errorHandler 去调 `messageInstance.error`，
   * 而测试里 antd 静态实例没初始化 → `TypeError: Cannot read properties of undefined`，
   * 表现为一串 Unhandled Rejection（测试本身还是绿的，但会污染全量 suite 的 Errors 计数）。
   */
  http.get('*/system/region/province', () => ok([{ regionCode: '330000', regionName: '浙江省' }])),
  http.get('*/system/role/list', () => page([{ roleId: 101, roleKey: 'daren', roleName: '达人' }])),
  http.get('*/system/role/authUser/allocatedList', () =>
    page([{ userId: 77, userName: 'daren1', nickName: '达人甲' }]),
  ),
];

const setRole = (roles: string[], permissions: string[]) => {
  useAuthStore.setState({ user: { roles, permissions } as never });
};

beforeEach(() => {
  server.use(...handlers);
  setRole(['admin'], ['*:*:*']);
  localStorage.clear();
});

describe('达人路线列表 · 渲染语义', () => {
  it('渲染路线行，审核状态显示中文而不是裸码', async () => {
    render(<ExpertRoutePage />);
    expect(await screen.findByText('松阳三日·古村与茶园')).toBeInTheDocument();
    expect(screen.getByText('被拒的路线')).toBeInTheDocument();
    expect(screen.getByText('待审核')).toBeInTheDocument();
    expect(screen.getByText('已拒绝')).toBeInTheDocument();
    expect(screen.getByText('达人甲')).toBeInTheDocument();
  });

  it('地区显示名称而不是 6 位编码（防 B6 复发）', async () => {
    render(<ExpertRoutePage />);
    await screen.findByText('松阳三日·古村与茶园');
    expect(screen.getByText('浙江省 / 丽水市 / 松阳县')).toBeInTheDocument();
    // 编码本身不该出现在地区列（筛选控件里的下拉选项不算，这里查的是表格单元格）
    const table = document.querySelector('.ant-table-tbody') as HTMLElement;
    expect(within(table).queryByText('331124')).not.toBeInTheDocument();
  });

  it('鼓励开关/上架状态翻译成中文', async () => {
    render(<ExpertRoutePage />);
    await screen.findByText('松阳三日·古村与茶园');
    expect(screen.getByText('已开放')).toBeInTheDocument();
    expect(screen.getByText('未开放')).toBeInTheDocument();
    expect(screen.getByText('上架')).toBeInTheDocument();
    expect(screen.getByText('下架')).toBeInTheDocument();
  });

  it('本页刻意不提供导出按钮（契约 A1 无 export 接口）', async () => {
    render(<ExpertRoutePage />);
    await screen.findByText('松阳三日·古村与茶园');
    expect(screen.queryByText(/导出/)).not.toBeInTheDocument();
  });
});

describe('达人路线列表 · 角色 gate', () => {
  it('admin：编辑 / 审核 / 删除 三个操作都在', async () => {
    render(<ExpertRoutePage />);
    const firstRow = (await screen.findByText('松阳三日·古村与茶园')).closest('tr') as HTMLElement;
    expect(within(firstRow).getByText('编辑')).toBeInTheDocument();
    expect(within(firstRow).getByText('审核')).toBeInTheDocument();
    expect(within(firstRow).getByText('删除')).toBeInTheDocument();
  });

  it('daren：看不到「审核」，也没有 :remove 权限时看不到「删除」，但能编辑自己的路线', async () => {
    setRole(
      ['daren'],
      ['travel18:expertRoute:list', 'travel18:expertRoute:query', 'travel18:expertRoute:edit'],
    );
    render(<ExpertRoutePage />);
    const firstRow = (await screen.findByText('松阳三日·古村与茶园')).closest('tr') as HTMLElement;
    expect(within(firstRow).getByText('编辑')).toBeInTheDocument();
    // 达人不能审自己的路线：既无权限串，isDaren 判定也会兜住
    expect(within(firstRow).queryByText('审核')).not.toBeInTheDocument();
    expect(within(firstRow).queryByText('删除')).not.toBeInTheDocument();
  });

  it('daren 即使 permissions 未回来（空数组）也看不到审核 —— fail-closed 那一层生效', async () => {
    setRole(['daren'], []);
    render(<ExpertRoutePage />);
    const firstRow = (await screen.findByText('松阳三日·古村与茶园')).closest('tr') as HTMLElement;
    expect(within(firstRow).queryByText('审核')).not.toBeInTheDocument();
  });
});
