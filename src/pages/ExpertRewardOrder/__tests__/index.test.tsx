/**
 * 达人鼓励订单页（F3，menu 2250）测试。
 *
 * ## 本页唯一真正危险的点：**达人单的 `line_id` 恒为 NULL**
 * 既有 `pages/RewardOrder` 的所有渲染都建立在「lineId 必存在」的假设上；本页反过来，
 * 锚点是 `expert_route_id`。所以测试的重点不是"表格渲染出来了"，而是：
 *   1. 一整行字段全为 null 时**不崩**、不出现 `undefined`/`NaN`/`Invalid Date`/`0`；
 *   2. 若后端 `expert_route_id IS NOT NULL` 过滤失效混进非达人单，页面必须**显式报
 *      「数据异常：非达人单」并把来源标成「商家线路」**，而不是假装它是达人单
 *      （静默错账比报错难查得多，这是资金页）；
 *   3. 金额必须带「元」单位（后端存的是**分**，漏了单位就是 100 倍误读）；
 *   4. `daren` 看不到导出按钮（`travel18:expertRewardOrder:export` 不授予 daren）；
 *   5. **退款入口必须在本页存在**：旧「打赏订单」页 SQL 硬过滤 `expert_route_id IS NULL`，
 *      永远查不到达人单，若本页没有退款入口，达人单就成了「能收钱、后台无处可退」的死单。
 *      所以这里同时验证「入口在」「daren 看不到」「共用弹窗拿到的是正确的 outTradeNo」。
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test-utils';
import { message, Modal } from 'antd';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { IOS_REFUND_DOC_URL } from '@/components/RewardRefundModal/iosRefundGuide';
import { useAuthStore } from '@/stores/authStore';
import { server } from '../../../../mocks/server';
import ExpertRewardOrderPage from '../index';

const page = (rows: unknown[], total = rows.length) =>
  HttpResponse.json({ code: 200, msg: 'success', rows, total });
const ok = (data?: unknown) => HttpResponse.json({ code: 200, msg: '操作成功', data });

/** 正常的达人单：line_id 为 NULL 是**预期**状态，不是脏数据 */
const normalOrder = {
  orderId: 1,
  outTradeNo: 'OUT2026101200001',
  orderNo: 'RO2026101200001',
  expertRouteId: 9,
  expertRouteTitle: '松阳三日·古村与茶园',
  authorUserId: 77,
  authorNickname: '达人甲',
  merchantId: 3,
  merchantName: '某入驻商家',
  tierId: 5,
  tierName: '10 元档',
  actualPriceFen: 1000,
  orderStatus: '2',
  paidTime: '2026-09-30 23:59:00',
  platform: 'android',
  env: 'prod',
  lineId: null,
};

/** 极端脏行：所有可空字段全空，且 expertRouteId 为 null（= 非达人单混进来了） */
const brokenOrder = {
  orderId: 2,
  outTradeNo: null,
  orderNo: null,
  expertRouteId: null,
  expertRouteTitle: null,
  authorUserId: null,
  authorNickname: null,
  merchantId: null,
  merchantName: null,
  tierId: null,
  tierName: null,
  actualPriceFen: null,
  orderStatus: null,
  paidTime: null,
  platform: null,
  env: null,
  lineId: null,
};

/** 退款失败(6)：官方允许同退款单号同参重试，所以也要开放退款入口 */
const refundFailedOrder = {
  ...normalOrder,
  orderId: 3,
  outTradeNo: 'OUT2026101200003',
  orderStatus: '6',
};
/** 退款中(4)：只有排障入口「查退款结果」，没有退款入口 */
const refundingOrder = {
  ...normalOrder,
  orderId: 4,
  outTradeNo: 'OUT2026101200004',
  orderStatus: '4',
};
/** 状态可退但 outTradeNo 为空：退款的唯一定位键缺失，必须拦住而不是发一个必然失败的请求 */
const noOutTradeNoOrder = { ...normalOrder, orderId: 5, outTradeNo: null, orderStatus: '2' };
/**
 * 已支付待发货(1)：钱已收、记账未完成（markPaid 与 markProvided 之间的早退路径会停在这里）。
 * 🔴 这一行是「能收钱、无处可退」死单的定点回归：达人单在旧「打赏订单」页因 SQL 硬编码
 *    `expert_route_id IS NULL` 永远查不到，所以本页必须放开 '1'，否则两个后台页面都没有退款按钮。
 */
