/**
 * 账单下载页测试。
 *
 * 这个页面的每一条红线都对应一种**财务会因此对错账**的失误，所以测的不是「渲染出来了」：
 *   - **真实下载地址只能从 `/bill/url/{taskPk}` 现取**。列表/详情里的 downloadUrl 是后端掩码
 *     出来的占位文案；就算哪天后端漏掩了，页面也不能把它渲染成链接——因为日账单地址只有
 *     28 分钟寿命，从渲染到点击之间就可能已过期，点开是失败页，会被误判成「账单文件损坏」。
 *   - **「生成中」不是失败**。日账单首次获取几乎必然「生成中」（微信 268490011），订单明细
 *     start 只是受理。标红会让财务反复重试，进而撞上与查单/退款共用的频率配额（268490015）。
 *   - **支付渠道刻意没有默认值**。安卓由微信结算（T+3）、iOS 由 Apple 结算（45~60 天），
 *     默认取一个＝让财务在不知情时拉错口径。
 *   - **订单明细跨度上限 31 天**，前端先拦一道并算好该拆几段，省掉一次注定失败的出网。
 *   - **iOS 月结一次发起会按月展开成多行**，详情必须把同批全部月份列出来，
 *     否则财务只看到其中一个月，会误以为其它月份没取到。
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test-utils';
import { App as AntdApp, message } from 'antd';
import dayjs from 'dayjs';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { AntdStaticProvider } from '@/components/AntdStaticProvider';
// 复用 setupTests 里已 listen 的全局 server，不要再 setupServer（会双重监听）
import { server } from '../../../../mocks/server';
import RewardBill from '../index';

const ok = (data?: unknown, msg = '操作成功') => HttpResponse.json({ code: 200, msg, data });
const bizError = (code: number, msg: string) => HttpResponse.json({ code, msg });
const page = (rows: unknown[], total = rows.length) =>
  HttpResponse.json({ code: 200, msg: 'success', rows, total });

const MASKED = '<下载地址已隐藏，请点「下载」按钮获取（获取时会校验是否已过期）>';
/** 假装后端漏掩了：页面即便拿到真地址也不能把它变成可点链接 */
const LEAKED_URL = 'https://api.mch.weixin.qq.com/xpay/bill?token=LEAKED_TOKEN_ABC';
/** 专用出口现取到的地址，与记录里的任何字段都不同 */
const FRESH_URL = 'https://api.mch.weixin.qq.com/xpay/bill?token=FRESH_TOKEN_XYZ';

const inMinutes = (n: number) => dayjs().add(n, 'minute').format('YYYY-MM-DD HH:mm:ss');

/** 四条覆盖全部状态语义的记录：成功可用 / 生成中 / 失败(iOS) / 成功但地址已过期 */
const rows = [
  {
    taskPk: 1,
    batchNo: 'B20260928100001',
    billType: '0',
    billMonth: null,
    beginDs: 20260901,
    endDs: 20260901,
    orderType: null,
    payChannel: null,
    env: 0,
    wxTaskId: null,
    status: '2',
    downloadUrl: MASKED,
    expireAt: inMinutes(20),
    errCode: null,
    errMsg: null,
    createBy: 'finance_day',
    createTime: '2026-09-28 10:00:00',
  },
  {
    taskPk: 2,
    batchNo: 'B20260928100002',
    billType: '2',
    billMonth: null,
    beginDs: 20260901,
    endDs: 20260910,
    orderType: 2,
    payChannel: 1,
    isProvided: '1',
    env: 0,
    wxTaskId: 'wx_task_20260928_abc',
    status: '1',
    downloadUrl: null,
    expireAt: null,
    errCode: null,
    errMsg: '微信侧正在生成，请稍后刷新',
    createBy: 'finance_order',
    createTime: '2026-09-28 10:05:00',
  },
  {
    taskPk: 3,
    batchNo: 'B20260928100003',
    billType: '1',
    billMonth: '202607',
    beginDs: null,
    endDs: null,
    startMonth: '202605',
    endMonth: '202607',
    orderType: null,
    payChannel: null,
    env: 0,
    wxTaskId: null,
    status: '3',
    downloadUrl: null,
    expireAt: null,
    errCode: 268490013,
    errMsg: 'Apple 尚未出账（需自然月结束后 45~60 天）',
    createBy: 'finance_ios',
    createTime: '2026-09-28 10:10:00',
  },
  {
    taskPk: 4,
    batchNo: 'B20260928100004',
    billType: '0',
    billMonth: null,
    beginDs: 20260831,
    endDs: 20260831,
    orderType: null,
    payChannel: null,
    env: 0,
    wxTaskId: null,
    status: '2',
    downloadUrl: MASKED,
    expireAt: inMinutes(-30),
    errCode: null,
    errMsg: null,
    createBy: 'finance_expired',
    createTime: '2026-09-28 09:00:00',
  },
];

