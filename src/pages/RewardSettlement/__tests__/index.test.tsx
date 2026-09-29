/**
 * 打赏商家结算页测试。
 *
 * 这一页直接对着「平台往商家账户打钱」，所以测试重点不是渲染，而是资金红线：
 *   - 状态机只能单向前进：已转账(2) 的批次绝不能出现「作废」入口
 *   - 转账金额必须等于批次应付总额、发票金额必须等于已付金额，改值就不许出网
 *   - 4032（批次账面不可信）必须以「禁止继续付款」的强提示出现，不能是一条普通 message
 *   - 作废原因必填：资金批次不允许无痕撤销
 *   - 未预览 / 预览结论 settleable=false 时，「确认生成」必须是禁用的
 * 这些一旦回归，后果是多付钱、付了钱却没有账面凭证。
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test-utils';
import { message, Modal } from 'antd';
import { http, HttpResponse } from 'msw';
import React from 'react';
// 复用 setupTests 里已经 listen 的全局 server。
// 不要在测试文件里再 setupServer：msw 2.14 下两个 server 同时监听，
// 同一个请求会被处理两次，「只许调用一次」的资金断言会假失败。
import { server } from '../../../../mocks/server';
import RewardSettlement from '../index';

const ok = (data?: unknown) => HttpResponse.json({ code: 200, msg: '操作成功', data });
const page = (rows: unknown[], total = rows.length) =>
  HttpResponse.json({ code: 200, msg: 'success', rows, total });

/**
 * 出网计数器。
 * 「界面提示了错误」和「请求没发出去」是两件事，只断言前者的话，
 * 校验一旦被绕过，钱照样付出去而测试仍然是绿的。
 */
const calls = {
  preview: 0,
  generate: 0,
  confirm: 0,
  complete: 0,
  transfer: 0,
  invoice: 0,
  void: 0,
  monthly: 0,
};
let lastTransferBody: any = null;
let lastInvoiceBody: any = null;
let lastGenerateBody: any = null;
let lastVoidUrl: string = '';

/** 六种批次状态各一条，用于验证「状态 → 可执行操作」映射 */
const batchesOfEveryStatus = ['0', '1', '2', '3', '4', '5'].map((st, i) => ({
  batchId: 900001 + i,
  batchNo: `SB26090100000${i + 1}`,
  merchantId: 12,
  merchantName: '十八线旅行社',
  terminalGroup: i % 2 === 0 ? 'android' : 'ios',
  periodStart: '2026-08-01',
  periodEnd: '2026-08-31',
  orderCount: 3,
  orderAmountFen: 1500,
  totalFen: 1170,
  paidFen: st === '0' || st === '1' || st === '5' ? null : 1170,
  batchStatus: st,
  transferNo: st === '0' || st === '1' ? null : 'BANK20260901001',
  invoiceNo: st === '3' || st === '4' ? 'INV20260901' : null,
  invoiceAmountFen: st === '3' || st === '4' ? 1170 : null,
  createBy: 'admin',
  confirmBy: st === '0' ? null : 'finance1',
  transferBy: st === '0' || st === '1' ? null : 'finance2',
  voidReason: st === '5' ? '账期填错，重新生成' : null,
  createTime: '2026-09-01 10:00:00',
}));

const batchByNo = (no: string) => batchesOfEveryStatus.find((b) => b.batchNo === no)!;

const settleablePreview = {
  settleable: true,
  merchantId: 12,
  merchantName: '十八线旅行社',
  terminalGroup: 'android',
  periodStart: '2026-08-01',
  periodEnd: '2026-08-31',
  payableCount: 3,
  minAmountFen: 100,
  totalOrderAmountFen: 1500,
  totalAmountFen: 1170,
  bankAccountName: '十八线旅行社有限公司',
  bankName: '招商银行杭州分行',
  bankAccountNo: '****6789',
  invoiceCapability: '1',
};

