/**
 * 打赏推送日志页测试。
 *
 * 这是个只读排障页，能测的不是「渲染出来了」，而是三条会误导人的语义：
 *   - **「幂等跳过」必须显示成正常现象**，不能显示成失败：微信对同一条推送最多重推 15 次，
 *     第二次条件更新影响 0 行。显示成失败会让运营以为账没记上，进而去找「重放」按钮
 *   - **页面不得出现任何写操作**（尤其「重放」）：重放一条推送等于把记账再跑一遍，
 *     而点重放的人并不知道这条当初是成功、幂等跳过还是验签失败
 *   - **验签失败的报文来源不可信**，详情里必须显式告警「不得据此补账」
 * 另外锁两条数据暴露边界：列表不返回报文全文（后端已裁，前端不得自己伪造），
 * openid 在列表页脱敏。
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test-utils';
import { App as AntdApp, message, Modal } from 'antd';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { AntdStaticProvider } from '@/components/AntdStaticProvider';
// 复用 setupTests 里已 listen 的全局 server，不要再 setupServer（会双重监听）
import { server } from '../../../../mocks/server';
import RewardNotifyLog from '../index';

const ok = (data?: unknown, msg = '操作成功') => HttpResponse.json({ code: 200, msg, data });
const page = (rows: unknown[], total = rows.length) =>
  HttpResponse.json({ code: 200, msg: 'success', rows, total });

const RAW_BODY =
  '{"OpenId":"oABC1234567890zzzz","Env":0,"WeChatPayInfo":{"MchOrderNo":"4200002026202609281234","OutTradeNo":"RW202609280001"}}';
const RESPONSE_BODY = '{"ErrCode":0,"ErrMsg":"success"}';

/**
 * 列表报文与后端一致：rawBody / responseBody 一律为 null
 * （TravelRewardNotifyLogServiceImpl 刻意裁掉，避免一页几十 KB 且成批暴露 openid 与金额）。
 */
const logs = [
  {
    logId: 3,
    eventType: 'xpay_goods_deliver_notify',
    outTradeNo: 'RW202609280003',
    openid: 'oABC1234567890zzzz',
    msgFormat: 'J',
    rawBody: null,
    responseBody: null,
    verifyResult: '1',
    processResult: '1',
    errMsg: null,
    createTime: '2026-09-28 10:00:03',
  },
  {
    logId: 2,
    eventType: 'xpay_goods_deliver_notify',
    outTradeNo: 'RW202609280003',
    openid: 'oABC1234567890zzzz',
    msgFormat: 'J',
    rawBody: null,
    responseBody: null,
    verifyResult: '1',
    processResult: '2', // 幂等跳过
    errMsg: null,
    createTime: '2026-09-28 10:00:02',
  },
  {
    logId: 1,
    eventType: 'xpay_subscribe_ios_refund_query_notify',
    outTradeNo: null, // 验签失败，解析不出订单号
    openid: null,
    msgFormat: 'X',
    rawBody: null,
    responseBody: null,
    verifyResult: '0',
    processResult: '0',
    errMsg: '验签失败：signature 与本地计算不一致',
    createTime: '2026-09-28 10:00:01',
  },
];

let detailRequestedLogId: number | null = null;

const handlers = [
  http.get('*/travel18/reward/notify/list', () => page(logs)),
  http.get('*/travel18/reward/notify/:logId', ({ params }) => {
    detailRequestedLogId = Number(params.logId);
    const row = logs.find((l) => l.logId === Number(params.logId));
    // 详情才给全文，这是排障的唯一依据
    return ok({ ...row, rawBody: RAW_BODY, responseBody: RESPONSE_BODY });
  }),
];

beforeEach(() => {
  detailRequestedLogId = null;
  server.use(...handlers);
});

afterEach(() => {
  message.destroy();
  Modal.destroyAll();
});

/**
 * 必须按生产结构套 antd <App> + AntdStaticProvider：
 * request.ts 的拦截器在顶层 code≠200 时会先调 messageInstance.error(...)，
 * 而 messageInstance 由 AntdStaticProvider 注册；不套的话它是 undefined，
 * 拦截器先抛 TypeError，页面 catch 里读到的 e.code 恒为 undefined（见设计文档缺陷 29）。
 */