/** msw 处理器的返回类型；用 unknown 会让 tsc 推不出 StrictResponse 而报 TS2345 */
type JsonResp = ReturnType<typeof ok> | ReturnType<typeof bizError> | ReturnType<typeof page>;

const calls = { list: 0, detail: 0, batch: 0, url: 0, fetch: 0, refresh: 0 };
let lastFetchBody: any = null;
let lastRefreshPk: number | null = null;
let urlResponse: JsonResp = ok(FRESH_URL);
let detailOverride: ((taskPk: number) => unknown) | null = null;
let refreshResponse: JsonResp | null = null;
let fetchResponse: JsonResp | null = null;

const handlers = [
  http.get('*/travel18/reward/bill/list', () => {
    calls.list += 1;
    return page(rows);
  }),
  http.get('*/travel18/reward/bill/url/:taskPk', () => {
    calls.url += 1;
    return urlResponse;
  }),
  http.get('*/travel18/reward/bill/batch/:batchNo', () => {
    calls.batch += 1;
    // 同一次发起按月展开成三行，共享同一个批次号
    return ok([
      { ...rows[2], taskPk: 31, billMonth: '202605', status: '2', expireAt: inMinutes(15) },
      { ...rows[2], taskPk: 32, billMonth: '202606', status: '2', expireAt: inMinutes(15) },
      { ...rows[2], taskPk: 33, billMonth: '202607', status: '1', expireAt: null },
    ]);
  }),
  http.get('*/travel18/reward/bill/:taskPk', ({ params }) => {
    calls.detail += 1;
    const pk = Number(params.taskPk);
    if (detailOverride) return ok(detailOverride(pk));
    return ok(rows.find((r) => r.taskPk === pk) ?? null);
  }),
  http.post('*/travel18/reward/bill/fetch', async ({ request }) => {
    calls.fetch += 1;
    lastFetchBody = await request.json();
    return fetchResponse ?? ok([{ ...rows[1], taskPk: 99 }]);
  }),
  http.post('*/travel18/reward/bill/refresh/:taskPk', ({ params }) => {
    calls.refresh += 1;
    lastRefreshPk = Number(params.taskPk);
    return refreshResponse ?? ok({ ...rows[1], status: '2', expireAt: inMinutes(25) });
  }),
];

beforeEach(() => {
  Object.keys(calls).forEach((k) => {
    calls[k as keyof typeof calls] = 0;
  });
  lastFetchBody = null;
  lastRefreshPk = null;
  urlResponse = ok(FRESH_URL);
  detailOverride = null;
  refreshResponse = null;
  fetchResponse = null;
  // ⚠️ 不要在 afterEach 里 vi.restoreAllMocks()：setupTests 用 Object.defineProperty
  // 把 window.matchMedia 定义成 vi.fn()，restoreAllMocks 会把它一起还原成 undefined，
  // 于是 antd 的 Grid Row 在解构 matches 时抛错，**整个 ProTable（含搜索表单）渲染不出来**，
  // 表现为「第一个用例过、后面全找不到行」，很难归因。这里只重置自己造的 window.open。
  window.open = vi.fn();
  server.use(...handlers);
});