const payables = [
  {
    payableId: 1,
    payableNo: 'P710001',
    outTradeNo: 'R260805100001TEST',
    lineId: 88,
    orderAmountFen: 500,
    shareRate: 78,
    amountFen: 390,
    payStatus: '1',
    voidReason: null,
  },
  {
    payableId: 2,
    payableNo: 'P710002',
    outTradeNo: 'R260806100002TEST',
    lineId: 88,
    orderAmountFen: 1000,
    shareRate: 78,
    amountFen: 780,
    payStatus: '1',
    voidReason: null,
  },
];

const handlers = [
  http.get('*/travel18/reward/settlement/list', () => page(batchesOfEveryStatus)),
  http.get('*/travel18/reward/settlement/:batchId/payables', () => page(payables)),
  http.get('*/travel18/reward/settlement/:batchId', ({ params }) =>
    ok(batchesOfEveryStatus.find((b) => b.batchId === Number(params.batchId))),
  ),
  http.post('*/travel18/reward/settlement/preview', async ({ request }) => {
    calls.preview += 1;
    lastGenerateBody = await request.json();
    return ok(settleablePreview);
  }),
  http.post('*/travel18/reward/settlement/generate', async ({ request }) => {
    calls.generate += 1;
    lastGenerateBody = await request.json();
    return ok({ success: true, batchId: 900100, batchNo: 'SB260901000099', message: '批次已生成' });
  }),
  http.post('*/travel18/reward/settlement/monthly', () => {
    calls.monthly += 1;
    return ok({
      merchantCount: 2,
      generatedCount: 3,
      skippedNoPayableCount: 1,
      skippedBelowMinimumCount: 0,
      failedCount: 0,
      elapsedMs: 42,
      details: [],
    });
  }),
  http.post('*/travel18/reward/settlement/:batchId/confirm', () => {
    calls.confirm += 1;
    return ok({ success: true, message: '已确认' });
  }),
  http.post('*/travel18/reward/settlement/:batchId/complete', () => {
    calls.complete += 1;
    return ok({ success: true, message: '已归档' });
  }),
  http.post('*/travel18/reward/settlement/transfer', async ({ request }) => {
    calls.transfer += 1;
    lastTransferBody = await request.json();
    return ok({ success: true, message: '转账已登记' });
  }),
  http.post('*/travel18/reward/settlement/invoice', async ({ request }) => {
    calls.invoice += 1;
    lastInvoiceBody = await request.json();
    return ok({ success: true, message: '发票已登记' });
  }),
  http.post('*/travel18/reward/settlement/:batchId/void', ({ request }) => {
    calls.void += 1;
    lastVoidUrl = request.url;
    return ok({ success: true, message: '批次已作废' });
  }),
];

beforeEach(() => server.use(...handlers));
afterEach(() => {
  Object.keys(calls).forEach((k) => {
    calls[k as keyof typeof calls] = 0;
  });
  lastTransferBody = null;
  lastInvoiceBody = null;
  lastGenerateBody = null;
  lastVoidUrl = '';
  // antd 的 message / Modal.xxx 挂在 body 上，不受 RTL cleanup 管理，不清会串用例
  message.destroy();
  Modal.destroyAll();
});

const setup = () => {
  render(<RewardSettlement />);
  return screen;
};

/** 取某个批次所在行，便于按行断言「这一行允许哪些操作」 */
const rowOf = async (batchNo: string) => {
  const cell = await screen.findByText(batchNo);
  const row = cell.closest('tr') as HTMLElement;
  expect(row).toBeTruthy();
  return row;
};

/**
 * 按标题取静态确认框（Modal.info/error）的正文。
 *
 * 两个坑：① antd 会渲染两份标题（.ant-modal-title 供无障碍 + .ant-modal-confirm-title）；
 * ② 静态 Modal 挂在 body 上，不随 RTL cleanup 消失，前一个用例的框可能还在。
 * 所以取「最后一个匹配标题」所在的那个正文。
 */