const paidNotProvidedOrder = {
  ...normalOrder,
  orderId: 6,
  outTradeNo: 'OUT2026101200006',
  orderStatus: '1',
};

const rows = [
  normalOrder,
  brokenOrder,
  refundFailedOrder,
  refundingOrder,
  noOutTradeNoOrder,
  paidNotProvidedOrder,
];

/** 列表请求计数：验证退款受理成功后确实触发了 reload（而不是只弹了个 toast） */
let listCallCount = 0;
let refundApplyCount = 0;
let lastPreviewOutTradeNo: string | null = null;
let lastPollOutTradeNo: string | null = null;

const refundablePreview = {
  orderId: 1,
  orderNo: 'RO2026101200001',
  outTradeNo: 'OUT2026101200001',
  orderStatus: '2',
  orderStatusText: '已发货',
  refundable: true,
  actualPriceFen: 1000,
  // left_fee 是微信侧可退余额，与本地实付可能不同，弹窗默认预填的是它
  leftFeeFen: 800,
  maxRefundFen: 800,
  querySucceeded: true,
  overWindow: false,
  daysSincePaid: 12,
  paidTime: '2026-09-30 23:59:00',
  platform: 'android',
  env: '0',
};

const handlers = [
  http.get('*/travel18/expertRewardOrder/list', () => {
    listCallCount += 1;
    return page(rows);
  }),
  http.get('*/travel18/reward/refund/preview', ({ request }) => {
    lastPreviewOutTradeNo = new URL(request.url).searchParams.get('outTradeNo');
    return ok(refundablePreview);
  }),
  http.post('*/travel18/reward/refund', () => {
    refundApplyCount += 1;
    return ok({ success: true, needPoll: false });
  }),
  // ⚠️ pollOne 的 outTradeNo 走 **query**（生成代码里是 `params` 不是 `data`），
  //    用 request.json() 会抛异常导致 msw 直接 500，测试会以「超时」的形式假失败
  http.post('*/travel18/reward/refund/poll/one', ({ request }) => {
    lastPollOutTradeNo = new URL(request.url).searchParams.get('outTradeNo');
    return ok({ terminal: true, orderStatus: '5' });
  }),
  // ⚠️ 必须按 orderId 返回对应行：页面 openDetail 会先用列表行占位、再用详情接口结果覆盖，
  //    若这里恒返回脏行，抽屉里的 orderStatus 会被覆盖成 null，所有「按状态分支的文案」都测不到
  http.get('*/travel18/expertRewardOrder/:orderId', ({ params }) =>
    ok(rows.find((o) => o.orderId === Number(params.orderId))),
  ),
  // DarenUserSelect（达人筛选控件）会拉这两个
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
  listCallCount = 0;
  refundApplyCount = 0;
  lastPreviewOutTradeNo = null;
  lastPollOutTradeNo = null;
  // Modal.info 是静态方法，DOM 挂在 body 下的独立容器里，不受 RTL cleanup 管理；
  // Modal.destroyAll() 又要等 rc-motion 的动画结束事件才摘节点，而 jsdom 不派发，
  // 残留会让下一个用例的 findByText 命中旧弹窗（标题命中 2 个、closest('tr') 拿到 null）。
  // 放在 beforeEach：此时上个用例的 React 树已被 RTL 卸载，残留必是静态弹窗，摘掉是安全的。
  document.querySelectorAll('.ant-modal-root').forEach((n) => n.remove());
});

