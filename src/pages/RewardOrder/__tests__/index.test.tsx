/**
 * 打赏订单页测试。
 *
 * 重点不是「渲染出来了」，而是**资金安全不变量**：
 *   - 退款入口只对可退状态开放
 *   - 微信侧 left_fee 没查到时（null）必须禁用退款，不能当成 0
 *   - 「受理成功」必须显示为处理中，不能显示已退款
 *   - 4016（受理结果未知）必须明确阻止重复发起
 * 这几条一旦回归，直接后果是多退钱或重复退款。
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test-utils';
import { message, Modal } from 'antd';
import { http, HttpResponse } from 'msw';
import React from 'react';
// 复用 setupTests 里已 listen 的全局 server。
// 不要在测试文件里再 setupServer：msw 2.14 下两个 server 同时监听，
// 同一个请求会被处理两次，「一次点击只能出网一次」的断言会假失败。
import { server } from '../../../../mocks/server';
import RewardOrder from '../index';

const ok = (data?: unknown) => HttpResponse.json({ code: 200, msg: '操作成功', data });

/**
 * 记录退款请求是否真的出网。
 * 「界面报错」和「请求没发出去」是两件事：只断言前者，
 * 万一哪天校验被绕过，钱照样退出去，测试却还是绿的。
 */
let refundRequestCount = 0;
const page = (rows: unknown[], total = rows.length) =>
  HttpResponse.json({ code: 200, msg: 'success', rows, total });

/** 六种订单状态各一笔，用于验证退款入口的可见性 */
const ordersOfEveryStatus = ['0', '1', '2', '3', '4', '5', '6'].map((st, i) => ({
  orderId: i + 1,
  orderNo: `N${i + 1}`,
  outTradeNo: `R26092812000${i}TEST`,
  userOpenid: `openid_${i}`,
  lineId: 88,
  merchantId: 12,
  authorUserId: 77,
  tierId: 1,
  wxProductId: 'reward_5',
  origPriceFen: 500,
  actualPriceFen: 500,
  shareRate: 78,
  shareFen: 390,
  channelFeeRate: 1,
  commissionRate: 10,
  env: '0',
  platform: 'android',
  orderStatus: st,
  refundFeeFen: st === '5' ? 500 : null,
  paidTime: '2026-08-05 10:00:00',
  createTime: '2026-08-05 10:00:00',
}));

const refundablePreview = {
  orderId: 3,
  orderNo: 'N3',
  outTradeNo: 'R260928120002TEST',
  orderStatus: '2',
  orderStatusText: '已发货',
  refundable: true,
  actualPriceFen: 500,
  leftFeeFen: 500,
  maxRefundFen: 500,
  querySucceeded: true,
  overWindow: false,
  daysSincePaid: 54,
  paidTime: '2026-08-05 10:00:00',
  platform: 'android',
  env: '0',
};

const handlers = [
  http.get('*/travel18/reward/order/list', () => page(ordersOfEveryStatus)),
  http.get('*/travel18/reward/order/:orderId/payable', () => ok(null)),
  http.get('*/travel18/reward/order/:orderId', ({ params }) =>
    ok(ordersOfEveryStatus.find((o) => o.orderId === Number(params.orderId))),
  ),
  http.get('*/travel18/reward/refund/preview', () => ok(refundablePreview)),
  http.post('*/travel18/reward/refund', () => {
    refundRequestCount += 1;
    return ok({ success: true, needPoll: false });
  }),
  http.post('*/travel18/reward/refund/poll/one', () => ok({ terminal: true, orderStatus: '5' })),
  http.post('*/travel18/line/list', () => page([])),
];

beforeEach(() => server.use(...handlers));
afterEach(() => {
  refundRequestCount = 0;
  // antd 的 message / Modal.error 挂在 body 上，不受 RTL cleanup 管理，
  // 不清掉会串到下一个用例（曾导致「退款已完成」出现在不该出现的用例里）
  message.destroy();
  Modal.destroyAll();
});

/**
 * 统计成功提示条数。
 * antd 的 message 依赖动画结束事件摘节点，jsdom 不派发，`message.destroy()` 之后
 * 旧提示可能仍留在 DOM 里，所以用「有没有新增」代替「存不存在」。
 */
const countSuccessToast = () => document.querySelectorAll('.ant-message-success').length;

const setup = () => {
  render(<RewardOrder />);
  return screen;
};

describe('打赏订单页 · 列表与退款入口', () => {
  it('渲染订单行并按后端语义翻译状态', async () => {
    setup();
    expect(await screen.findByText('R260928120002TEST')).toBeInTheDocument();
    // 状态文案必须来自后端枚举，不能出现裸的 '2'
    expect(screen.getByText('已发货')).toBeInTheDocument();
    expect(screen.getByText('退款失败')).toBeInTheDocument();
  });

  it('金额以「分」传输、以「元」展示', async () => {
    setup();
    await screen.findByText('R260928120002TEST');
    // 500 分 = 5.00 元；若直接显示 500 说明单位没换算，财务会按 500 元退款
    expect(screen.getAllByText('5.00 元').length).toBeGreaterThan(0);
  });

  it('退款入口只对「已发货(2)」与「退款失败(6)」开放', async () => {
    setup();
    await screen.findByText('R260928120002TEST');
    // 7 行订单，只有 2 行可退
    await waitFor(() => expect(screen.getAllByText('退款')).toHaveLength(2));
    // 退款中(4) 显示的是排障入口，不是退款入口
    expect(screen.getAllByText('查退款结果')).toHaveLength(1);
  });
});

