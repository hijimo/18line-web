/**
 * 打赏参数配置页测试。
 *
 * 这个页面存在的唯一理由是：**原生「参数设置」显示的是库里的值，而运行时用的可能不是它**。
 * 所以这里测的不是「渲染出来了」，而是几条一旦失守就会造成真实资金后果的红线：
 *   - 「运行时生效值」必须与库值分开展示，且**两种异常语义不能混为一谈**：
 *     越界回退默认（clamped）与越界照用不误（unclamped，费率类）是完全不同的两件事，
 *     后者意味着页面写着 78%、系统在用 150%（缺陷 57）。
 *   - 保存**只提交 diff**。把 23 个参数全量提交，等于把别人刚改的值用本页的旧快照盖回去。
 *   - 关键参数（上线闸门）改动**必须填理由**，前端先拦一道，与后端 4093 双保险。
 *   - **空值必须被拦住**：`SysConfigMapper.updateConfig` 的 XML 对 config_value 有
 *     `!= ''` 判断，空串会静默跳过该列，接口返回成功而库里纹丝不动（缺陷 55）。
 *   - 请求体里**绝不能带 remark**：那一列存的是种子脚本写的参数说明文档，
 *     回写一次就把 23 条文档全冲掉。
 *   - 4090~4096 全部 ≥500，会被 errorHandler 改写成「服务器错误」（缺陷 49），
 *     页面必须自己按 e.code 分派，否则用户看到的是一句毫无信息量的话。
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test-utils';
import { App as AntdApp, message } from 'antd';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { AntdStaticProvider } from '@/components/AntdStaticProvider';
// 复用 setupTests 里已 listen 的全局 server，不要再 setupServer（会双重监听）
import { server } from '../../../../mocks/server';
import RewardConfig from '../index';

const ok = (data?: unknown, msg = '操作成功') => HttpResponse.json({ code: 200, msg, data });
const bizError = (code: number, msg: string) => HttpResponse.json({ code, msg });

// ------------------------------------------------------------------
// 造数：六个参数覆盖全部值类型与全部异常语义
// ------------------------------------------------------------------

const base = {
  groupCode: 'rate',
  groupLabel: '费率与分账',
  risk: 'normal',
  effectScope: 'immediate',
  effectLabel: '立即生效（下一次读取即用新值）',
  missing: false,
  invalid: false,
  outOfRange: false,
  effectiveDifferent: false,
  updateBy: 'admin',
  updateTime: '2026-09-20 10:00:00',
  remark: '种子脚本写入的参数说明文档',
};

/** 关键闸门（bool，正常） */
const ITEM_GATE = {
  ...base,
  configKey: 'reward.enabled',
  configName: '打赏-功能总开关',
  configId: 100,
  groupCode: 'gate',
  groupLabel: '上线闸门',
  valueType: 'bool',
  currentValue: '0',
  effectiveValue: '0',
  defaultValue: '0',
  risk: 'critical',
  hint: '总开关。0→1 等于打开真实资金通道',
};

/** 分成率（decimal，正常） */
const ITEM_SHARE_ANDROID = {
  ...base,
  configKey: 'reward.share.rate.android',
  configName: '打赏-安卓端商家分成率(%)',
  configId: 102,
  valueType: 'decimal',
  unit: '%',
  currentValue: '78',
  effectiveValue: '78',
  defaultValue: '78',
  minValue: '0',
  maxValue: '100',
  risk: 'money',
  effectScope: 'newOrderOnly',
  effectLabel: '仅影响新订单：历史订单已存费率快照，改动不追溯',
};

/**
 * iOS 渠道费率（decimal，**越界且照用**）。
 *
 * decimal 的 runtimeClamped=false：150 是合法数字，各 Service 的 cfgDecimal 只在
 * 「解析不出数字」时回退默认值，对业务上荒谬的取值照用不误。
 * 于是 effectiveValue == currentValue == "150"，effectiveDifferent=false。
 * 这是全页最危险的一行。
 */
const ITEM_FEE_IOS_UNCLAMPED = {
  ...base,
  configKey: 'reward.channel.fee.rate.ios',
  configName: '打赏-iOS端渠道费率(%)',
  configId: 106,
  valueType: 'decimal',
  unit: '%',
  currentValue: '150',
  effectiveValue: '150',
  effectiveDifferent: false,
  defaultValue: '12',
  minValue: '0',
  maxValue: '100',
  outOfRange: true,
  risk: 'money',
  effectScope: 'newOrderOnly',
  effectLabel: '仅影响新订单',
};