const confirmBodyOf = async (title: string | RegExp) => {
  const titles = await screen.findAllByText(title);
  const body = titles[titles.length - 1].closest('.ant-modal-confirm-body') as HTMLElement;
  expect(body).toBeTruthy();
  return body;
};

/** 按标题定位弹窗，避免误取到 DOM 里残留的其它 .ant-modal */
const modalByTitle = async (title: RegExp) =>
  (await screen.findByText(title)).closest('.ant-modal') as HTMLElement;

/**
 * 统计文档里匹配某段文案的提示条数。
 *
 * antd 的 message 依赖动画结束事件才摘节点，jsdom 不派发该事件，
 * 于是 `message.destroy()` 之后旧提示的 DOM 仍可能留着。
 * 所以断言「这次操作新增了一条 XX」，而不是「文档里存在 XX」，否则用例会互相污染。
 */
const countText = (re: RegExp | string) => screen.queryAllByText(re).length;
const countSuccessToast = () => document.querySelectorAll('.ant-message-success').length;

/** 明细抽屉的内容区 */
const drawerBody = async () => {
  await screen.findByText('结算批次明细');
  return document.querySelector('.ant-drawer-body') as HTMLElement;
};

/** 弹窗里的金额输入框（antd InputNumber 的 input 带 role=spinbutton） */
const amountInputIn = (modal: HTMLElement) => within(modal).getByRole('spinbutton');

/** 定位二次确认气泡并从里面点「确定」：页面上可能同时挂着多个 Popconfirm */
const popoverByTitle = async (title: RegExp) =>
  (await screen.findByText(title)).closest('.ant-popover') as HTMLElement;

/** 表单校验错误。同一段文字常同时出现在 Alert 说明里，必须按类名收敛 */
const formErrors = () =>
  Array.from(document.querySelectorAll('.ant-form-item-explain-error')).map((n) => n.textContent);

describe('打赏结算页 · 状态 → 可执行操作映射', () => {
  it('列表按后端语义翻译批次状态，不出现裸状态码', async () => {
    setup();
    await rowOf('SB260901000001');
    ['待确认', '待转账', '已转账', '已收票', '已完成', '已作废'].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
    // 金额以分传输、以元展示：1170 分 = ¥ 11.70
    expect(screen.getAllByText('¥ 11.70').length).toBeGreaterThan(0);
  });

  it('待确认(0)：可确认、可作废，但没有付款入口', async () => {
    setup();
    const row = await rowOf('SB260901000001');
    expect(within(row).getByText('确认')).toBeInTheDocument();
    expect(within(row).getByText('作废')).toBeInTheDocument();
    expect(within(row).queryByText('登记转账')).not.toBeInTheDocument();
    expect(within(row).queryByText('登记发票')).not.toBeInTheDocument();
  });

  it('待转账(1)：只有「登记转账」和「作废」，不能跳过确认直接归档', async () => {
    setup();
    const row = await rowOf('SB260901000002');
    expect(within(row).getByText('登记转账')).toBeInTheDocument();
    expect(within(row).getByText('作废')).toBeInTheDocument();
    expect(within(row).queryByText('确认')).not.toBeInTheDocument();
    expect(within(row).queryByText('登记发票')).not.toBeInTheDocument();
    expect(within(row).queryByText('复核归档')).not.toBeInTheDocument();
  });

  it('【红线】已转账(2)：钱已出去，不允许作废，只能登记发票', async () => {
    setup();
    const row = await rowOf('SB260901000003');
    expect(within(row).getByText('登记发票')).toBeInTheDocument();
    // 已转账批次被作废 = 账面上钱没付、实际付了，财务对不平且无法追回
    expect(within(row).queryByText('作废')).not.toBeInTheDocument();
    expect(within(row).queryByText('登记转账')).not.toBeInTheDocument();
  });

  it('已收票(3) 只能复核归档；已完成(4)/已作废(5) 只剩明细', async () => {
    setup();
    const invoiced = await rowOf('SB260901000004');
    expect(within(invoiced).getByText('复核归档')).toBeInTheDocument();
    expect(within(invoiced).queryByText('作废')).not.toBeInTheDocument();

    const completed = await rowOf('SB260901000005');
    expect(within(completed).queryByText('复核归档')).not.toBeInTheDocument();
    expect(within(completed).queryByText('作废')).not.toBeInTheDocument();

    const voided = await rowOf('SB260901000006');
    expect(within(voided).getByText('明细')).toBeInTheDocument();
    expect(within(voided).queryByText('作废')).not.toBeInTheDocument();
    expect(within(voided).queryByText('登记转账')).not.toBeInTheDocument();
  });
});