afterEach(() => {
  message.destroy();
});

/**
 * 必须按生产结构套 antd <App> + AntdStaticProvider：
 * request.ts 的拦截器在顶层 code≠200 时会先调 messageInstance.error(...)，
 * 而 messageInstance 由 AntdStaticProvider 注册；不套的话它是 undefined，
 * 拦截器先抛 TypeError，页面 catch 里读到的 e.code 恒为 undefined（见设计文档缺陷 29）。
 * 本页的 4080~4087 全部走这条顶层业务码路径。
 */
const setup = () =>
  render(
    <AntdApp>
      <AntdStaticProvider>
        <RewardBill />
      </AntdStaticProvider>
    </AntdApp>,
  );

/** 当前打开的抽屉（同一时刻只会有一个） */
const drawer = () => {
  // 不依赖 ant-drawer-open：jsdom 里没有动画，开合类名不可靠；
  // 同一时刻只会有一个抽屉，取最后一个 .ant-drawer-content 即可
  const all = Array.from(document.querySelectorAll('.ant-drawer-content'));
  const el = all[all.length - 1];
  if (!el) throw new Error('没有已打开的抽屉');
  return el as HTMLElement;
};

const rowOf = async (text: string) => {
  const cell = await screen.findByText(text);
  const row = cell.closest('tr');
  if (!row) throw new Error(`未找到 ${text} 所在行`);
  return row as HTMLElement;
};

/**
 * 按名字找按钮。
 *
 * ⚠️ 名字里必须允许空白：antd 对「恰好两个汉字」的默认按钮会自动插入一个空格
 * （抽屉里的按钮可访问名是「下 载」），而 type="link" 的行内按钮不插（是「下载」）。
 * 直接写 /下载/ 会在抽屉里找不到按钮，报错看起来像「按钮没渲染」。
 */
const buttonIn = (scope: HTMLElement, name: string) =>
  within(scope).getByRole('button', { name: new RegExp(name.split('').join('\\s*')) });

/**
 * 最新一条全局提示。
 *
 * 不能直接 querySelector('.ant-message-error')：jsdom 不触发 animationend，
 * antd 的提示节点在 message.destroy() 之后仍可能留在 body 里，
 * 于是**上一个用例的 error 会让本用例的「不该有 error」断言假失败**。
 * rc-notification 是追加渲染的，取最后一个即当前这条。
 */
const lastNoticeType = () => {
  const notices = Array.from(document.querySelectorAll('.ant-message-notice'));
  const content = notices[notices.length - 1]?.querySelector('.ant-message-custom-content');
  return content?.className ?? '';
};

const tagOf = (text: string) => screen.getAllByText(text)[0].closest('.ant-tag') as HTMLElement;

/** 表单项里的原生控件（antd 会把 name 当成 id 挂在 input 上） */
const field = (name: string) => drawer().querySelector(`#${name}`) as HTMLElement | null;

/**
 * 选一个下拉项。
 *
 * 必须先点开对应字段的 Select（否则选项根本不渲染），且要在**未隐藏**的下拉里找：
 * 页面上同时有搜索表单与抽屉表单的多个 Select，body 里可能残留别的下拉面板；
 * 表格单元格里也会出现同名中文，所以不能只按文本找。
 */
const pickSelect = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  label: string,
) => {
  const input = field(name);
  if (!input) throw new Error(`表单里没有字段 ${name}`);
  await user.click(input);
  const opt = await waitFor(() => {
    const panels = Array.from(
      document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden)'),
    );
    const hit = panels
      .flatMap((panel) => Array.from(panel.querySelectorAll('.ant-select-item-option')))
      .find((el) => el.textContent === label);
    if (!hit) throw new Error(`下拉里没有选项 ${label}`);
    return hit as HTMLElement;
  });
  await user.click(opt);
};

