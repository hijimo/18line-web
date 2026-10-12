/**
 * 达人收入对账页（menu 2260，`travel18:expertPayable:*`）测试。
 *
 * 覆盖三条口径红线（设计文档 §8.2~§8.5），错了都不是"显示不好看"而是"资金误读"：
 *   1. **安卓 / iOS 必须各自一张卡片**：iOS 的钱要自然月结束后 45~60 天才到平台账，
 *      安卓 T+3。合并成一个总数会让达人在 iOS 未到账时认为平台少结算。
 *   2. **作废/退款单列**，不能混进应付金额里。
 *   3. 🔴 **账期口径是 `payable.create_time`（记账时间），不是 `o.paid_time`**：后端
 *      `TravelExpertRewardMapper.xml` 的 `incomeWhere` 用 `AND p.create_time >= #{beginTime}`、
 *      `selectIncomeDetail` 用 `order by p.create_time desc`，为的是与结算批次
 *      `claimForBatch`/`sumPendingForBatch` 同口径（刻意偏离设计文档 §8.2 的 paid_time）。
 *      前端要跟上两件事：① 文案不能写「支付时间（账期）」，否则运营按支付时间去对
 *      批次金额必然对不上；② `buildIncomeQuery` 必须产出**顶层** beginTime/endTime
 *      （A7/A10 的 query 对象形态），而不是 A4 那种 RuoYi `params[beginTime]`——
 *      这条同时是导出接口的筛选条件载体，形状错了后端收到的就是全量。
 *      ⚠️ A4 达人鼓励订单页是**另一套口径**（`t.paid_time`，订单视角），不要一起改。
 * 另外固化角色 gate：`daren` 看不到导出（对账单是发给入驻商家的交付物）。
 */

import { fireEvent, screen, within } from '@testing-library/react';
import dayjs from 'dayjs';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { server } from '../../../../mocks/server';
import { useAuthStore } from '@/stores/authStore';
import { render } from '@/test-utils';
import ExpertIncomePage, { buildIncomeQuery } from '../index';

const page = (rows: unknown[], total = rows.length) =>
  HttpResponse.json({ code: 200, msg: 'success', rows, total });
const ok = (data?: unknown) => HttpResponse.json({ code: 200, msg: '操作成功', data });

/** 后端按 terminal_group 分组返回，安卓/iOS 各一行，**不做合计** */
const summary = [
  {
    terminalGroup: 'android',
    orderCount: 12,
    totalAmountFen: 120000,
    totalChannelFeeFen: 1200,
    totalCommissionFen: 6000,
    merchantPayableFen: 96000,
    voidedFen: 0,
  },
  {
    terminalGroup: 'ios',
    orderCount: 5,
    totalAmountFen: 50000,
    totalChannelFeeFen: 1500,
    totalCommissionFen: 2500,
    merchantPayableFen: 40000,
    voidedFen: 10000,
  },
];

const details = [
  {
    payableId: 1,
    payableNo: 'PAY202609300001',
    outTradeNo: 'OUT0001',
    orderNo: 'RO0001',
    routeId: 9,
    routeTitle: '松阳三日·古村与茶园',
    expertName: '达人甲',
    authorUserId: 77,
    merchantId: 3,
    merchantName: '某入驻商家',
    terminalGroup: 'ios',
    orderAmountFen: 10000,
    channelFeeFen: 300,
    commissionFen: 500,
    shareRate: 80,
    amountFen: 8000,
    payStatus: '3',
    batchNo: null,
    voidReason: '用户 7 日内退款，payable 作废',
    paidTime: '2026-09-30 23:59:00',
  },
];