describe('打赏结算页 · 登记转账（金额闸门）', () => {
  it('转账金额预填为批次应付总额，改动金额即被拦下且不出网', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('SB260901000002');
    await user.click(within(row).getByText('登记转账'));

    const modal = await modalByTitle(/登记对公转账/);
    // 预填值必须等于 totalFen/100，填错等于财务按错金额打款
    const amountInput = amountInputIn(modal) as HTMLInputElement;
    await waitFor(() => expect(amountInput.value).toBe('11.70'));
    expect(within(modal).getByText('不支持部分转账')).toBeInTheDocument();

    await user.clear(amountInput);
    await user.type(amountInput, '10.00');
    await user.type(within(modal).getByPlaceholderText('请输入网银转账流水号'), 'BANK-TEST-001');
    await user.click(within(modal).getByRole('button', { name: /确认登记/ }));

    // 校验文案会同时出现在 Alert 说明里，按 .ant-form-item-explain-error 收敛
    await waitFor(() => expect(formErrors().join('|')).toMatch(/必须等于批次应付总额 ¥ 11\.70/));
    await waitFor(() => expect(calls.transfer).toBe(0));
  });

  it('金额一致时提交：请求体以「分」为单位并带 yyyy-MM-dd HH:mm:ss 的转账时间', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('SB260901000002');
    await user.click(within(row).getByText('登记转账'));
    const modal = await modalByTitle(/登记对公转账/);
    const amountInput = amountInputIn(modal) as HTMLInputElement;
    await waitFor(() => expect(amountInput.value).toBe('11.70'));

    await user.type(within(modal).getByPlaceholderText('请输入网银转账流水号'), 'BANK-TEST-002');
    await user.click(within(modal).getByRole('button', { name: /确认登记/ }));

    expect(await screen.findByText('转账已登记')).toBeInTheDocument();
    await waitFor(() => expect(calls.transfer).toBe(1));
    // 字段名必须是后端 DTO 的 transferAmountFen；写成 paidFen 会被后端当成 null
    expect(lastTransferBody).toMatchObject({
      batchId: batchByNo('SB260901000002').batchId,
      transferNo: 'BANK-TEST-002',
      transferAmountFen: 1170,
    });
    expect(lastTransferBody.transferTime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('银行流水号必填（一笔转账只能对应一个批次，缺号无法对账）', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('SB260901000002');
    await user.click(within(row).getByText('登记转账'));
    const modal = await modalByTitle(/登记对公转账/);
    await user.click(within(modal).getByRole('button', { name: /确认登记/ }));

    await waitFor(() => expect(formErrors()).toContain('请输入银行流水号'));
    await waitFor(() => expect(calls.transfer).toBe(0));
  });

  it('后端返回 4029（流水号重复）时给出「拆笔」的处置建议', async () => {
    server.use(
      http.post('*/travel18/reward/settlement/transfer', () => {
        // server.use 会遮蔽默认 handler，计数得在这儿自己做
        calls.transfer += 1;
        return ok({ success: false, code: 4029, message: 'transfer_no duplicated' });
      }),
    );
    const user = userEvent.setup();
    setup();
    const row = await rowOf('SB260901000002');
    await user.click(within(row).getByText('登记转账'));
    const modal = await modalByTitle(/登记对公转账/);
    const amountInput = amountInputIn(modal) as HTMLInputElement;
    await waitFor(() => expect(amountInput.value).toBe('11.70'));
    await user.type(within(modal).getByPlaceholderText('请输入网银转账流水号'), 'BANK-DUP');
    await user.click(within(modal).getByRole('button', { name: /确认登记/ }));

    expect(await screen.findByText(/一笔转账只能对应一个批次，合并付款请拆笔/)).toBeInTheDocument();
    await waitFor(() => expect(calls.transfer).toBe(1));
    // 弹窗保持打开，让财务改流水号重提，而不是静默关掉
    expect(await modalByTitle(/登记对公转账/)).toBeTruthy();
    expect(document.body.contains(modal)).toBe(true);
  });
});