afterEach(() => {
  // antd 的 message / Modal 挂在 body 上，不受 RTL cleanup 管理，不清会串到下一个用例
  message.destroy();
  Modal.destroyAll();
});

const tableBody = () => document.querySelector('.ant-table-tbody') as HTMLElement;

describe('达人鼓励订单 · 空值防御（line_id 恒为 NULL）', () => {
  it('正常达人单：金额带「元」、状态中文、来源「达人路线」', async () => {
    render(<ExpertRewardOrderPage />);
    const row = (await screen.findByText('OUT2026101200001')).closest('tr') as HTMLElement;

    expect(within(row).getByText('松阳三日·古村与茶园')).toBeInTheDocument();
    expect(within(row).getByText('达人甲')).toBeInTheDocument();
    expect(within(row).getByText('某入驻商家')).toBeInTheDocument();
    // 1000 分 → 10.00 元；单位缺失就是 100 倍误读
    expect(within(row).getByText('10.00 元')).toBeInTheDocument();
    expect(within(row).getByText('已发货')).toBeInTheDocument();
    expect(within(row).getByText('2026-09-30 23:59:00')).toBeInTheDocument();
    expect(within(row).getByText('达人路线')).toBeInTheDocument();
    expect(within(row).getByText('安卓')).toBeInTheDocument();
  });

  it('脏行不崩：expertRouteId 为 null 时显式标「数据异常：非达人单」+ 来源「商家线路」', async () => {
    render(<ExpertRewardOrderPage />);
    await screen.findByText('OUT2026101200001');

    expect(screen.getByText('数据异常：非达人单')).toBeInTheDocument();
    expect(screen.getByText('商家线路')).toBeInTheDocument();
  });

  it('全空字段一律渲染「--」，不出现 undefined / NaN / Invalid Date / 裸 0', async () => {
    render(<ExpertRewardOrderPage />);
    await screen.findByText('OUT2026101200001');
    const body = tableBody();
    const brokenRow = within(body).getAllByRole('row')[1] as HTMLElement;

    // 该行 9 个可空列（业务单号/达人/商家/档位/金额/状态/支付时间/终端/环境）都必须是 '--'
    expect(within(brokenRow).getAllByText('--').length).toBeGreaterThanOrEqual(8);
    expect(within(brokenRow).queryByText(/undefined/)).not.toBeInTheDocument();
    expect(within(brokenRow).queryByText(/NaN/)).not.toBeInTheDocument();
    expect(within(brokenRow).queryByText(/Invalid Date/i)).not.toBeInTheDocument();
    // lineId=null 不能退化成 0：金额列尤其危险（0 元会被当成免费单）
    expect(within(brokenRow).queryByText('0.00 元')).not.toBeInTheDocument();
  });

  it('详情抽屉：lineId 为 null 时「商家线路ID」显示「--」', async () => {
    render(<ExpertRewardOrderPage />);
    await screen.findByText('OUT2026101200001');

    const brokenRow = within(tableBody()).getAllByRole('row')[1] as HTMLElement;
    (within(brokenRow).getByText('详情') as HTMLElement).click();

    expect(await screen.findByText('达人鼓励订单详情')).toBeInTheDocument();
    const drawer = document.querySelector('.ant-drawer-body') as HTMLElement;
    expect(within(drawer).getByText('商家线路ID')).toBeInTheDocument();
    // 抽屉里达人路线 / 商家线路ID 都必须是 '--'，不能是 0 或空白
    expect(within(drawer).getAllByText('--').length).toBeGreaterThanOrEqual(2);
  });
});