const handlers = [
  http.get('*/travel18/expertIncome/summary', () => ok(summary)),
  http.get('*/travel18/expertIncome/detail', () => page(details)),
  http.get('*/travel18/expertPayable/list', () => page(details)),
  // BindableMerchantSelect / DarenUserSelect 的数据源
  http.get('*/travel18/merchant/list', () =>
    page([{ merchantId: 3, merchantName: '某入驻商家', auditStatus: '1', status: '0' }]),
  ),
  http.get('*/system/role/list', () =>
    page([{ roleId: 101, roleKey: 'daren', roleName: '达人' }]),
  ),
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

describe('buildIncomeQuery · 账期口径（A7/A10 顶层 beginTime/endTime）', () => {
  it('时间区间补 00:00:00 / 23:59:59，且是**顶层**字段而非 params[...]', () => {
    const query = buildIncomeQuery({
      accountRange: [dayjs('2026-09-01'), dayjs('2026-09-30')],
      merchantId: 3,
      authorUserId: 77,
      terminalGroup: 'ios',
      payStatus: '1',
    });

    expect(query).toEqual({
      merchantId: 3,
      authorUserId: 77,
      terminalGroup: 'ios',
      payStatus: '1',
      beginTime: '2026-09-01 00:00:00',
      endTime: '2026-09-30 23:59:59',
    });
    // 形状红线：A7/A10 绝不能被套成 A4 的 RuoYi 形态，否则后端 query 对象绑不上
    expect(Object.keys(query)).not.toContain('params[beginTime]');
    // 前端内部字段名不出网（否则后端 query 对象多一个绑不上的字段）
    expect(query).not.toHaveProperty('accountRange');
    expect(query).not.toHaveProperty('paidRange');
  });

  it('未选时间/未选下拉时产出 undefined（交给 cleanParams 剔除，不进 query string）', () => {
    const query = buildIncomeQuery({});
    expect(query.beginTime).toBeUndefined();
    expect(query.endTime).toBeUndefined();
    expect(query.terminalGroup).toBeUndefined();
    expect(query.payStatus).toBeUndefined();
    expect(query.merchantId).toBeUndefined();
  });

  it('只选一端时间时不臆造另一端', () => {
    const query = buildIncomeQuery({ accountRange: [dayjs('2026-09-01'), null as never] });
    expect(query.beginTime).toBe('2026-09-01 00:00:00');
    expect(query.endTime).toBeUndefined();
  });
});

/**
 * ⚠️ 两个 antd 渲染细节，直接决定了这里怎么写断言（踩过一次，记下来）：
 * 1. `Statistic` 把 "1200.00" 拆成 `-value-int`（"1,200"，**默认千分位**）和
 *    `-value-decimal`（".00"）两个子元素；testing-library 的默认 `getNodeText`
 *    只拼**直接文本子节点**，所以 `getByText('1200.00')` 找不到，必须按
 *    `.ant-statistic-content-value` 的 `textContent` 匹配。
 * 2. 明细表的「终端」列也会渲染同一个中文标签，`findByText('iOS（Apple 45~60 天）')`
 *    会命中多个元素；卡片必须按 `.ant-card-head-title` 定位。
 */
const cardByTitle = (title: string): HTMLElement => {
  const head = Array.from(document.querySelectorAll('.ant-card-head-title')).find(
    (n) => n.textContent === title,
  );
  if (!head) throw new Error(`没找到标题为「${title}」的卡片`);
  return head.closest('.ant-card') as HTMLElement;
};

const statValue = (card: HTMLElement, expected: string) =>
  within(card).getByText((_content, el) => {
    return (
      !!el &&
      el.classList?.contains('ant-statistic-content-value') &&
      el.textContent === expected
    );
  });

describe('达人收入 · 汇总卡片', () => {
  it('安卓与 iOS 各自一张卡片，不合并且标明到账周期', async () => {
    render(<ExpertIncomePage />);
    await screen.findByText('PAY202609300001'); // 等首屏数据落地

    const titles = Array.from(document.querySelectorAll('.ant-card-head-title')).map(
      (n) => n.textContent,
    );
    expect(titles).toContain('安卓系（T+3 到账）');
    expect(titles).toContain('iOS（Apple 45~60 天）');
    // 两个终端各一张，绝不合并成"合计"
    expect(titles.filter((t) => t === '安卓系（T+3 到账）')).toHaveLength(1);
    expect(titles.filter((t) => t === 'iOS（Apple 45~60 天）')).toHaveLength(1);
  });

  it('金额一律分→元，且各项分开列（打赏总额 / 达人侧应付 / 通道费 / 平台佣金）', async () => {
    render(<ExpertIncomePage />);
    await screen.findByText('PAY202609300001');
    const android = cardByTitle('安卓系（T+3 到账）');

    expect(statValue(android, '1,200.00')).toBeInTheDocument(); // 120000 分（antd 千分位）
    expect(statValue(android, '960.00')).toBeInTheDocument(); // 达人侧应付 96000 分
    expect(statValue(android, '12.00')).toBeInTheDocument(); // 通道费 1200 分
    expect(statValue(android, '60.00')).toBeInTheDocument(); // 平台佣金 6000 分
    expect(within(android).getByText('订单数 12')).toBeInTheDocument();
  });

  it('作废（退款）单列，且 iOS 卡片上显示 100.00 元、安卓卡片显示 0.00', async () => {
    render(<ExpertIncomePage />);
    await screen.findByText('PAY202609300001');
    const ios = cardByTitle('iOS（Apple 45~60 天）');
    const android = cardByTitle('安卓系（T+3 到账）');

    expect(within(ios).getByText('已作废（退款）')).toBeInTheDocument();
    expect(statValue(ios, '100.00')).toBeInTheDocument(); // voidedFen 10000
    expect(statValue(android, '0.00')).toBeInTheDocument(); // 安卓无作废
    // 作废金额**不能**被算进达人侧应付：iOS 应付是 400.00 而不是 500.00/410.00
    expect(statValue(ios, '400.00')).toBeInTheDocument();
  });

  it('明细表渲染：结算状态中文、分成率带 %、作废原因如实展示', async () => {
    render(<ExpertIncomePage />);
    expect(await screen.findByText('PAY202609300001')).toBeInTheDocument();
    expect(screen.getByText('已作废(退款)')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('用户 7 日内退款，payable 作废')).toBeInTheDocument();
    expect(screen.getByText('100.00 元')).toBeInTheDocument();
  });

  it('汇总为空时给出可自解释的提示（说明只统计达人单），不留白屏', async () => {
    server.use(http.get('*/travel18/expertIncome/summary', () => ok([])));
    render(<ExpertIncomePage />);

    expect(
      await screen.findByText(
        '当前筛选条件下没有达人鼓励收入（只统计 expert_route_id 非空的单，商家线路打赏不计入）',
      ),
    ).toBeInTheDocument();
  });
});

describe('达人收入 · 角色 gate', () => {
  it('admin（有 expertPayable:export）能看到「导出对账单」', async () => {
    setRole(['admin'], ['travel18:expertPayable:list', 'travel18:expertPayable:export']);
    render(<ExpertIncomePage />);
    expect(await screen.findByText('导出对账单')).toBeInTheDocument();
  });

  it('daren 看不到导出，且明确告知「达人视角 + 导出需管理员」', async () => {
    setRole(['daren'], [
      'travel18:expertPayable:list',
      'travel18:expertPayable:query',
      'travel18:expertPayable:export', // 后端误发也要挡住（fail-closed）
    ]);
    render(<ExpertIncomePage />);

    expect(
      await screen.findByText(/当前为达人视角：只统计归属于你的达人鼓励单/),
    ).toBeInTheDocument();
    expect(screen.queryByText('导出对账单')).not.toBeInTheDocument();
    // 达人视角下不该出现「按达人筛选」（传了后端也不信，摆着会让人以为能查别人）
    expect(screen.queryByText('达人', { selector: '.ant-form-item-label label' })).toBeNull();
  });
});

/**
 * 口径文案的回归网。
 * 这一组是**真实事故**换来的：本页曾经把账期写成 `paid_time`（label「支付时间（账期）」、
 * tooltip「账期口径按 paid_time，不是记账时间 create_time」），与后端 `incomeWhere` 的
 * `p.create_time` 正好相反。运营照前端文案去对结算批次金额必然对不上，而且没有任何报错。
 */
describe('达人收入 · 账期口径文案（create_time，不是 paid_time）', () => {
  it('筛选 label 是「记账时间（账期）」，且不再出现「支付时间（账期）」', async () => {
    render(<ExpertIncomePage />);
    await screen.findByText('PAY202609300001');

    expect(screen.getByText('记账时间（账期）')).toBeInTheDocument();
    expect(screen.queryByText('支付时间（账期）')).not.toBeInTheDocument();
  });

  it('tooltip 明说 payable.create_time + 与结算批次同口径 + paidTime 只用于解释差异', async () => {
    render(<ExpertIncomePage />);
    await screen.findByText('PAY202609300001');

    const icon = document.querySelector('.ant-form-item-tooltip') as HTMLElement;
    expect(icon).not.toBeNull();
    fireEvent.mouseEnter(icon);

    expect(
      await screen.findByText(
        '账期口径 = 应付记账时间 payable.create_time，与结算批次归集口径一致（不是订单支付时间 paid_time）。跨月支付的单会按记账月归属；表格同时展示 paidTime 便于解释差异。',
      ),
    ).toBeInTheDocument();
  });

  it('表格仍保留「支付时间」列（后端刻意 SELECT o.paid_time 让差异可见）', async () => {
    render(<ExpertIncomePage />);
    await screen.findByText('PAY202609300001');

    const head = document.querySelector('.ant-table-thead') as HTMLElement;
    expect(within(head).getByText('支付时间')).toBeInTheDocument();
    // 明细行的 paidTime 如实渲染，不与账期混淆
    expect(screen.getByText('2026-09-30 23:59:00')).toBeInTheDocument();
  });
});