describe('打赏结算页 · 登记发票', () => {
  it('发票金额预填为「已付金额」，不是应付总额', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('SB260901000003');
    await user.click(within(row).getByText('登记发票'));

    const modal = await modalByTitle(/登记商家发票/);
    const amountInput = amountInputIn(modal) as HTMLInputElement;
    await waitFor(() => expect(amountInput.value).toBe('11.70'));
    expect(within(modal).getByText('不支持部分开票')).toBeInTheDocument();
    // 已付金额必须回显，财务要拿它跟银行流水核对
    expect(within(modal).getByText('已付金额')).toBeInTheDocument();

    await user.type(within(modal).getByPlaceholderText('请输入发票号码'), 'INV-TEST-001');
    await user.click(within(modal).getByRole('button', { name: /确认登记/ }));

    expect(await screen.findByText('发票已登记')).toBeInTheDocument();
    await waitFor(() => expect(calls.invoice).toBe(1));
    expect(lastInvoiceBody).toMatchObject({ invoiceNo: 'INV-TEST-001', invoiceAmountFen: 1170 });
  });

  it('发票金额与已付金额不一致时被拦下且不出网', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('SB260901000003');
    await user.click(within(row).getByText('登记发票'));
    const modal = await modalByTitle(/登记商家发票/);
    const amountInput = amountInputIn(modal) as HTMLInputElement;
    await waitFor(() => expect(amountInput.value).toBe('11.70'));

    await user.clear(amountInput);
    await user.type(amountInput, '1.00');
    await user.type(within(modal).getByPlaceholderText('请输入发票号码'), 'INV-TEST-002');
    await user.click(within(modal).getByRole('button', { name: /确认登记/ }));

    await waitFor(() => expect(formErrors().join('|')).toMatch(/必须等于已付金额 ¥ 11\.70/));
    await waitFor(() => expect(calls.invoice).toBe(0));
  });
});