describe('达人鼓励订单 · 角色 gate', () => {
  it('admin（有 :export）能看到「导出当前筛选」', async () => {
    setRole(['admin'], ['travel18:expertRewardOrder:list', 'travel18:expertRewardOrder:export']);
    render(<ExpertRewardOrderPage />);
    await screen.findByText('OUT2026101200001');
    expect(screen.getByText('导出当前筛选')).toBeInTheDocument();
  });

  it('daren 即使后端误发 :export 权限串也看不到导出按钮（fail-closed）', async () => {
    setRole(
      ['daren'],
      [
        'travel18:expertRewardOrder:list',
        'travel18:expertRewardOrder:query',
        'travel18:expertRewardOrder:export',
      ],
    );
    render(<ExpertRewardOrderPage />);
    await screen.findByText('OUT2026101200001');
    expect(screen.queryByText('导出当前筛选')).not.toBeInTheDocument();
  });

  it('daren 没有 :export 时同样看不到导出按钮', async () => {
    setRole(['daren'], ['travel18:expertRewardOrder:list']);
    render(<ExpertRewardOrderPage />);
    await screen.findByText('OUT2026101200001');
    expect(screen.queryByText('导出当前筛选')).not.toBeInTheDocument();
  });
});

describe('达人鼓励订单 · 退款入口（本页必须有，旧页查不到达人单）', () => {
  /** 按 outTradeNo 找到对应行（outTradeNo 为空的那行用 orderId 兜底定位） */
  const rowOf = async (outTradeNo: string) => {
    await screen.findByText('OUT2026101200001');
    return (await screen.findByText(outTradeNo)).closest('tr') as HTMLElement;
  };

  it('已支付(1)/已发货(2)/退款失败(6) 有「退款」，退款中(4) 只有「查退款结果」', async () => {
    render(<ExpertRewardOrderPage />);

    // 6 行里 4 行是「可退状态」：已支付待发货(1) + 已发货(2) × 2（含一行缺 outTradeNo 的脏行）+ 退款失败(6)。
    // ⚠️ 状态闸门用的是达人单专用的 EXPERT_REFUNDABLE_ORDER_STATUS，**刻意与旧「打赏订单」页不同**：
    //    比旧页那份多放开 PAID('1')。理由见 enums/reward.ts 的注释与下面那条定点用例。
    await waitFor(() => expect(screen.getAllByText('退款')).toHaveLength(4));
    expect(screen.getAllByText('查退款结果')).toHaveLength(1);

    const refunding = await rowOf('OUT2026101200004');
    expect(within(refunding).queryByText('退款')).not.toBeInTheDocument();
    expect(within(refunding).getByText('查退款结果')).toBeInTheDocument();
  });

  it('已支付待发货(1) 的达人单必须有退款入口（否则两个后台页都退不了 = 死单）', async () => {
    render(<ExpertRewardOrderPage />);

    const row = await rowOf('OUT2026101200006');
    // 这条断言锁的是「前端不得比后端更严」：后端预览/发起闸门都放行 PAID('1')
    expect(within(row).getByText('退款')).toBeInTheDocument();
    // 且不能顺带把不可退状态也放开
    const refunding = await rowOf('OUT2026101200004');
    expect(within(refunding).queryByText('退款')).not.toBeInTheDocument();
  });

  it('详情抽屉：已支付待发货(1) 给「可退款」指引，而不是「当前订单状态不可退款」', async () => {
    const user = userEvent.setup();
    render(<ExpertRewardOrderPage />);

    const row = await rowOf('OUT2026101200006');
    await user.click(within(row).getByText('详情'));

    const drawer = await screen.findByRole('dialog');
    await waitFor(() => expect(drawer.textContent).toContain('退款请在左侧列表的行操作里发起'));
    expect(drawer.textContent).not.toContain('当前订单状态不可退款');
  });

  it('点「退款」→ 共用弹窗拿到本页这一行的 outTradeNo，标题标明来源「达人鼓励」', async () => {
    const user = userEvent.setup();
    render(<ExpertRewardOrderPage />);
    const row = await rowOf('OUT2026101200001');
    await user.click(within(row).getByText('退款'));

    // 标题必须带来源标识：运营在两个页面之间切换时，靠它判断这笔单是谁的
    expect(await screen.findByText('发起退款 · 达人鼓励 · OUT2026101200001')).toBeInTheDocument();
    // 预览请求必须按 outTradeNo 定位（退款接口的唯一定位键）
    expect(lastPreviewOutTradeNo).toBe('OUT2026101200001');
    // 达人单没有 lineId：弹窗里不能出现「线路 null」这种把达人单伪装成线路单的文案
    expect(screen.queryByText(/null/)).not.toBeInTheDocument();
    // 金额闸门取微信侧 left_fee(800 分 = 8.00 元)，不是本地实付(1000 分 = 10.00 元)。
    // 两者刻意造成不等，这样「用本地金额猜」的回归会立刻红。
    expect(await screen.findByText(/最多可退 8\.00 元/)).toBeInTheDocument();
    expect(screen.queryByText(/最多可退 10\.00 元/)).not.toBeInTheDocument();
  });

  it('退款受理成功后 reload 列表（不是只弹 toast）', async () => {
    const user = userEvent.setup();
    render(<ExpertRewardOrderPage />);
    const row = await rowOf('OUT2026101200001');
    await user.click(within(row).getByText('退款'));
    await screen.findByText('发起退款 · 达人鼓励 · OUT2026101200001');
    await screen.findByText('微信侧可退余额');

    const before = listCallCount;
    // 可退时弹窗会预填金额与原因，确认退款按钮应为可点
    const submit = await screen.findByRole('button', { name: /确认退款/ });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    // 一次点击只能出网一次：重复发起 = 重复退款
    expect(await screen.findByText('退款已完成')).toBeInTheDocument();
    await waitFor(() => expect(refundApplyCount).toBe(1));
    await waitFor(() => expect(listCallCount).toBeGreaterThan(before));
  });

  it('outTradeNo 为空时点退款：拦住并提示，不出网', async () => {
    const user = userEvent.setup();
    render(<ExpertRewardOrderPage />);
    await screen.findByText('OUT2026101200001');
    const bodyRows = within(tableBody()).getAllByRole('row');
    // 第 5 行（index 4）= 状态可退但 outTradeNo 为 null 的脏行
    const dirty = bodyRows[4] as HTMLElement;
    // 行定位哨兵：outTradeNo 是【第一列】（index.tsx:233），null 必须渲染成 '--'。
    // 原来写的是 queryAllByText('--').length >= 1 ——「行内任意位置有一个 --」太松，
    // 任何一个可空列渲染成 '--' 都能让它通过，等于没锁定「我选中的确实是脏行」。
    // 改成列级精确断言：定位错行 / 空值渲染回退成空白或 null，都会立刻红。
    // 列索引从表头动态取，不硬编码数字 —— 第 0 列是序号列（key），硬写 [1] 会在
    // 有人增删列时静默指到别的列上，那又变回「松断言」。
    const headerCells = Array.from(document.querySelectorAll('.ant-table-thead th'));
    const outTradeNoCol = headerCells.findIndex((th) => th.textContent?.includes('业务订单号'));
    expect(outTradeNoCol).toBeGreaterThan(-1);
    const dirtyCells = dirty.querySelectorAll('td');
    expect(dirtyCells[outTradeNoCol]?.textContent?.trim()).toBe('--');
    await user.click(within(dirty).getByText('退款'));

    expect(await screen.findByText('该记录缺少业务订单号，无法发起退款')).toBeInTheDocument();
    expect(refundApplyCount).toBe(0);
    expect(lastPreviewOutTradeNo).toBeNull();
    // ⚠️ 必须锚定弹窗标题的完整前缀：上面那句 message.error 的文案里也含「发起退款」四个字，
    //    用宽松的 /发起退款/ 会被 toast 命中而假绿（弹窗其实没开 = 断言失去意义）
    expect(screen.queryAllByText(/^发起退款 ·/)).toHaveLength(0);
    expect(document.querySelector('.ant-modal-title')).toBeNull();
  });

  it('「查退款结果」按 outTradeNo 打 poll/one', async () => {
    const user = userEvent.setup();
    render(<ExpertRewardOrderPage />);
    const row = await rowOf('OUT2026101200004');
    await user.click(within(row).getByText('查退款结果'));
    // Popconfirm 需要二次确认，漏点就不会出网
    await user.click(await screen.findByRole('button', { name: /确\s*定/ }));

    await waitFor(() => expect(lastPollOutTradeNo).toBe('OUT2026101200004'));
  });

  it('详情抽屉不再把运营指向查不到达人单的「打赏订单」页（死链已修）', async () => {
    const user = userEvent.setup();
    render(<ExpertRewardOrderPage />);
    const row = await rowOf('OUT2026101200001');
    await user.click(within(row).getByText('详情'));

    const drawer = (await screen.findByText('达人鼓励订单详情')).closest(
      '.ant-drawer',
    ) as HTMLElement;
    await waitFor(() =>
      expect(within(drawer).getByText(/退款请在左侧列表的行操作里发起/)).toBeInTheDocument(),
    );
    expect(within(drawer).queryByText(/退款请到「打赏订单」页操作/)).not.toBeInTheDocument();
  });
});