describe('打赏订单页 · 退款预览（left_fee 语义）', () => {
  it('可退时预填微信侧可退余额，并展示实付/可退/天数', async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText('R260928120002TEST');
    await user.click(screen.getAllByText('退款')[0]);

    expect(await screen.findByText('微信侧可退余额')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /确认退款/ })).toBeEnabled());
  });

  it('leftFeeFen 为 null（没查到，不是 0）时禁用退款并明确说明', async () => {
    server.use(
      http.get('*/travel18/reward/refund/preview', () =>
        ok({
          ...refundablePreview,
          refundable: false,
          querySucceeded: false,
          leftFeeFen: null,
          maxRefundFen: null,
          queryErrCode: 268490015,
          queryErrMsg: '频率限制',
          reason: '查单失败，无法确认 left_fee',
        }),
      ),
    );
    const user = userEvent.setup();
    setup();
    await screen.findByText('R260928120002TEST');
    await user.click(screen.getAllByText('退款')[0]);

    // 这是本页面最重要的一条断言：查不到余额时绝不能让退款按钮可点，
    // 否则会用本地金额猜，而微信对退款金额是精确校验的
    expect(await screen.findByText('微信侧查询失败，无法确认最多可退多少')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /确认退款/ })).toBeDisabled());
  });

  it('订单状态不可退时展示后端给出的原因', async () => {
    server.use(
      http.get('*/travel18/reward/refund/preview', () =>
        ok({
          ...refundablePreview,
          refundable: false,
          querySucceeded: true,
          reason: '订单尚未完成发货',
        }),
      ),
    );
    const user = userEvent.setup();
    setup();
    await screen.findByText('R260928120002TEST');
    await user.click(screen.getAllByText('退款')[0]);

    expect(await screen.findByText('该订单当前不可退款')).toBeInTheDocument();
    expect(screen.getByText('订单尚未完成发货')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /确认退款/ })).toBeDisabled());
  });

  it('退款金额超过微信侧可退余额时被前端拦下', async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText('R260928120002TEST');
    await user.click(screen.getAllByText('退款')[0]);
    await screen.findByText('微信侧可退余额');

    const input = document.querySelector('input[role="spinbutton"]') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '99.99');
    await user.click(screen.getByRole('button', { name: /确认退款/ }));

    expect(await screen.findByText(/不得超过微信侧可退余额/)).toBeInTheDocument();
    // 关键：报错的同时请求必须没有出网。
    // rc-input-number 曾出现「输入框显示 99.99、表单值是 undefined」的状态，
    // 而 undefined 在后端等于全额退款——那是客服想退 5 元、系统退全款。
    await waitFor(() => expect(refundRequestCount).toBe(0));
  });

  it('退款金额为 0 或非法时被拦下，不出网', async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText('R260928120002TEST');
    await user.click(screen.getAllByText('退款')[0]);
    await screen.findByText('微信侧可退余额');

    const input = document.querySelector('input[role="spinbutton"]') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '0');
    await user.click(screen.getByRole('button', { name: /确认退款/ }));

    expect(await screen.findByText('退款金额必须大于 0')).toBeInTheDocument();
    await waitFor(() => expect(refundRequestCount).toBe(0));
  });
});