describe('打赏结算页 · 确认与 4032（账面不可信）', () => {
  it('确认批次成功走 Popconfirm 二次确认', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('SB260901000001');
    await user.click(within(row).getByText('确认'));
    // 四眼原则的说明必须出现在二次确认里
    const pop = await popoverByTitle(/确认这个批次可以付款？/);
    expect(pop.textContent).toMatch(/生成与确认应由不同的人操作/);
    await user.click(within(pop).getByRole('button', { name: /^(OK|确\s*定)$/ }));

    expect(await screen.findByText('已确认')).toBeInTheDocument();
    await waitFor(() => expect(calls.confirm).toBe(1));
  });

  it('【红线】4032 必须以「禁止继续付款」的强提示出现，不能是普通 message', async () => {
    server.use(
      http.post('*/travel18/reward/settlement/:batchId/confirm', () => {
        // server.use 会遮蔽默认 handler，计数得在这儿自己做
        calls.confirm += 1;
        return ok({ success: false, code: 4032, message: 'batch broken' });
      }),
    );
    const user = userEvent.setup();
    setup();
    const successBefore = countSuccessToast();
    const row = await rowOf('SB260901000001');
    await user.click(within(row).getByText('确认'));
    const pop = await popoverByTitle(/确认这个批次可以付款？/);
    await user.click(within(pop).getByRole('button', { name: /^(OK|确\s*定)$/ }));

    const body = await confirmBodyOf('批次账面已不可信，禁止继续付款');
    // 必须给出下一步动作，否则财务会停在原地反复重试
    expect(body.textContent).toMatch(/必须作废批次重新生成/);
    // 不能顺带弹出「已确认」这类成功提示：一条绿色 message 足以让财务以为付款流程可以继续
    await waitFor(() => expect(calls.confirm).toBe(1));
    expect(countSuccessToast()).toBe(successBefore);
  });

  it('4026（状态不允许）提示状态机单向前进，且已转账不可作废', async () => {
    server.use(
      http.post('*/travel18/reward/settlement/:batchId/complete', () => {
        calls.complete += 1;
        return ok({ success: false, code: 4026, message: 'state invalid' });
      }),
    );
    const user = userEvent.setup();
    setup();
    const row = await rowOf('SB260901000004');
    await user.click(within(row).getByText('复核归档'));
    const pop = await popoverByTitle(/复核并归档这个批次？/);
    await user.click(within(pop).getByRole('button', { name: /^(OK|确\s*定)$/ }));

    expect(await screen.findByText(/已转账批次不可作废，只能下期抵扣或红冲/)).toBeInTheDocument();
    await waitFor(() => expect(calls.complete).toBe(1));
  });

  it('复核归档成功推进到已完成', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('SB260901000004');
    await user.click(within(row).getByText('复核归档'));
    const pop = await popoverByTitle(/复核并归档这个批次？/);
    await user.click(within(pop).getByRole('button', { name: /^(OK|确\s*定)$/ }));

    expect(await screen.findByText('已归档')).toBeInTheDocument();
    await waitFor(() => expect(calls.complete).toBe(1));
  });
});

describe('打赏结算页 · 作废（原因必填）', () => {
  it('原因为空时禁止提交，且请求不出网', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('SB260901000001');
    await user.click(within(row).getByText('作废'));

    const modal = await modalByTitle(/作废批次 · SB260901000001/);
    expect(within(modal).getByText(/作废会把批次内流水还原为待结算/)).toBeInTheDocument();
    // 作废是不可逆的资金操作，必须把「同账期不允许重建」讲清楚
    expect(modal.textContent).toMatch(/作废后同一账期不允许重建批次/);
    await user.click(within(modal).getByRole('button', { name: /确认作废/ }));

    expect(await screen.findByText(/作废原因必填/)).toBeInTheDocument();
    await waitFor(() => expect(calls.void).toBe(0));
  });

  it('填写原因后提交，reason 以查询参数带给后端', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('SB260901000001');
    await user.click(within(row).getByText('作废'));
    const modal = await modalByTitle(/作废批次 · SB260901000001/);
    const reasonInput = within(modal).getByPlaceholderText(
      /必填，会永久记录在批次行上/,
    ) as HTMLTextAreaElement;
    await user.type(reasonInput, '账期区间选错，重新生成');
    await user.click(within(modal).getByRole('button', { name: /确认作废/ }));

    expect(await screen.findByText('批次已作废')).toBeInTheDocument();
    await waitFor(() => expect(calls.void).toBe(1));
    expect(decodeURIComponent(lastVoidUrl)).toContain('reason=账期区间选错，重新生成');
  });

  it('后端返回 4026 时说明「已转账批次不可作废」', async () => {
    server.use(
      http.post('*/travel18/reward/settlement/:batchId/void', () => {
        calls.void += 1;
        return ok({ success: false, code: 4026, message: 'state invalid' });
      }),
    );
    const user = userEvent.setup();
    setup();
    const row = await rowOf('SB260901000002');
    await user.click(within(row).getByText('作废'));
    const before = countText(/已转账批次不可作废，只能下期抵扣或红冲/);
    const modal = await modalByTitle(/作废批次 · SB260901000002/);
    await user.type(
      within(modal).getByPlaceholderText(/必填，会永久记录在批次行上/) as HTMLTextAreaElement,
      '试作废已确认批次',
    );
    await user.click(within(modal).getByRole('button', { name: /确认作废/ }));

    await waitFor(() =>
      expect(countText(/已转账批次不可作废，只能下期抵扣或红冲/)).toBeGreaterThan(before),
    );
    await waitFor(() => expect(calls.void).toBe(1));
  });
});