describe('达人鼓励订单 · 退款入口的角色 gate', () => {
  const ADMIN_REFUND_PERMS = ['travel18:expertRewardOrder:list', 'travel18:reward:refund'];

  it('admin 有 travel18:reward:refund 时看得到退款入口', async () => {
    setRole(['admin'], ADMIN_REFUND_PERMS);
    render(<ExpertRewardOrderPage />);
    await screen.findByText('OUT2026101200001');
    // 4 个可退状态行：已支付待发货(1) + 已发货(2)×2（含缺 outTradeNo 的脏行）+ 退款失败(6)
    await waitFor(() => expect(screen.getAllByText('退款')).toHaveLength(4));
    // 再定点确认这一行（角色 gate 的本意），不依赖上面那个计数
    const row = (await screen.findByText('OUT2026101200001')).closest('tr') as HTMLElement;
    expect(within(row).getByText('退款')).toBeInTheDocument();
  });

  it('admin 没有 refund 权限串时看不到退款入口（不能只靠角色猜）', async () => {
    setRole(['admin'], ['travel18:expertRewardOrder:list']);
    render(<ExpertRewardOrderPage />);
    await screen.findByText('OUT2026101200001');
    expect(screen.queryByText('退款')).not.toBeInTheDocument();
    expect(screen.queryByText('查退款结果')).not.toBeInTheDocument();
  });

  it('daren 即使后端误发 refund 权限串也看不到退款入口（fail-closed）', async () => {
    setRole(
      ['daren'],
      [
        'travel18:expertRewardOrder:list',
        'travel18:expertRewardOrder:query',
        'travel18:reward:refund',
      ],
    );
    render(<ExpertRewardOrderPage />);
    await screen.findByText('OUT2026101200001');
    expect(screen.queryByText('退款')).not.toBeInTheDocument();
    expect(screen.queryByText('查退款结果')).not.toBeInTheDocument();
  });

  it('daren 视角：详情抽屉给出「无退款权限」提示，而不是把按钮藏了就不解释', async () => {
    const user = userEvent.setup();
    setRole(['daren'], ['travel18:expertRewardOrder:list']);
    render(<ExpertRewardOrderPage />);
    const row = (await screen.findByText('OUT2026101200001')).closest('tr') as HTMLElement;
    await user.click(within(row).getByText('详情'));

    const drawer = (await screen.findByText('达人鼓励订单详情')).closest(
      '.ant-drawer',
    ) as HTMLElement;
    await waitFor(() => expect(within(drawer).getByText(/当前账号无退款权限/)).toBeInTheDocument());
  });
});