describe('打赏订单页 · 退款结果的三态语义', () => {
  it('needPoll=true 时提示「处理中」而不是「已退款」（受理成功 ≠ 到账）', async () => {
    server.use(
      http.post('*/travel18/reward/refund', () => {
        // server.use 会遮蔽默认 handler，计数得在这儿自己做
        refundRequestCount += 1;
        return ok({ success: true, needPoll: true, mchRefundId: 'RF2609280001', orderStatus: '4' });
      }),
    );
    const user = userEvent.setup();
    setup();
    const successBefore = countSuccessToast();
    await screen.findByText('R260928120002TEST');
    await user.click(screen.getAllByText('退款')[0]);
    await screen.findByText('微信侧可退余额');
    await user.click(screen.getByRole('button', { name: /确认退款/ }));

    expect(await screen.findByText(/退款已受理，正在处理中/)).toBeInTheDocument();
    // 受理成功绝不能弹成功提示：客服看到绿色「已完成」就不会再跟这笔退款
    await waitFor(() => expect(refundRequestCount).toBe(1));
    expect(countSuccessToast()).toBe(successBefore);
  });

  it('needPoll=false 时提示「退款已完成」', async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText('R260928120002TEST');
    await user.click(screen.getAllByText('退款')[0]);
    await screen.findByText('微信侧可退余额');
    await user.click(screen.getByRole('button', { name: /确认退款/ }));

    expect(await screen.findByText('退款已完成')).toBeInTheDocument();
    // 一次点击只能出网一次：重复发起 = 重复退款
    await waitFor(() => expect(refundRequestCount).toBe(1));
  });

  it('code=4016 受理结果未知：必须阻止重复发起并给出退款单号', async () => {
    server.use(
      http.post('*/travel18/reward/refund', () => {
        refundRequestCount += 1;
        return ok({
          success: false,
          code: 4016,
          message: '受理结果未知',
          mchRefundId: 'RF2609289999',
          needPoll: true,
        });
      }),
    );
    const user = userEvent.setup();
    setup();
    await screen.findByText('R260928120002TEST');
    await user.click(screen.getAllByText('退款')[0]);
    await screen.findByText('微信侧可退余额');
    await user.click(screen.getByRole('button', { name: /确认退款/ }));

    // antd 的确认框会渲染两份标题（.ant-modal-title 供无障碍使用 + .ant-modal-confirm-title），
    // 因此这里按「至少出现一次」断言，正文再收敛到 confirm-body 内部精确查
    const titles = await screen.findAllByText('受理结果未知，请勿重复发起');
    expect(titles.length).toBeGreaterThan(0);
    // 一次点击只能出网一次：受理结果未知时再发一次，就是可能退两笔钱
    await waitFor(() => expect(refundRequestCount).toBe(1));

    // 静态 Modal 会残留在 body 上，按标题取「本次这一个」的正文
    const confirmBody = titles[titles.length - 1].closest('.ant-modal-confirm-body') as HTMLElement;
    expect(confirmBody).toBeTruthy();
    // 单号必须可复制，客服要拿它去微信侧查
    expect(within(confirmBody).getByText('RF2609289999')).toBeInTheDocument();
    // 这句话里「不要」被 <b> 包着，getByText 只看元素的直接文本节点，会被拆开，
    // 所以按整段文本内容断言
    expect(confirmBody.textContent).toMatch(/不要.*再次点击退款/);
  });

  it('code=4001 提示需引导用户重开小程序刷新登录态', async () => {
    server.use(
      http.post('*/travel18/reward/refund', () => {
        refundRequestCount += 1;
        return ok({ success: false, code: 4001, message: 'session_key 已过期' });
      }),
    );
    const user = userEvent.setup();
    setup();
    await screen.findByText('R260928120002TEST');
    await user.click(screen.getAllByText('退款')[0]);
    await screen.findByText('微信侧可退余额');
    await user.click(screen.getByRole('button', { name: /确认退款/ }));

    expect(
      await screen.findByText('用户登录态已失效，需引导用户重新打开小程序后再发起退款'),
    ).toBeInTheDocument();
  });

  it('code=4013 提示超出 365 天窗口需走线下', async () => {
    server.use(
      http.post('*/travel18/reward/refund', () => {
        refundRequestCount += 1;
        return ok({ success: false, code: 4013 });
      }),
    );
    const user = userEvent.setup();
    setup();
    await screen.findByText('R260928120002TEST');
    await user.click(screen.getAllByText('退款')[0]);
    await screen.findByText('微信侧可退余额');
    await user.click(screen.getByRole('button', { name: /确认退款/ }));

    expect(
      await screen.findByText('已超出可退窗口（官方硬限制 365 天），请走线下处理'),
    ).toBeInTheDocument();
  });
});

describe('打赏订单页 · 详情抽屉', () => {
  it('应付流水为 null 时显示「未记账」而不是「查询失败」', async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText('R260928120002TEST');
    await user.click(screen.getAllByText('详情')[0]);

    expect(await screen.findByText(/未记账/)).toBeInTheDocument();
    expect(screen.queryByText('查询失败')).not.toBeInTheDocument();
  });

  it('有应付流水时展示分成走到哪一步', async () => {
    server.use(
      http.get('*/travel18/reward/order/:orderId/payable', () =>
        ok({
          payableId: 1,
          payableNo: 'P710001',
          amountFen: 390,
          orderAmountFen: 500,
          shareRate: 78,
          terminalGroup: 'android',
          payStatus: '1',
          settleBatchId: 990001,
        }),
      ),
    );
    const user = userEvent.setup();
    setup();
    await screen.findByText('R260928120002TEST');
    await user.click(screen.getAllByText('详情')[0]);

    expect(await screen.findByText('P710001')).toBeInTheDocument();
    const drawer = document.querySelector('.ant-drawer-body') as HTMLElement;
    // 3.90 元 会同时出现在「订单快照 · 商家分成」和「应付流水 · 应付金额」，
    // 这里要验的是应付流水区块，所以按区块收敛，否则断言的是重名巧合
    const payableSection = within(drawer)
      .getByText('商家应付流水')
      .closest('.ant-descriptions') as HTMLElement;
    expect(within(payableSection).getByText('已入批次')).toBeInTheDocument();
    expect(within(payableSection).getByText('3.90 元')).toBeInTheDocument();
    expect(within(payableSection).getByText('990001')).toBeInTheDocument();
  });
});