describe('打赏结算页 · 生成批次（先预览后生成）', () => {
  const openGen = async (user: ReturnType<typeof userEvent.setup>) => {
    await screen.findByText('SB260901000001');
    await user.click(screen.getByRole('button', { name: /生成批次/ }));
    const modal = await modalByTitle(/生成结算批次/);
    // 开宗明义：生成批次只冻结账面，不会付钱
    expect(modal.textContent).toMatch(/生成批次只冻结账面，不会付钱/);
    return modal;
  };

  const fillGenForm = async (user: ReturnType<typeof userEvent.setup>, modal: HTMLElement) => {
    await user.type(within(modal).getByPlaceholderText('请输入商户ID') as HTMLInputElement, '12');
    // 注意：占位符那个 span 自带 pointer-events:none，要点 role=combobox 的输入框
    await user.click(within(modal).getByRole('combobox'));
    await user.click(await screen.findByText('安卓系（T+3 到账）'));
    // 账期用 RangePicker：后端 @JsonFormat(yyyy-MM-dd)，页面负责把 Date 转成字符串
    const rangeInputs = Array.from(modal.querySelectorAll('.ant-picker input'));
    expect(rangeInputs).toHaveLength(2);
    await user.click(rangeInputs[0] as HTMLInputElement);
    await user.type(rangeInputs[0] as HTMLInputElement, '2026-08-01');
    await user.keyboard('{Enter}');
    await user.type(rangeInputs[1] as HTMLInputElement, '2026-08-31');
    await user.keyboard('{Enter}');
  };

  it('未预览时「确认生成」必须禁用（金额以抢占后的真实合计为准）', async () => {
    const user = userEvent.setup();
    setup();
    const modal = await openGen(user);
    // 金额以「抢占流水之后的真实合计」为准，没预览就生成等于盲付
    expect(within(modal).getByRole('button', { name: /确认生成/ })).toBeDisabled();
    await waitFor(() => expect(calls.generate).toBe(0));
  });

  it('表单没填完时预览不出网，并给出必填提示', async () => {
    const user = userEvent.setup();
    setup();
    const modal = await openGen(user);
    await user.click(within(modal).getByRole('button', { name: /预\s*览/ }));

    // 「请选择终端分组」既是占位符又是必填提示，只认表单错误那一处
    await waitFor(() =>
      expect(formErrors()).toEqual(
        expect.arrayContaining(['请输入商户ID', '请选择终端分组', '请选择账期起止日']),
      ),
    );
    await waitFor(() => expect(calls.preview).toBe(0));
  });

  it('预览 settleable=false（4023 同账期已有批次）时保持禁用并说明处置方式', async () => {
    server.use(
      http.post('*/travel18/reward/settlement/preview', () => {
        calls.preview += 1;
        return ok({ settleable: false, code: 4023, reason: 'batch exists' });
      }),
    );
    const user = userEvent.setup();
    setup();
    const modal = await openGen(user);
    await fillGenForm(user, modal);
    await user.click(within(modal).getByRole('button', { name: /预\s*览/ }));

    expect(await within(modal).findByText('不可生成')).toBeInTheDocument();
    expect(modal.textContent).toMatch(/该商户该终端该账期已存在批次/);
    expect(within(modal).getByRole('button', { name: /确认生成/ })).toBeDisabled();
    await waitFor(() => expect(calls.preview).toBe(1));
    await waitFor(() => expect(calls.generate).toBe(0));
  });

  it('预览 settleable=true 后放行，账期以 yyyy-MM-dd 字符串提交', async () => {
    const user = userEvent.setup();
    setup();
    const modal = await openGen(user);
    await fillGenForm(user, modal);
    await user.click(within(modal).getByRole('button', { name: /预\s*览/ }));

    expect(await within(modal).findByText('可以生成批次')).toBeInTheDocument();
    // 开户行/账号回显是给财务核对的，账号只能后 4 位
    expect(within(modal).getByText('招商银行杭州分行')).toBeInTheDocument();
    expect(within(modal).getByText(/\*\*\*\*6789/)).toBeInTheDocument();

    const genBtn = within(modal).getByRole('button', { name: /确认生成/ });
    await waitFor(() => expect(genBtn).toBeEnabled());
    await user.click(genBtn);

    expect(await screen.findByText('批次已生成')).toBeInTheDocument();
    await waitFor(() => expect(calls.generate).toBe(1));
    expect(lastGenerateBody).toMatchObject({
      merchantId: 12,
      terminalGroup: 'android',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
    });
  });

  it('生成时后端返回 4025（低于起结金额）要把原因说清楚', async () => {
    server.use(
      http.post('*/travel18/reward/settlement/generate', () => {
        calls.generate += 1;
        return ok({ success: false, code: 4025, message: 'below minimum' });
      }),
    );
    const user = userEvent.setup();
    setup();
    const modal = await openGen(user);
    await fillGenForm(user, modal);
    await user.click(within(modal).getByRole('button', { name: /预\s*览/ }));
    await within(modal).findByText('可以生成批次');
    await user.click(within(modal).getByRole('button', { name: /确认生成/ }));

    expect(await screen.findByText(/低于起结金额，留到下期累积后再生成/)).toBeInTheDocument();
    await waitFor(() => expect(calls.generate).toBe(1));
  });
});