/**
 * 打开「发起获取」抽屉。
 *
 * 这里**顺带调用 setup()**：表单类用例的正文全是从这一步开始的，
 * 早先漏了 setup 时页面根本没渲染（document.body 是空的），
 * 报错却是「找不到 finance_day」，看起来像列表接口挂了，很误导。
 */
const openFetchDrawer = async (user: ReturnType<typeof userEvent.setup>) => {
  setup();
  await rowOf('finance_day');
  await user.click(screen.getByRole('button', { name: /发起获取/ }));
  await screen.findByText('这会真的调用微信接口');
  return drawer();
};

const pickBillType = async (user: ReturnType<typeof userEvent.setup>, label: string) => {
  await user.click(within(drawer()).getByText(label));
};

const fillDayRange = async (user: ReturnType<typeof userEvent.setup>, from: string, to: string) => {
  const inputs = Array.from(drawer().querySelectorAll('.ant-picker input'));
  expect(inputs).toHaveLength(2);
  await user.click(inputs[0] as HTMLInputElement);
  await user.type(inputs[0] as HTMLInputElement, from);
  await user.keyboard('{Enter}');
  await user.type(inputs[1] as HTMLInputElement, to);
  await user.keyboard('{Enter}');
};

describe('账单下载页 · 状态语义', () => {
  it('「生成中」用中性色而不是错误色，页面明说这不是失败', async () => {
    setup();
    await rowOf('finance_order');

    const tag = tagOf('生成中');
    // 标红会让财务以为账单丢了并反复重试，最终撞上微信的频率限制
    expect(tag.className).not.toContain('ant-tag-error');
    expect(tag.className).toContain('ant-tag-processing');
    expect(screen.getByText(/「生成中」不是失败/)).toBeInTheDocument();

    // 「生成中」那一行的错误信息列是**下一步动作引导**，同样不能标红
    const row = await rowOf('finance_order');
    const hint = within(row).getByText('微信侧正在生成，请稍后刷新');
    expect(hint.className).not.toContain('ant-typography-danger');
  });

  it('真正失败的那条才用错误色，并展示微信侧原文', async () => {
    setup();
    await rowOf('finance_ios');

    expect(tagOf('失败').className).toContain('ant-tag-error');
    expect(screen.getByText(/Apple 尚未出账（需自然月结束后 45~60 天）/)).toBeInTheDocument();
  });

  it('地址过期的记录：「下载」按钮禁用并标注需重新获取；未过期显示仍可下载', async () => {
    setup();

    const usable = await rowOf('finance_day');
    expect(within(usable).getByText('仍可下载')).toBeInTheDocument();
    expect(buttonIn(usable, '下载')).toBeEnabled();

    // 过期后重发旧地址只会打开一个失败页，容易被误判成「账单文件损坏」，
    // 所以按钮必须直接禁掉并说清楚要重新获取
    const expired = await rowOf('finance_expired');
    expect(within(expired).getByText('已过期，需刷新重取')).toBeInTheDocument();
    expect(buttonIn(expired, '下载')).toBeDisabled();
  });
});