/** 退款轮询次数（int，**越界回退默认**）：effectiveDifferent=true */
const ITEM_POLL_MAX_CLAMPED = {
  ...base,
  configKey: 'reward.refund.poll.max.attempts',
  configName: '打赏-退款轮询最大次数',
  configId: 117,
  groupCode: 'refund',
  groupLabel: '退款',
  valueType: 'int',
  unit: '次',
  currentValue: '99999',
  effectiveValue: '288',
  effectiveDifferent: true,
  defaultValue: '288',
  minValue: '1',
  maxValue: '100000',
  outOfRange: true,
  effectScope: 'nextRun',
  effectLabel: '下一轮定时任务执行时生效',
};

/** 结算起结金额（long，**库里没有这条**） */
const ITEM_MISSING = {
  ...base,
  configKey: 'reward.settle.min.amount.fen',
  configName: '打赏-结算起结金额(分)',
  configId: null,
  groupCode: 'settle',
  groupLabel: '商家结算',
  valueType: 'long',
  unit: '分',
  currentValue: null,
  effectiveValue: '10000',
  effectiveDifferent: false,
  defaultValue: '10000',
  minValue: '0',
  maxValue: '1000000',
  missing: true,
};

/** 退款终态查询目标（enum） */
const ITEM_ENUM = {
  ...base,
  configKey: 'reward.refund.query.target',
  configName: '打赏-退款终态查询目标',
  configId: 118,
  groupCode: 'refund',
  groupLabel: '退款',
  valueType: 'enum',
  currentValue: 'refund_order',
  effectiveValue: 'refund_order',
  defaultValue: 'refund_order',
  options: ['refund_order', 'pay_order'],
  effectScope: 'nextRun',
  effectLabel: '下一轮定时任务执行时生效',
};

const ALL_ITEMS = [
  ITEM_GATE,
  ITEM_SHARE_ANDROID,
  ITEM_FEE_IOS_UNCLAMPED,
  ITEM_POLL_MAX_CLAMPED,
  ITEM_MISSING,
  ITEM_ENUM,
];

const baseCheck = {
  rewardEnabled: false,
  refundEnabled: false,
  settleEnabled: false,
  sandbox: true,
  xpayEnv: 1,
  envConsistent: true,
  shareRateAndroid: '78',
  shareRateIos: '78',
  commissionRate: '10',
  channelFeeAndroid: '1',
  channelFeeIos: '12',
  androidShareRateCeiling: '99',
  iosShareRateCeiling: '88',
  dangerCount: 0,
  warnCount: 0,
  infoCount: 0,
  issues: [],
  unsafeMerchants: [],
  unsafeLineCount: 0,
};

/** 一档安卓 + 一档 iOS，其中 iOS 那档被资损闸门拒掉 */
const previewData = {
  shareRateAndroid: '78',
  shareRateIos: '95',
  commissionRate: '10',
  channelFeeAndroid: '1',
  channelFeeIos: '12',
  overridden: true,
  blockedCount: 1,
  minPlatformProfitFen: null,
  rows: [
    {
      tierId: 1,
      tierCode: 'tier_100',
      tierName: '鼓励一下',
      env: '0',
      isTest: '0',
      priceFen: 100,
      platform: 'android',
      channelFeeRate: '1',
      channelFeeFen: 1,
      platformNetFen: 99,
      shareRate: '78',
      shareFen: 78,
      commissionFen: 10,
      platformProfitFen: 11,
      blocked: false,
    },
    {
      tierId: 1,
      tierCode: 'tier_100',
      tierName: '鼓励一下',
      env: '0',
      isTest: '0',
      priceFen: 100,
      platform: 'ios',
      channelFeeRate: '12',
      channelFeeFen: 12,
      platformNetFen: 88,
      shareRate: '95',
      shareFen: 95,
      commissionFen: 10,
      platformProfitFen: -17,
      blocked: true,
    },
  ],
};

// ------------------------------------------------------------------
// msw
// ------------------------------------------------------------------

const calls = { list: 0, check: 0, preview: 0, update: 0, refresh: 0 };