// ==================================================================
// iOS（Apple 支付）单：点「退款」只给引导
// ==================================================================

/**
 * 达人单同样会有 iOS 单 —— 打赏终端由下单时的微信客户端决定，与「线路打赏 / 达人鼓励」
 * 这个来源维度无关。所以两个页面都要有这道拦截，缺一个就留一个「点了必然失败」的入口，
 * 而达人单在旧「打赏订单」页根本查不到（SQL 硬过滤 expert_route_id IS NULL），
 * 漏在这里就等于完全没拦。
 *
 * 判定与文案都取自共用模块 `RewardRefundModal/iosRefundGuide`，
 * 与「打赏订单」页共用同一份，不允许各写一遍（写两遍必漂移）。
 */
describe('达人鼓励订单 · iOS 单点退款只给引导（与打赏订单页共用同一份文案）', () => {
  const iosExpertOrder = {
    ...normalOrder,
    orderId: 7,
    outTradeNo: 'OUT2026101900IOS07',
    orderStatus: '2',
    platform: 'ios',
    env: '0',
  };

  beforeEach(() => {
    server.use(http.get('*/travel18/expertRewardOrder/list', () => page([iosExpertOrder])));
  });

  it('点「退款」→ 只弹引导，不进退款弹窗、不出网', async () => {
    const user = userEvent.setup();
    render(<ExpertRewardOrderPage />);
    const row = (await screen.findByText('OUT2026101900IOS07')).closest('tr') as HTMLElement;
    await user.click(within(row).getByText('退款'));

    // antd 5.29 的 Modal.info 会把标题同时渲染进 `.ant-modal-title` 与
    // `.ant-modal-confirm-title`（同一层弹窗），用 selector 锁定后再回溯容器。
    const title = await screen.findByText('iOS 订单不能在后台退款', {
      selector: '.ant-modal-confirm-title',
    });
    const modal = title.closest('.ant-modal') as HTMLElement;
    expect(within(modal).getByText(/报告问题/)).toBeInTheDocument();
    expect(within(modal).getByRole('link', { name: /虚拟支付：企业、个体户/ })).toHaveAttribute(
      'href',
      IOS_REFUND_DOC_URL,
    );
    // 引导弹窗不是退款弹窗：没有标题前缀、没有预览请求、没有退款请求
    expect(screen.queryByText(/^发起退款 ·/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /确认退款/ })).not.toBeInTheDocument();
    expect(lastPreviewOutTradeNo).toBeNull();
    expect(refundApplyCount).toBe(0);
  });
});