const setup = () =>
  render(
    <AntdApp>
      <AntdStaticProvider>
        <RewardNotifyLog />
      </AntdStaticProvider>
    </AntdApp>,
  );

/**
 * 按文本定位所在行，取**第一条**。
 * 用 findAllByText 而不是 findByText：同一条推送被微信重推时，
 * 两行的业务订单号完全相同（这正是幂等跳过要验证的场景），findByText 会因「找到多个」直接抛错。
 */
const rowOf = async (text: string) => {
  const cells = await screen.findAllByText(text);
  const row = cells[0].closest('tr');
  if (!row) throw new Error(`未找到 ${text} 所在行`);
  return row as HTMLElement;
};

/** 行内按钮（带图标的按钮可访问名会拼上图标 aria-label，统一用正则） */
const buttonIn = (row: HTMLElement, name: string | RegExp) =>
  within(row).getByRole('button', { name: typeof name === 'string' ? new RegExp(name) : name });

const tagOf = (text: string) => screen.getAllByText(text)[0].closest('.ant-tag') as HTMLElement;

describe('推送日志页 · 状态语义', () => {
  it('事件类型/验签/处理结果按枚举翻译成中文，不出现裸的微信常量', async () => {
    setup();
    await rowOf('RW202609280003');

    expect(screen.getAllByText('道具发货（支付成功）').length).toBeGreaterThan(0);
    expect(screen.getAllByText('iOS 退款问询').length).toBeGreaterThan(0);
    expect(screen.getAllByText('验签成功').length).toBeGreaterThan(0);
    expect(screen.getAllByText('验签失败').length).toBeGreaterThan(0);
    expect(screen.getAllByText('处理成功').length).toBeGreaterThan(0);
    // 微信的原始事件常量只作为 Tooltip/详情补充，不能当主文案（运营看不懂）
    expect(screen.queryByText('xpay_goods_deliver_notify')).toBeNull();
    expect(screen.queryByText('xpay_subscribe_ios_refund_query_notify')).toBeNull();
  });

  it('「幂等跳过」显示为中性色而不是错误色，并说明这是正常现象', async () => {
    setup();
    await rowOf('RW202609280003');

    const tag = tagOf('幂等跳过');
    // 显示成红色「失败」会让运营以为账没记上，进而去找根本不存在的「重放」按钮
    expect(tag.className).not.toContain('ant-tag-error');
    expect(tag.className).toContain('ant-tag-default');
    // 错误色只该出现在真正失败的那条上
    expect(tagOf('处理失败').className).toContain('ant-tag-error');
  });

  it('验签失败且解析不出订单号时，显示「未定位到订单」而不是空白', async () => {
    setup();
    await rowOf('RW202609280003');
    expect(screen.getAllByText('未定位到订单').length).toBeGreaterThan(0);
    // 错误摘要必须在列表就能看到：工单第一步是判断「微信推没推、成没成功」
    expect(screen.getAllByText('验签失败：signature 与本地计算不一致').length).toBeGreaterThan(0);
  });

  it('openid 在列表页脱敏，完整值不出现在列表 DOM', async () => {
    setup();
    await rowOf('RW202609280003');

    // 日志页会被客服/运营/开发多方翻看，openid 是用户在本小程序内的唯一标识
    expect(screen.queryByText('oABC1234567890zzzz')).toBeNull();
    expect(screen.getAllByText('oABC12****zzzz').length).toBeGreaterThan(0);
  });
});