/**
 * ⚠️ 交给 msw 的响应必须「一次一个」（缺陷 65）。
 *
 * 下面 4 个变量存的是 ok()/bizError() 的返回值，也就是**同一个 Response 实例**，
 * 而一个用例内页面经常请求同一接口两次（刷缓存后要重取 list + check、保存失败后重试等）。
 * msw 每次派发都会先对拿到的 Response 调 .clone() 再读 body，第二次就撞上
 * `TypeError: Response.clone: Body has already been consumed`，
 * 并以 unhandled rejection 的形式冒到 vitest 顶层——
 * 用例本身 131 条全绿，进程退出码却是 1，CI 上表现为「全绿但失败」，极难归因。
 *
 * 所以处理器一律交出克隆体：原始响应的 body 永远不被消费，可以被克隆任意多次。
 */
const fresh = (r: unknown) => (r as Response).clone();

let listResponse: unknown = ok(ALL_ITEMS);
let checkResponse: unknown = ok(baseCheck);
let updateResponse: unknown = ok(1, '已保存 1 项参数，参数缓存已刷新（运行时立即生效）');
let previewResponse: unknown = ok(previewData);
let lastUpdateBody: any = null;
let lastPreviewBody: any = null;

const handlers = [
  http.get('*/travel18/reward/config/list', () => {
    calls.list += 1;
    return fresh(listResponse) as any;
  }),
  http.get('*/travel18/reward/config/check', () => {
    calls.check += 1;
    return fresh(checkResponse) as any;
  }),
  http.post('*/travel18/reward/config/preview', async ({ request }) => {
    calls.preview += 1;
    lastPreviewBody = await request.json();
    return fresh(previewResponse) as any;
  }),
  http.put('*/travel18/reward/config', async ({ request }) => {
    calls.update += 1;
    lastUpdateBody = await request.json();
    return fresh(updateResponse) as any;
  }),
  http.post('*/travel18/reward/config/refresh-cache', () => {
    calls.refresh += 1;
    return ok(23, '参数缓存已按数据库重新加载，共 23 项');
  }),
];

beforeEach(() => {
  // ⚠️ 必须在这里清一次残留提示：静态 message 的 DOM 挂在 document.body 上，
  // RTL 的 cleanup 只清自己创建的容器，于是上一个用例弹的提示会留到下一个用例。
  // 但**只能删 .ant-message-notice，绝不能删 .ant-message 容器本身**——
  // 那是 antd 静态 message 的挂载点，删掉之后页面里所有 message.xxx() 都不再显示，
  // 表现为「拦截器那句弹出来了、页面自己那句没有」，非常难归因。
  message.destroy();
  document.querySelectorAll('.ant-message-notice').forEach((n) => n.remove());
  calls.list = 0;
  calls.check = 0;
  calls.preview = 0;
  calls.update = 0;
  calls.refresh = 0;
  listResponse = ok(ALL_ITEMS);
  checkResponse = ok(baseCheck);
  updateResponse = ok(1, '已保存 1 项参数，参数缓存已刷新（运行时立即生效）');
  previewResponse = ok(previewData);
  lastUpdateBody = null;
  lastPreviewBody = null;
  // ⚠️ 不要 vi.restoreAllMocks()：setupTests 用 Object.defineProperty 把
  // window.matchMedia 定义成 vi.fn()，还原它会弄坏 antd Grid，整个表格渲染不出来
  server.use(...handlers);
});

afterEach(() => {
  message.destroy();
});

/**
 * 必须按生产结构套 antd <App> + AntdStaticProvider：
 * request.ts 的拦截器在顶层 code≠200 时会先调 messageInstance.error(...)，
 * 而 messageInstance 由 AntdStaticProvider 注册；不套的话它是 undefined，
 * 拦截器先抛 TypeError，页面 catch 里读到的 e.code 恒为 undefined（缺陷 29）。
 */
const setup = () =>
  render(
    <AntdApp>
      <AntdStaticProvider>
        <RewardConfig />
      </AntdStaticProvider>
    </AntdApp>,
  );

/**
 * 断言出现过某条全局提示。
 *
 * 刻意不按「最后一条」取值：拦截器与页面都会往 message 里写，
 * 顺序取决于各自 await 的时机，取最后一条在并发下会偶发拿到拦截器那句。
 */
const expectMessage = async (substr: string) =>
  waitFor(() => {
    const all = Array.from(document.querySelectorAll('.ant-message-notice'));
    const hit = all.find((n) => (n.textContent ?? '').includes(substr));
    if (!hit) {
      throw new Error(
        `没有找到包含「${substr}」的提示，实际有：${all.map((n) => n.textContent).join(' / ') || '（无）'}`,
      );
    }
    return hit.textContent ?? '';
  });

/**
 * 按名字找按钮。
 * ⚠️ antd 会给「恰好两个汉字」的按钮自动插空格（「保 存」），正则必须允许空白。
 */