describe('账单下载页 · 真实地址只从专用出口出', () => {
  it('即使记录里带了真实地址也不渲染成链接；点「下载」用的是接口现取的地址', async () => {
    const user = userEvent.setup();
    // 故意让详情接口「漏掩」，把真实地址发下来：页面仍不得把它变成可点链接
    detailOverride = (pk) => ({
      ...(rows.find((r) => r.taskPk === pk) ?? {}),
      downloadUrl: LEAKED_URL,
    });
    setup();

    const row = await rowOf('finance_day');
    await user.click(buttonIn(row, '详情'));
    await waitFor(() => expect(calls.detail).toBeGreaterThan(0));

    // 地址以纯文本呈现，且没有任何 <a> 指向它
    expect(document.querySelector(`a[href*="LEAKED_TOKEN_ABC"]`)).toBeNull();
    const anchors = Array.from(document.querySelectorAll('a'));
    expect(anchors.some((a) => (a.getAttribute('href') ?? '').includes('xpay/bill'))).toBe(false);

    const before = calls.url;
    await user.click(buttonIn(drawer(), '下载'));
    await waitFor(() => expect(calls.url).toBe(before + 1));
    // 打开的是**出口接口那一刻返回的地址**，不是记录里的那个字段
    expect(window.open).toHaveBeenCalledWith(FRESH_URL, '_blank', 'noopener,noreferrer');
    expect(window.open).not.toHaveBeenCalledWith(LEAKED_URL, '_blank', 'noopener,noreferrer');
  });

  it('地址已过期（4085）：提示重新刷新，不打开任何窗口，并重新拉列表', async () => {
    const user = userEvent.setup();
    urlResponse = bizError(4085, '下载地址已过期，请重新获取');
    setup();

    const row = await rowOf('finance_day');
    const before = calls.list;
    await user.click(buttonIn(row, '下载'));

    expect(
      await screen.findByText(/已过期，请点「刷新结果」重新获取一个新地址/),
    ).toBeInTheDocument();
    expect(window.open).not.toHaveBeenCalled();
    // 过期是列表数据陈旧导致的，刷新列表才能让按钮态回到真实情况
    await waitFor(() => expect(calls.list).toBeGreaterThan(before));
  });

  it('任务尚未就绪（4087）：提示先刷新结果，不打开任何窗口', async () => {
    const user = userEvent.setup();
    urlResponse = bizError(4087, '任务尚未成功，没有可下载的地址');
    setup();

    const row = await rowOf('finance_day');
    await user.click(buttonIn(row, '下载'));

    expect(await screen.findByText(/还没生成好，请先点「刷新结果」/)).toBeInTheDocument();
    expect(window.open).not.toHaveBeenCalled();
  });
});

describe('账单下载页 · 刷新结果按新状态分派提示', () => {
  it('刷新后成功：提示账单已就绪', async () => {
    const user = userEvent.setup();
    refreshResponse = ok({ ...rows[1], status: '2', downloadUrl: MASKED, expireAt: inMinutes(25) });
    setup();

    const row = await rowOf('finance_order');
    await user.click(buttonIn(row, '刷新结果'));

    expect(await screen.findByText('账单已就绪，可以下载了')).toBeInTheDocument();
    await waitFor(() => expect(lastRefreshPk).toBe(2));
    expect(lastNoticeType()).toContain('ant-message-success');
  });

  it('刷新后仍在生成：用 warning 而不是 error（继续等，不要重试）', async () => {
    const user = userEvent.setup();
    refreshResponse = ok({ ...rows[1], status: '1', errMsg: '微信侧仍在生成，请稍后再刷新' });
    setup();

    const row = await rowOf('finance_order');
    await user.click(buttonIn(row, '刷新结果'));

    expect(await screen.findByText('微信侧仍在生成，请稍后再刷新')).toBeInTheDocument();
    // 还在生成 ≠ 失败：这里必须是 warning，标红会让人以为账单丢了并反复重试
    expect(lastNoticeType()).toContain('ant-message-warning');
    expect(lastNoticeType()).not.toContain('ant-message-error');
  });

  it('刷新后失败：用 error 并把微信原文给出来', async () => {
    const user = userEvent.setup();
    refreshResponse = ok({ ...rows[1], status: '3', errMsg: '账单生成失败：账期内无交易' });
    setup();

    const row = await rowOf('finance_order');
    await user.click(buttonIn(row, '刷新结果'));

    expect(await screen.findByText('账单生成失败：账期内无交易')).toBeInTheDocument();
    expect(lastNoticeType()).toContain('ant-message-error');
  });

  it('记录缺少微信任务ID而无法刷新（4084）时，引导重新发起而不是原地重试', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('*/travel18/reward/bill/refresh/:taskPk', () => {
        calls.refresh += 1;
        return bizError(4084, '任务不存在或已被清理');
      }),
    );
    setup();

    const row = await rowOf('finance_order');
    await user.click(buttonIn(row, '刷新结果'));

    // 拦截器只会弹一句笼统的「服务器错误，请稍后重试」（parseError 把 code>=500
    // 一律判成服务器错误），所以「该去重新发起」这个动作引导必须由页面自己给
    expect(
      await screen.findByText('该下载任务记录已不存在，请重新发起一次获取'),
    ).toBeInTheDocument();
    await waitFor(() => expect(calls.refresh).toBe(1));
  });
});