describe('推送日志页 · 只读边界', () => {
  it('页面明示只读，且不出现任何「重放/重推/补账」类按钮', async () => {
    setup();
    await rowOf('RW202609280003');

    expect(screen.getByText(/本页只读：没有「重放推送」按钮/)).toBeInTheDocument();
    // 重放一条推送等于把记账再跑一遍；点重放的人并不知道这条当初是成功、幂等跳过还是验签失败
    expect(screen.queryByRole('button', { name: /重放|重推|重新处理|补账/ })).toBeNull();
    // 说明文案里会出现「重放」二字（解释为什么没有这个按钮），
    // 但它绝不能出现在任何可点击元素上
    expect(
      Array.from(document.querySelectorAll('button')).filter((b) =>
        /重放|重推|重新处理|补账/.test(b.textContent ?? ''),
      ),
    ).toHaveLength(0);
    // 行内只有「详情」一个动作。
    // 注意 Typography.Text copyable 会在订单号单元格里额外渲染一个复制按钮，
    // 它不是行操作，断言时要排掉，否则「只有详情」这条会假失败
    const row = await rowOf('RW202609280003');
    const actionButtons = within(row)
      .getAllByRole('button')
      .filter((b) => !b.className.includes('ant-typography-copy'));
    expect(actionButtons).toHaveLength(1);
    expect(actionButtons[0].textContent).toContain('详情');
  });

  it('列表不含报文全文时页面正常渲染，报文只在详情接口取', async () => {
    setup();
    await rowOf('RW202609280003');
    // 列表接口把 rawBody 裁成 null，页面上不应出现任何报文片段
    expect(screen.queryByText(/MchOrderNo/)).toBeNull();
    expect(detailRequestedLogId).toBeNull();
  });
});

describe('推送日志页 · 详情', () => {
  it('验签失败的日志：详情给出「来源不可信、不得据此补账」的强告警', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('RW202609280003');
    // 第 3 行是验签失败那条（logId=1）
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    const failedRow = rows.find((r) =>
      r.textContent?.includes('验签失败：signature'),
    ) as HTMLElement;
    expect(failedRow).toBeTruthy();
    await user.click(buttonIn(failedRow, '详情'));

    expect(await screen.findByText('这条推送验签失败：来源不可信')).toBeInTheDocument();
    expect(
      screen.getByText(/都不得据此补账或改订单状态|只能以微信侧 query_order 的结果为准/),
    ).toBeInTheDocument();
    expect(row).toBeTruthy();
    await waitFor(() => expect(detailRequestedLogId).toBe(1));
  });

  it('详情展示报文全文与应答体（排障唯一依据，不得裁剪）', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('RW202609280003');
    await user.click(buttonIn(row, '详情'));

    await waitFor(() => expect(detailRequestedLogId).toBe(3));
    // 安全模式下 raw_body 是解密后的明文，JSON 会被美化成多行，故按关键字段断言
    expect(await screen.findByText(/4200002026202609281234/)).toBeInTheDocument();
    expect(screen.getByText(/"ErrMsg": "success"/)).toBeInTheDocument();
    // 详情里 openid 给全量（可复制），与列表页脱敏是两套刻意的口径
    expect(screen.getAllByText('oABC1234567890zzzz').length).toBeGreaterThan(0);
  });

  it('幂等跳过的日志：详情说明「账已经记过了，不是失败」', async () => {
    const user = userEvent.setup();
    setup();
    await rowOf('RW202609280003');
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    const skippedRow = rows.find((r) => r.textContent?.includes('幂等跳过')) as HTMLElement;
    expect(skippedRow).toBeTruthy();
    await user.click(buttonIn(skippedRow, '详情'));

    expect(await screen.findByText('幂等跳过：账已经记过了，不是失败')).toBeInTheDocument();
    expect(screen.getByText(/同一条推送被微信重推（最多 15 次）/)).toBeInTheDocument();
  });

  it('处理失败的日志：详情提示微信会继续重推，并指向查单补偿', async () => {
    const user = userEvent.setup();
    setup();
    await rowOf('RW202609280003');
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    const failedRow = rows.find((r) =>
      r.textContent?.includes('验签失败：signature'),
    ) as HTMLElement;
    await user.click(buttonIn(failedRow, '详情'));

    expect(await screen.findByText('处理失败：微信会继续重推')).toBeInTheDocument();
    expect(screen.getByText(/由查单补偿任务按微信侧状态推进/)).toBeInTheDocument();
  });
});