const button = (name: string) =>
  screen.getByRole('button', { name: new RegExp(name.split('').join('\\s*')) });

const rowOf = async (text: string) => {
  const cell = await screen.findByText(text);
  const row = cell.closest('tr');
  if (!row) throw new Error(`未找到 ${text} 所在行`);
  return row as HTMLElement;
};

/**
 * 打开保存确认弹框。
 *
 * ⚠️ 不能 findByText('确认保存')：弹框标题和确认按钮是同一个词，会撞「找到多个元素」。
 * 直接等 .ant-modal-content 出现，再从这里往下取。
 */
const openSaveModal = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(button('保存改动'));
  await waitFor(() => {
    if (!document.querySelector('.ant-modal-content')) throw new Error('保存弹框没打开');
  });
  return document.querySelector('.ant-modal-content') as HTMLElement;
};

/** 在保存弹框里点「确认保存」 */
const confirmSave = async (user: ReturnType<typeof userEvent.setup>) => {
  const modal = document.querySelector('.ant-modal-content') as HTMLElement;
  await user.click(within(modal).getByRole('button', { name: /确\s*认\s*保\s*存/ }));
};

// ==================================================================
// 列表：库值 vs 运行时生效值
// ==================================================================

describe('打赏参数配置页', () => {
  it('按登记表分组渲染，闸门组排在最前', async () => {
    setup();
    await screen.findByText('打赏-功能总开关');
    expect(screen.getByText('上线闸门')).toBeTruthy();
    expect(screen.getByText('费率与分账')).toBeTruthy();
    expect(screen.getByText('商家结算')).toBeTruthy();
    // 白名单说明：让运维知道这页改不了别的参数
    expect(screen.getByText(/白名单外的参数本页改不了/)).toBeTruthy();

    const gateIdx = screen
      .getByText('上线闸门')
      .compareDocumentPosition(screen.getByText('费率与分账'));
    // DOCUMENT_POSITION_FOLLOWING(4) 表示后者在文档流中更靠后
    expect(gateIdx & 4).toBeTruthy();
  });

  it('越界但回退默认的参数：显示生效值并标明「已回退默认」，不让人误以为 99999 在跑', async () => {
    setup();
    const row = await rowOf('打赏-退款轮询最大次数');
    expect(within(row).getByText('越界')).toBeTruthy();
    expect(within(row).getByText(/已回退默认/)).toBeTruthy();
    // 生效值必须是默认的 288，而不是库里的 99999
    expect(within(row).getByText(/288（已回退默认）/)).toBeTruthy();
  });

  it('费率越界且未钳制：必须标成「正在使用异常值」——这是与上一条完全不同的语义', async () => {
    setup();
    const row = await rowOf('打赏-iOS端渠道费率(%)');
    // 库值 150 就是运行时在用的值，页面绝不能显示成「已回退默认 12」
    expect(within(row).getByText(/150（正在使用异常值）/)).toBeTruthy();
    expect(within(row).queryByText(/已回退默认/)).toBeNull();
    // 整行标红
    expect((row as HTMLElement).style.background).toContain('255, 241, 240');
  });

  it('库里没有的参数显示「未初始化」并给出运行时正在用的默认值', async () => {
    setup();
    const row = await rowOf('打赏-结算起结金额(分)');
    // 两处都会出现「未初始化」（参数列的 Tag + 生效值列的说明），所以用 getAllByText
    expect(within(row).getAllByText(/未初始化/).length).toBeGreaterThanOrEqual(2);
    expect(within(row).getByText(/用默认 10000/)).toBeTruthy();
    // 库值为空时输入框也应该是空的，而不是显示生效值 10000（那会让人以为库里已经有值）
    expect((within(row).getByRole('spinbutton') as HTMLInputElement).value).toBe('');
  });

  it('remark 是参数说明文档，只读展示，不出现在任何可编辑控件里', async () => {
    setup();
    await screen.findByText('打赏-功能总开关');
    // 页面上不应该有可编辑的 remark 输入框（保存时也不能回写它）
    expect(screen.queryByText('种子脚本写入的参数说明文档')).toBeNull();
    expect(document.querySelectorAll('textarea').length).toBe(0);
  });

  // ==================================================================
  // 自检面板
  // ==================================================================

  it('自检面板给出三个闸门状态、环境、费率与分成率上限', async () => {
    setup();
    await screen.findByText('打赏-功能总开关');
    expect(screen.getByText('打赏：关闭')).toBeTruthy();
    expect(screen.getByText('主动退款：关闭')).toBeTruthy();
    expect(screen.getByText('商家结算：关闭')).toBeTruthy();
    expect(screen.getByText(/环境：沙箱/)).toBeTruthy();
    expect(screen.getByText(/安卓 99% \/ iOS 88%/)).toBeTruthy();
    expect(screen.getByText('自检未发现问题')).toBeTruthy();
  });

  it('自检问题按 danger → warn → info 排序，危险项排最前', async () => {
    checkResponse = ok({
      ...baseCheck,
      dangerCount: 1,
      warnCount: 1,
      infoCount: 1,
      issues: [
        { level: 'info', configKey: 'reward.env.sandbox', message: '当前处于沙箱环境' },
        { level: 'danger', configKey: 'reward.enabled', message: '参数缓存与数据库不一致' },
        { level: 'warn', configKey: 'reward.commission.rate', message: '佣金率高于行业常规' },
      ],
    });
    setup();
    await screen.findByText('参数缓存与数据库不一致');
    expect(screen.getByText('危险 1 · 警告 1 · 提示 1')).toBeTruthy();

    const danger = screen.getByText('参数缓存与数据库不一致');
    const warn = screen.getByText('佣金率高于行业常规');
    const info = screen.getByText('当前处于沙箱环境');
    expect(danger.compareDocumentPosition(warn) & 4).toBeTruthy();
    expect(warn.compareDocumentPosition(info) & 4).toBeTruthy();
  });

  it('环境不一致是警告而不是致命错误：沙箱联调时只上架沙箱档位是正常状态', async () => {
    checkResponse = ok({ ...baseCheck, envConsistent: false });
    setup();
    await screen.findByText('档位环境与系统环境不一致');
    const alert = screen.getByText('档位环境与系统环境不一致').closest('.ant-alert') as HTMLElement;
    expect(alert.className).toContain('ant-alert-warning');
    expect(alert.className).not.toContain('ant-alert-error');
  });

  it('分成率超限的商户覆盖列成表，线路级覆盖只给条数并指向线路管理', async () => {
    checkResponse = ok({
      ...baseCheck,
      dangerCount: 1,
      unsafeMerchants: [
        {
          targetType: 'merchant',
          targetId: 7,
          targetName: '某旅行社',
          androidShareRate: 99.5,
          iosShareRate: 90,
          message: 'iOS 分成率 90 超过上限 88',
        },
      ],
      unsafeLineCount: 12,
    });
    setup();
    await screen.findByText('某旅行社');
    expect(screen.getByText(/分成率超过安全上限的覆盖（1 条，另有 12 条线路级覆盖）/)).toBeTruthy();
    expect(screen.getByText('iOS 分成率 90 超过上限 88')).toBeTruthy();
  });

  it('只有线路级覆盖时，文案必须指向「线路管理」——配置页不承担逐条修复入口', async () => {
    checkResponse = ok({ ...baseCheck, dangerCount: 1, unsafeLineCount: 5 });
    setup();
    await screen.findByText(/5 条线路的分成率覆盖超过安全上限/);
    expect(screen.getByText(/请到「线路管理」里筛出这些线路修正/)).toBeTruthy();
  });

  it('刷新参数缓存要先确认：它会改变运行时实际生效值', async () => {
    setup();
    await screen.findByText('打赏-功能总开关');
    await userEvent.setup().click(button('刷新参数缓存'));
    // 没确认之前不该发请求
    expect(calls.refresh).toBe(0);
    const pop = document.querySelector('.ant-popconfirm') as HTMLElement;
    expect(within(pop).getByText(/运行时会立即改用库里的值/)).toBeTruthy();
  });

  it('确认刷新后调用接口并重新拉取列表与自检', async () => {
    setup();
    const user = userEvent.setup();
    await screen.findByText('打赏-功能总开关');
    expect(calls.list).toBe(1);
    await user.click(button('刷新参数缓存'));
    const pop = document.querySelector('.ant-popconfirm') as HTMLElement;
    await user.click(within(pop).getByRole('button', { name: /确\s*认\s*刷\s*新/ }));
    await waitFor(() => expect(calls.refresh).toBe(1));
    await waitFor(() => expect(calls.list).toBe(2));
    await waitFor(() => expect(calls.check).toBe(2));
  });

  // ==================================================================
  // 编辑与保存
  // ==================================================================

  it('没有任何改动时「保存改动」不可点', async () => {
    setup();
    await screen.findByText('打赏-功能总开关');
    expect((button('保存改动') as HTMLButtonElement).disabled).toBe(true);
  });

  it('改动开关后进入 diff，确认清单里给出原值→新值与生效范围', async () => {
    setup();
    const user = userEvent.setup();
    const row = await rowOf('打赏-功能总开关');
    await user.click(within(row).getByRole('switch'));
    await waitFor(() => expect(button('保存改动').textContent).toContain('1'));

    const modal = await openSaveModal(user);
    expect(within(modal).getByText('打赏-功能总开关')).toBeTruthy();
    expect(within(modal).getByText('0')).toBeTruthy();
    expect(within(modal).getByText('1')).toBeTruthy();
    expect(within(modal).getByText('关键')).toBeTruthy();
    expect(within(modal).getByText('立即生效（下一次读取即用新值）')).toBeTruthy();
  });

  it('保存只提交改动的那一项，且请求体不带 remark / configName', async () => {
    setup();
    const user = userEvent.setup();
    const row = await rowOf('打赏-安卓端商家分成率(%)');
    const input = within(row).getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '80');

    await openSaveModal(user);
    // 非关键参数：理由选填，直接确认
    await confirmSave(user);

    await waitFor(() => expect(calls.update).toBe(1));
    expect(lastUpdateBody.items).toEqual([
      { configKey: 'reward.share.rate.android', configValue: '80' },
    ]);
    expect(lastUpdateBody.items[0]).not.toHaveProperty('remark');
    expect(lastUpdateBody.items[0]).not.toHaveProperty('configName');
    expect(lastUpdateBody).not.toHaveProperty('reason');
    // 保存成功后要重取列表与自检，否则自检面板会继续报刚修好的问题
    await waitFor(() => expect(calls.list).toBe(2));
    await waitFor(() => expect(calls.check).toBe(2));
  });

  it('关键参数不填理由时前端直接拦住，一个请求都不发（与后端 4093 双保险）', async () => {
    setup();
    const user = userEvent.setup();
    const row = await rowOf('打赏-功能总开关');
    await user.click(within(row).getByRole('switch'));
    const modal = await openSaveModal(user);
    expect(within(modal).getByText(/含关键参数，必须填写理由/)).toBeTruthy();

    await confirmSave(user);
    await waitFor(() => expect(within(modal).getByText('关键参数改动必须填写理由')).toBeTruthy());
    expect(calls.update).toBe(0);
  });

  it('关键参数填了理由时，理由随请求体一起送到后端（进 sys_oper_log）', async () => {
    setup();
    const user = userEvent.setup();
    const row = await rowOf('打赏-功能总开关');
    await user.click(within(row).getByRole('switch'));
    const modal = await openSaveModal(user);
    await user.type(
      within(modal).getByRole('textbox'),
      'ICP/EDI 证已下发，按上线评审结论打开总开关（工单 OP-1024）',
    );
    await confirmSave(user);

    await waitFor(() => expect(calls.update).toBe(1));
    expect(lastUpdateBody.reason).toContain('OP-1024');
    expect(lastUpdateBody.items).toEqual([{ configKey: 'reward.enabled', configValue: '1' }]);
  });

  it('枚举参数用下拉选择，提交的是选项字面量', async () => {
    setup();
    const user = userEvent.setup();
    const row = await rowOf('打赏-退款终态查询目标');
    await user.click(within(row).getByRole('combobox'));
    const opt = await waitFor(() => {
      const items = Array.from(
        document.querySelectorAll(
          '.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option',
        ),
      ) as HTMLElement[];
      const hit = items.find((i) => i.textContent?.trim() === 'pay_order');
      if (!hit) throw new Error(`下拉里没有 pay_order，实际：${items.map((i) => i.textContent)}`);
      return hit;
    });
    await user.click(opt);

    await openSaveModal(user);
    await confirmSave(user);
    await waitFor(() => expect(calls.update).toBe(1));
    expect(lastUpdateBody.items).toEqual([
      { configKey: 'reward.refund.query.target', configValue: 'pay_order' },
    ]);
  });

  it("把值清空后不允许保存：空串会被 MyBatis 的 !='' 判断静默跳过，接口成功而库里没动", async () => {
    setup();
    const user = userEvent.setup();
    const row = await rowOf('打赏-安卓端商家分成率(%)');
    await user.clear(within(row).getByRole('spinbutton'));

    await waitFor(() => expect(screen.getByText(/有 1 项填写不合法，修正后才能保存/)).toBeTruthy());
    expect(screen.getByText(/「空」不合法/)).toBeTruthy();
    expect((button('保存改动') as HTMLButtonElement).disabled).toBe(true);
  });

  it('超出允许范围的值同样被拦在本地，不必让用户吃一次 4091', async () => {
    setup();
    const user = userEvent.setup();
    const row = await rowOf('打赏-安卓端商家分成率(%)');
    const input = within(row).getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '150');

    await waitFor(() => expect(screen.getByText(/有 1 项填写不合法，修正后才能保存/)).toBeTruthy());
    // 「范围 0 ~ 100」在参数行的「默认 / 范围」列里也有，这里要的是 Alert 里那句
    const alert = screen
      .getByText(/有 1 项填写不合法，修正后才能保存/)
      .closest('.ant-alert') as HTMLElement;
    expect(within(alert).getByText(/范围 0 ~ 100/)).toBeTruthy();
    expect((button('保存改动') as HTMLButtonElement).disabled).toBe(true);
  });

  it('放弃改动会清空 diff，且不发任何请求', async () => {
    setup();
    const user = userEvent.setup();
    const row = await rowOf('打赏-功能总开关');
    await user.click(within(row).getByRole('switch'));
    await waitFor(() => expect((button('放弃改动') as HTMLButtonElement).disabled).toBe(false));

    await user.click(button('放弃改动'));
    await waitFor(() => expect((button('保存改动') as HTMLButtonElement).disabled).toBe(true));
    expect(calls.update).toBe(0);
  });

  // ==================================================================
  // 保存失败：4090~4096 必须自己分派文案（缺陷 49）
  // ==================================================================

  it('4092 资金不变量：提示必须说清「分成率 ≤ 100 − 渠道费率」且要放在同一批改', async () => {
    updateResponse = bizError(4092, '分成率与渠道费率组合不安全');
    setup();
    const user = userEvent.setup();
    const row = await rowOf('打赏-安卓端商家分成率(%)');
    const input = within(row).getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '100');
    await openSaveModal(user);
    await confirmSave(user);

    await expectMessage('分成率必须 ≤ 100 − 该平台渠道费率');
    await expectMessage('同一批');
  });

  it('4096 无变化：提示已被他人修改，并自动重取最新值', async () => {
    updateResponse = bizError(4096, '参数值与库中一致，没有任何改动');
    setup();
    const user = userEvent.setup();
    const row = await rowOf('打赏-安卓端商家分成率(%)');
    const input = within(row).getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '80');
    await openSaveModal(user);
    await confirmSave(user);

    await expectMessage('参数已被他人修改');
    await waitFor(() => expect(calls.list).toBe(2));
  });

  it('4095 写库失败：明确告知整批已回滚，不让人以为改了一半', async () => {
    updateResponse = bizError(4095, '更新参数失败');
    setup();
    const user = userEvent.setup();
    const row = await rowOf('打赏-安卓端商家分成率(%)');
    const input = within(row).getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '80');
    await openSaveModal(user);
    await confirmSave(user);

    await expectMessage('本批已整批回滚');
  });

  it('4093 由后端判定时，提示指向「填写改动理由」这个动作', async () => {
    updateResponse = bizError(4093, '关键参数改动必须填写理由');
    setup();
    const user = userEvent.setup();
    // 用非关键参数触发保存（前端不要求理由），让 4093 只能来自后端
    const row = await rowOf('打赏-安卓端商家分成率(%)');
    const input = within(row).getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '80');
    await openSaveModal(user);
    await confirmSave(user);

    await expectMessage('必须填写改动理由');
  });

  it('未知业务码兜底：把后端原文补出来，而不是停在拦截器那句「服务器错误」', async () => {
    updateResponse = bizError(4099, '后端自定义的一句非常具体的话');
    setup();
    const user = userEvent.setup();
    const row = await rowOf('打赏-安卓端商家分成率(%)');
    const input = within(row).getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '80');
    await openSaveModal(user);
    await confirmSave(user);

    await expectMessage('后端自定义的一句非常具体的话');
  });

  // ==================================================================
  // 分账预览
  // ==================================================================

  /**
   * 取 Descriptions 里某个条目的**内容**文本。
   *
   * antd 5 的 bordered Descriptions 渲染成 table：label 是 th.ant-descriptions-item-label，
   * 内容是它右边紧邻的 td，两者**没有**共同祖先（`.ant-descriptions-item` 不存在），
   * 所以只能按兄弟节点取。整行 textContent 会混进同一行的其它条目，
   * 用来断言「不显示 0.00」这种否定式结论时会假阳性。
   */
  const descContent = (scope: HTMLElement, label: string): string => {
    const th = within(scope).getByText(label).closest('th, td');
    const content = th?.nextElementSibling;
    if (!content) throw new Error(`没有找到「${label}」对应的内容单元格`);
    return content.textContent ?? '';
  };

  const openPreview = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(button('分账预览'));
    await screen.findByText(/按「假设费率」逐档试算/);
    return document.querySelector('.ant-drawer-content') as HTMLElement;
  };

  it('留空的费率字段不传：传空串会被后端当成「假设值是空」，与「取生效值」语义不同', async () => {
    setup();
    const user = userEvent.setup();
    await screen.findByText('打赏-功能总开关');
    const panel = await openPreview(user);
    await user.click(within(panel).getByRole('button', { name: /试\s*算/ }));

    await waitFor(() => expect(calls.preview).toBe(1));
    expect(lastPreviewBody).toEqual({});
  });

  it('填了假设费率时按字符串传，env 选了才传', async () => {
    setup();
    const user = userEvent.setup();
    await screen.findByText('打赏-功能总开关');
    const panel = await openPreview(user);
    const inputs = within(panel).getAllByRole('spinbutton');
    // 表单顺序：安卓分成率 / iOS分成率 / 佣金率 / 安卓渠道费 / iOS渠道费
    await user.type(inputs[1], '95');
    await user.click(within(panel).getByRole('button', { name: /试\s*算/ }));

    await waitFor(() => expect(calls.preview).toBe(1));
    expect(lastPreviewBody).toEqual({ shareRateIos: '95' });
  });

  it('试算结果标出被资损闸门拒掉的档位，并给出被拒总数', async () => {
    setup();
    const user = userEvent.setup();
    await screen.findByText('打赏-功能总开关');
    const panel = await openPreview(user);
    await user.click(within(panel).getByRole('button', { name: /试\s*算/ }));

    await waitFor(() => expect(within(panel).getByText('被闸门拒')).toBeTruthy());
    // 这条是全局 message，挂在 body 上，不在抽屉里
    await expectMessage('有 1 个档位会被资损闸门拒掉');
    // 被拒的那一行整行标红
    const blockedCell = within(panel).getByText('被闸门拒');
    const tr = blockedCell.closest('tr') as HTMLElement;
    expect(tr.style.background).toContain('255, 241, 240');
  });

  it('最小平台净收益为空时显示「—」：显示 0.00 会被读成「平台一分钱不赚」', async () => {
    setup();
    const user = userEvent.setup();
    await screen.findByText('打赏-功能总开关');
    const panel = await openPreview(user);
    await user.click(within(panel).getByRole('button', { name: /试\s*算/ }));

    await waitFor(() => expect(within(panel).getByText('最小平台净收益')).toBeTruthy());
    const content = descContent(panel, '最小平台净收益');
    expect(content).toContain('—');
    expect(content).not.toContain('0.00');
  });

  it('有最小净收益时按元展示，并标明用的是假设值', async () => {
    previewResponse = ok({
      ...previewData,
      minPlatformProfitFen: 1,
      blockedCount: 0,
      overridden: true,
    });
    setup();
    const user = userEvent.setup();
    await screen.findByText('打赏-功能总开关');
    const panel = await openPreview(user);
    await user.click(within(panel).getByRole('button', { name: /试\s*算/ }));

    await waitFor(() => expect(within(panel).getByText('是（试算用假设值）')).toBeTruthy());
    expect(descContent(panel, '最小平台净收益')).toContain('0.01 元');
  });

  it('没有可试算档位时给出可操作的空态，而不是一片空白', async () => {
    previewResponse = ok({ ...previewData, rows: [], blockedCount: 0, minPlatformProfitFen: null });
    setup();
    const user = userEvent.setup();
    await screen.findByText('打赏-功能总开关');
    const panel = await openPreview(user);
    await user.click(within(panel).getByRole('button', { name: /试\s*算/ }));

    await waitFor(() =>
      expect(within(panel).getByText('没有可试算的档位（该环境下没有已发布档位？）')).toBeTruthy(),
    );
  });

  it('加载失败时把后端原文补出来，不停在「服务器错误」', async () => {
    listResponse = bizError(500, '参数服务不可用：Redis 连接超时');
    setup();
    await expectMessage('参数服务不可用：Redis 连接超时');
  });
});