describe('账单下载页 · 发起表单', () => {
  it('支付渠道必填且刻意无默认值：未选时不出网', async () => {
    const user = userEvent.setup();
    const d = await openFetchDrawer(user);
    await pickBillType(user, '订单明细');
    await fillDayRange(user, '2026-09-01', '2026-09-10');

    // 默认值必须是空的：安卓 T+3、iOS 45~60 天，替财务默认选一个＝让他不知情时拉错口径
    const select = field('payChannel')?.closest('.ant-select') as HTMLElement;
    expect(select.textContent).toContain('请选择支付渠道');
    expect(select.textContent).not.toContain('普通虚拟支付');
    expect(select.textContent).not.toContain('苹果 IAP');
    // 页面上还得写清楚为什么不给默认值
    expect(
      within(d).getByText(/刻意不给默认值：安卓由微信结算（T\+3）、iOS 由 Apple 结算/),
    ).toBeInTheDocument();

    await user.click(within(d).getByRole('button', { name: /发起获取/ }));
    expect(await screen.findByText('必须显式选择支付渠道')).toBeInTheDocument();
    await waitFor(() => expect(calls.fetch).toBe(0));
  });

  it('订单类型默认「道具直购」，与本项目打赏的实际形态一致', async () => {
    const user = userEvent.setup();
    await openFetchDrawer(user);
    await pickBillType(user, '订单明细');

    const select = field('orderType')?.closest('.ant-select') as HTMLElement;
    expect(select.textContent).toContain('道具直购（本项目打赏）');
  });

  it('订单明细跨度超 31 天时前端先拦，并算出该拆几段（不出网）', async () => {
    const user = userEvent.setup();
    const d = await openFetchDrawer(user);
    await pickBillType(user, '订单明细');
    // 2026-08-01 ~ 2026-09-30 含首尾共 61 天，上限 31 天 → 至少拆 2 段
    await fillDayRange(user, '2026-08-01', '2026-09-30');

    expect(await within(d).findByText(/跨度 61 天，超过微信上限 31 天/)).toBeInTheDocument();
    expect(within(d).getByText(/请拆成至少 2 段分别下载/)).toBeInTheDocument();

    await pickSelect(user, 'payChannel', '普通虚拟支付（安卓/鸿蒙/Windows）');
    await user.click(within(d).getByRole('button', { name: /发起获取/ }));

    // 抽屉里的 Alert 与弹出的提示都带「拆成至少 2 段」，故按提示独有的措辞断言
    expect(await screen.findByText(/订单明细跨度 61 天，超过微信上限 31 天/)).toBeInTheDocument();
    // 这是微信侧硬限制，出网也一定被拒；前端拦住省一次白跑的往返
    await waitFor(() => expect(calls.fetch).toBe(0));
  });

  it('受理后返回「生成中」时用 warning 提示，不报成失败', async () => {
    const user = userEvent.setup();
    fetchResponse = ok([
      { ...rows[0], taskPk: 90, status: '1', downloadUrl: null, expireAt: null },
    ]);
    const d = await openFetchDrawer(user);
    await fillDayRange(user, '2026-09-01', '2026-09-01');

    await user.click(within(d).getByRole('button', { name: /发起获取/ }));

    expect(await screen.findByText(/这不是失败/)).toBeInTheDocument();
    expect(lastNoticeType()).toContain('ant-message-warning');
    expect(lastNoticeType()).not.toContain('ant-message-error');
    await waitFor(() => expect(calls.fetch).toBe(1));
    // 日账单的入参形态是 YYYYMMDD 数字，不是字符串
    expect(lastFetchBody).toMatchObject({ billType: '0', beginDs: 20260901, endDs: 20260901 });
  });

  it('跨度超限（4086）时后端文案照弹，并补一句动作引导', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('*/travel18/reward/bill/fetch', async ({ request }) => {
        calls.fetch += 1;
        lastFetchBody = await request.json();
        return bizError(4086, '订单明细日期跨度不能超过 31 天');
      }),
    );
    const d = await openFetchDrawer(user);
    await pickBillType(user, '订单明细');
    await fillDayRange(user, '2026-09-01', '2026-09-10');
    await pickSelect(user, 'payChannel', '普通虚拟支付（安卓/鸿蒙/Windows）');

    await user.click(within(d).getByRole('button', { name: /发起获取/ }));

    expect(await screen.findByText('请把日期区间拆短后分别下载')).toBeInTheDocument();
    await waitFor(() => expect(lastFetchBody).toMatchObject({ payChannel: 1, orderType: 2 }));
    // 订单明细必须把 orderType/payChannel 原样带上，否则微信返回的是另一个口径的明细
    expect(lastFetchBody).toMatchObject({ billType: '2', beginDs: 20260901, endDs: 20260910 });
  });
});