describe('打赏结算页 · 明细抽屉与手工月结', () => {
  it('明细抽屉展示批次快照与批次内应付流水', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('SB260901000003');
    await user.click(within(row).getByText('明细'));

    const drawer = await drawerBody();
    expect(await within(drawer).findByText(/批次内应付流水（2 笔）/)).toBeInTheDocument();
    expect(within(drawer).getByText('BANK20260901001')).toBeInTheDocument();
    expect(within(drawer).getByText('P710001')).toBeInTheDocument();
    expect(within(drawer).getByText('R260806100002TEST')).toBeInTheDocument();
    // 应付金额以「分」传输：390 分 = ¥ 3.90
    expect(within(drawer).getByText('¥ 3.90')).toBeInTheDocument();
    // 只有已作废批次才展示「作废人」，未作废批次不应出现
    expect(within(drawer).queryByText('作废人')).not.toBeInTheDocument();
  });

  it('已作废批次的明细里显示作废人/时间/原因（资金批次必须可追溯）', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('SB260901000006');
    await user.click(within(row).getByText('明细'));

    const drawer = await drawerBody();
    expect(await within(drawer).findByText('账期填错，重新生成')).toBeInTheDocument();
    expect(within(drawer).getByText('作废人')).toBeInTheDocument();
    expect(within(drawer).getByText('已作废')).toBeInTheDocument();
  });

  it('手工月结回显汇总（只改账面不付钱）', async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText('SB260901000001');
    await user.click(screen.getByRole('button', { name: /手工月结/ }));
    const pop = await popoverByTitle(/手工触发一轮月结？/);
    // 必须讲清楚：月结只生成待确认批次，钱要人工走转账登记
    expect(pop.textContent).toMatch(/只改账面不付钱/);
    expect(pop.textContent).toMatch(/安卓与 iOS 分开/);
    await user.click(within(pop).getByRole('button', { name: /^(OK|确\s*定)$/ }));

    const body = await confirmBodyOf('月结执行结果');
    expect(body.textContent).toMatch(/生成批次数/);
    expect(body.textContent).toMatch(/跳过（低于起结金额）/);
    await waitFor(() => expect(calls.monthly).toBe(1));
  });
});