// ==================================================================
// iOS 退款问询字段 + 「已退金额」口径（2026-10-20《iOS 退款问询应答策略可配置方案》P2）
// ==================================================================

/**
 * iOS 达人单：终端由下单时的微信客户端决定，与「线路打赏 / 达人鼓励」这个来源维度无关，
 * 所以达人单同样会被 Apple 退款问询命中，本页必须能看到问询结果。
 * 形态取自现网 orderId 33：退款未成功，但 `refund_fee_fen` 因抢占而残留 500。
 */
const iosExpertOrder = (over: Record<string, unknown> = {}) => ({
  ...normalOrder,
  orderId: 33,
  outTradeNo: 'R261019221457FDXM9B',
  orderNo: 'RO2026101933',
  platform: 'ios',
  env: '0',
  actualPriceFen: 800,
  orderStatus: '2',
  refundFeeFen: 500,
  ...over,
});

const useIosExpertOrder = (over: Record<string, unknown> = {}) => {
  const row = iosExpertOrder(over);
  server.use(
    http.get('*/travel18/expertRewardOrder/list', () => page([row])),
    http.get('*/travel18/expertRewardOrder/:orderId', () => ok(row)),
  );
  return row;
};

/**
 * 取抽屉里某个 Descriptions 条目的**内容单元格**。
 * antd5 的 bordered Descriptions 把标签放在 `th.ant-descriptions-item-label`、
 * 值放在同排的 `td.ant-descriptions-item-content`，两者不是父子关系，
 * 所以不能 `closest('.ant-descriptions-item')`（拿到 null）。本抽屉 column={1}，一排只有一对。
 */