describe('账单下载页 · 详情', () => {
  it('iOS 月结详情列出同批全部月份，避免误以为其它月份没取到', async () => {
    const user = userEvent.setup();
    setup();

    const row = await rowOf('finance_ios');
    await user.click(buttonIn(row, '详情'));

    expect(await screen.findByText(/同一次发起的全部月份（3 条）/)).toBeInTheDocument();
    await waitFor(() => expect(calls.batch).toBe(1));
    // 一次发起按月展开成多行，三个月份必须都在
    ['2026-05', '2026-06', '2026-07'].forEach((m) => {
      expect(screen.getAllByText(m).length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/避免只看到其中一个月而误以为其它月份没取到/)).toBeInTheDocument();
  });

  it('订单明细详情缺失微信任务ID时显式告警：该记录无法刷新', async () => {
    const user = userEvent.setup();
    detailOverride = (pk) => ({ ...(rows.find((r) => r.taskPk === pk) ?? {}), wxTaskId: null });
    setup();

    const row = await rowOf('finance_order');
    await user.click(buttonIn(row, '详情'));

    // 微信没有「列出我所有下载任务」的接口，task_id 丢了那个任务的结果就永久取不回
    expect(
      await screen.findByText(/缺失：微信未返回 task_id，该记录无法刷新，需重新发起/),
    ).toBeInTheDocument();
  });

  it('订单明细详情把发起时刻的筛选条件快照原样展示（含发货状态）', async () => {
    const user = userEvent.setup();
    setup();

    const row = await rowOf('finance_order');
    await user.click(buttonIn(row, '详情'));

    const d = drawer();
    expect(await within(d).findByText('订单明细筛选条件（发起时刻的快照）')).toBeInTheDocument();
    // 这些中文在表格「渠道/类型」列里也有一份，必须限定在抽屉内断言
    expect(within(d).getAllByText('道具直购（本项目打赏）').length).toBeGreaterThan(0);
    expect(within(d).getAllByText('普通虚拟支付（安卓/鸿蒙/Windows）').length).toBeGreaterThan(0);
    expect(within(d).getByText('已发货')).toBeInTheDocument();
    // 刷新不得清掉这些条件列，否则对账时对不上「当初到底捞的是哪一批」
    expect(within(d).getByText(/wx_task_20260928_abc/)).toBeInTheDocument();
  });
});