const descContent = (drawer: HTMLElement, label: string) => {
  const row = within(drawer).getByText(label).closest('tr') as HTMLElement;
  return row.querySelector('.ant-descriptions-item-content') as HTMLElement;
};

const openDetail = async (user: ReturnType<typeof userEvent.setup>) => {
  await screen.findByText('R261019221457FDXM9B');
  await user.click(screen.getAllByText('详情')[0]);
  await screen.findByText('达人鼓励订单详情');
  return document.querySelector('.ant-drawer-body') as HTMLElement;
};

describe('达人鼓励订单 · 「已退金额」只认终态已退款(5)', () => {
  it('退款未成功时抽屉显示 --，不得把残留的 refundFeeFen 读成已退款', async () => {
    useIosExpertOrder();
    const user = userEvent.setup();
    render(<ExpertRewardOrderPage />);
    const drawer = await openDetail(user);

    const item = descContent(drawer, '已退金额');
    expect(within(item).getByText('--')).toBeInTheDocument();
    expect(within(item).queryByText('5.00 元')).toBeNull();
  });

  it('状态为已退款(5)时照常显示金额（不能把真退款也显示成 --）', async () => {
    useIosExpertOrder({ orderStatus: '5' });
    const user = userEvent.setup();
    render(<ExpertRewardOrderPage />);
    const drawer = await openDetail(user);

    const item = descContent(drawer, '已退金额');
    expect(within(item).getByText('5.00 元')).toBeInTheDocument();
  });
});

describe('达人鼓励订单 · iOS 退款问询（后端刻意不下发凭据与用户理由）', () => {
  it('问询次数与应答结果可见，裸值 1 翻译成「拒绝退款」', async () => {
    useIosExpertOrder({ iosRefundQueryCount: 2, iosRefundResult: '1' });
    const user = userEvent.setup();
    render(<ExpertRewardOrderPage />);
    const drawer = await openDetail(user);

    expect(within(drawer).getByText('iOS 问询次数')).toBeInTheDocument();
    expect(within(drawer).getByText('iOS 问询应答')).toBeInTheDocument();
    expect(within(drawer).getByText('拒绝退款')).toBeInTheDocument();
  });

  it('从未被问询（null）时显示 --，不得显示成「同意退款」', async () => {
    useIosExpertOrder({ iosRefundQueryCount: 0, iosRefundResult: null });
    const user = userEvent.setup();
    render(<ExpertRewardOrderPage />);
    const drawer = await openDetail(user);

    await within(drawer).findByText('iOS 问询应答');
    expect(within(drawer).queryByText('同意退款')).toBeNull();
    expect(within(drawer).queryByText('拒绝退款')).toBeNull();
  });

  it('本页不出现应答凭据（VO 裁剪红线：daren 角色可见，凭据只在「打赏订单」页给 admin）', async () => {
    useIosExpertOrder({
      iosRefundQueryCount: 2,
      iosRefundResult: '1',
      // 后端不会下发这两个字段；即使被误下发，页面也不该渲染出来
      iosRefundEvidence: '用户已完成对线路作者的自愿打赏，虚拟服务已即时履约完毕，无退款依据',
      iosRefundReason: '误购',
    });
    const user = userEvent.setup();
    render(<ExpertRewardOrderPage />);
    const drawer = await openDetail(user);

    await within(drawer).findByText('iOS 问询应答');
    expect(within(drawer).queryByText(/应答凭据/)).toBeNull();
    expect(within(drawer).queryByText(/无退款依据/)).toBeNull();
    expect(within(drawer).queryByText('误购')).toBeNull();
  });
});
