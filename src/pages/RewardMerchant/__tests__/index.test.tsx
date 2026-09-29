/**
 * 打赏商户管理页测试。
 *
 * 重点不是「渲染出来了」，而是**主体安全与资金语义不变量**：
 *   - 出网请求体里绝不能出现 audit_* 字段：后端虽然会强制忽略，但前端白名单是双保险。
 *     一旦「新增商户」能带上 auditStatus=1，这一个权限就等于「造一个能收钱的主体」
 *   - 编辑时必须把原有三个费率带上：updateMerchant 对费率列是无条件更新，
 *     漏带一次＝把商户分成率静默改回全局值（运营察觉不到的降分成）
 *   - 列表页的对公账号必须脱敏（完整账号只在详情/编辑回填时出现）
 *   - 审核门槛缺项要在点审核**之前**一次列全，且后端拒绝时弹窗不关闭
 *   - 拒绝入驻必填审核意见（后端 4061/服务层校验），前端先挡一层
 *   - 4065（有未结算流水）删除被拒后要给「改为停用」这条可执行出路
 * 这几条一旦回归，直接后果是凭空多出可收款主体，或商家分成被悄悄改掉。
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test-utils';
import { App as AntdApp, message, Modal } from 'antd';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { AntdStaticProvider } from '@/components/AntdStaticProvider';
// 复用 setupTests 里已 listen 的全局 server。
// 不要在测试文件里再 setupServer：msw 2.14 下两个 server 同时监听，
// 同一个请求会被处理两次，「一次点击只能出网一次」的断言会假失败。
import { server } from '../../../../mocks/server';
import RewardMerchant from '../index';

/**
 * 商户 CRUD 的业务失败与档位/退款页不同：由 ServiceException 走全局异常处理器，
 * 业务码在**顶层** code，拦截器会弹后端原文并 throw（Error 上挂 code）。
 */
const ok = (data?: unknown, msg = '操作成功') => HttpResponse.json({ code: 200, msg, data });
const bizFail = (code: number, msg: string) => HttpResponse.json({ code, msg });
const page = (rows: unknown[], total = rows.length) =>
  HttpResponse.json({ code: 200, msg: 'success', rows, total });

const FULL_ACCOUNT_NO = '1202020409900112345';

/** 四种典型商户：门槛齐备待审核 / 已通过 / 材料全缺 / 已拒绝且停用 */
const merchants = [
  {
    merchantId: 1,
    merchantName: '丽水云游旅行社有限公司',
    creditCode: '91331100MA2H8N4X7Y',
    legalPerson: '张三',
    licenseUrl: 'https://cdn.example.com/license-1.jpg',
    contactName: '李四',
    contactPhone: '13800000001',
    bankAccountName: '丽水云游旅行社有限公司',
    bankAccountNo: FULL_ACCOUNT_NO,
    bankName: '中国银行丽水分行营业部',
    invoiceCapability: '1',
    androidShareRate: null,
    iosShareRate: null,
    commissionRate: null,
    auditStatus: '0',
    status: '0',
    createTime: '2026-09-20 10:00:00',
  },
  {
    merchantId: 2,
    merchantName: '十八线文化传媒',
    creditCode: '91330100MA2G7K3P9Q',
    licenseUrl: 'https://cdn.example.com/license-2.jpg',
    bankAccountName: '十八线文化传媒有限公司',
    bankAccountNo: '3301020409900556677',
    invoiceCapability: '2',
    androidShareRate: 78,
    iosShareRate: 70,
    commissionRate: 10,
    auditStatus: '1',
    auditBy: 'admin',
    auditTime: '2026-09-21 09:30:00',
    status: '0',
    createTime: '2026-09-19 10:00:00',
  },
  {
    merchantId: 3,
    merchantName: '缺材料商户',
    creditCode: '91330200MA2T5R8W1N',
    invoiceCapability: '0',
    licenseUrl: null,
    bankAccountName: null,
    bankAccountNo: null,
    auditStatus: '0',
    status: '0',
    createTime: '2026-09-22 10:00:00',
  },
  {
    merchantId: 4,
    merchantName: '已拒绝商户',
    creditCode: '91330300MA2W4Y6U2M',
    invoiceCapability: '1',
    licenseUrl: 'https://cdn.example.com/license-4.jpg',
    bankAccountName: '已拒绝商户',
    bankAccountNo: '3301020409900778899',
    auditStatus: '2',
    auditRemark: '营业执照附件缺失，请补传后重新提交',
    status: '1',
    createTime: '2026-09-23 10:00:00',
  },
];

let addBody: any = null;
let editBody: any = null;
let auditBody: any = null;
let removeCount = 0;
let listCount = 0;

const handlers = [
  http.get('*/travel18/merchant/list', () => {
    listCount += 1;
    return page(merchants);
  }),
  http.post('*/travel18/merchant/audit', async ({ request }) => {
    auditBody = await request.json();
    return ok(null, '审核成功');
  }),
  http.post('*/travel18/merchant', async ({ request }) => {
    addBody = await request.json();
    return ok({ merchantId: 99 }, '新增成功');
  }),
  http.put('*/travel18/merchant', async ({ request }) => {
    editBody = await request.json();
    return ok(null, '修改成功');
  }),
  http.delete('*/travel18/merchant/:merchantIds', () => {
    removeCount += 1;
    return ok(null, '删除成功');
  }),
  http.get('*/travel18/merchant/:merchantId', ({ params }) => {
    const row = merchants.find((m) => m.merchantId === Number(params.merchantId));
    return ok(row);
  }),
];

beforeEach(() => {
  addBody = null;
  editBody = null;
  auditBody = null;
  removeCount = 0;
  listCount = 0;
  server.use(...handlers);
});

afterEach(() => {
  // antd 的 message / Modal 挂在 body 上，不受 RTL cleanup 管理，
  // 不清掉会串到下一个用例
  message.destroy();
  Modal.destroyAll();
});

/**
 * 必须按生产结构套上 antd 的 <App> + AntdStaticProvider。
 *
 * 原因：商户 CRUD 的业务失败走的是 request.ts 拦截器的「顶层 code≠200」分支，
 * 它会先调 messageInstance.error(...) 再 throw 带 code 的 Error。
 * 而 messageInstance 由 AntdStaticProvider 在 useEffect 里注册——
 * 不套这两层的话它是 undefined，拦截器会先抛 TypeError，
 * 页面 catch 里读到的 e.code 就是 undefined，4065 的引导弹窗永远出不来，
 * 且看不到「后端原文只弹一次」这条断言的真实结果（生产环境是有 Provider 的）。
 */
const setup = () =>
  render(
    <AntdApp>
      <AntdStaticProvider>
        <RewardMerchant />
      </AntdStaticProvider>
    </AntdApp>,
  );

/**
 * 按商户名定位所在行，断言才能精确到「这一行的按钮」。
 *
 * 用 findAllByText 而不是 findByText：对公账户名通常与商户名完全一致，
 * 同一行里会出现两处相同文本，findByText 会因「找到多个」直接抛错。
 */
const rowOf = async (merchantName: string) => {
  const cells = await screen.findAllByText(merchantName);
  const row = cells[0].closest('tr');
  if (!row) throw new Error(`未找到 ${merchantName} 所在行`);
  return row as HTMLElement;
};

/**
 * 行内按钮。带图标的按钮可访问名会拼上图标 aria-label（如 "audit 审核"），
 * 所以统一用正则匹配，不能用全等字符串。
 */
const buttonIn = (row: HTMLElement, name: string | RegExp) =>
  within(row).getByRole('button', { name: typeof name === 'string' ? new RegExp(name) : name });

const drawerOf = () => document.querySelector('.ant-drawer-content') as HTMLElement;

/**
 * 展开中的下拉项。
 * antd 的 Select 选项渲染在 body 上的浮层里，且列表页的 Tag 可能出现同名文案
 * （如「小规模纳税人」），所以只能按「当前可见的 dropdown」范围取。
 */
const findOption = (label: string) =>
  waitFor(() => {
    const items = Array.from(
      document.querySelectorAll(
        '.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option',
      ),
    ) as HTMLElement[];
    const hit = items.find((item) => item.textContent?.trim() === label);
    if (!hit) {
      throw new Error(
        `下拉项「${label}」未出现，实际有：${items.map((i) => i.textContent).join(' / ')}`,
      );
    }
    return hit;
  });

/** 打开抽屉里的开票能力下拉并选中指定项 */
const pickInvoice = async (user: ReturnType<typeof userEvent.setup>, label: string) => {
  const drawer = drawerOf();
  const select = within(drawer).getByText('请选择').closest('.ant-select') as HTMLElement;
  await user.click(select.querySelector('.ant-select-selector') as HTMLElement);
  await user.click(await findOption(label));
};

describe('打赏商户页 · 列表与主体信息脱敏', () => {
  it('审核状态与开票能力按后端枚举翻译，停用/已拒绝如实展示', async () => {
    setup();
    await rowOf('丽水云游旅行社有限公司');

    expect(screen.getAllByText('待审核').length).toBeGreaterThan(0);
    expect(screen.getAllByText('已通过').length).toBeGreaterThan(0);
    expect(screen.getAllByText('已拒绝').length).toBeGreaterThan(0);
    expect(screen.getAllByText('小规模纳税人').length).toBeGreaterThan(0);
    expect(screen.getAllByText('一般纳税人').length).toBeGreaterThan(0);
    // 开票能力「无」是审核硬门槛，必须显眼地露出来，而不是显示成空
    expect(screen.getAllByText('无').length).toBeGreaterThan(0);
    expect(screen.getAllByText('停用').length).toBeGreaterThan(0);
  });

  it('对公账号在列表页只显示后 4 位，完整账号不出现在列表', async () => {
    setup();
    await rowOf('丽水云游旅行社有限公司');

    // 列表会被很多人看到，完整收款账号等于贴在大屏上
    expect(screen.getAllByText(`**** **** ${FULL_ACCOUNT_NO.slice(-4)}`).length).toBeGreaterThan(0);
    expect(screen.queryByText(FULL_ACCOUNT_NO)).toBeNull();
  });

  it('费率为空显示「继承全局」而不是 0%，有值按百分比展示', async () => {
    setup();
    await rowOf('丽水云游旅行社有限公司');

    // 「空 = 继承全局参数」和「0% = 一分不拿」是两件完全不同的事，
    // 显示成 0% 会让运营以为这个商户白干活
    expect(screen.getAllByText('继承全局').length).toBeGreaterThan(0);
    expect(screen.getAllByText('78.00%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('70.00%').length).toBeGreaterThan(0);
    expect(screen.queryByText('0.00%')).toBeNull();
  });

  it('对公账户未登记时给红字提示（审核会被拦），而不是留空', async () => {
    setup();
    await rowOf('缺材料商户');
    expect(screen.getAllByText('未登记（审核会被拦）').length).toBeGreaterThan(0);
  });
});

describe('打赏商户页 · 出网请求体白名单（防提权）', () => {
  it('新增商户：请求体不含任何 audit_* 字段，且以「待审核」入库', async () => {
    const user = userEvent.setup();
    setup();
    await rowOf('丽水云游旅行社有限公司');

    await user.click(screen.getByRole('button', { name: /新增商户/ }));
    await screen.findByText(/新增的商户一律是「待审核」/);

    const drawer = drawerOf();
    await user.type(within(drawer).getByPlaceholderText('如 丽水某某旅行社有限公司'), '测试旅行社');
    // 故意输小写：后端会 trim+toUpperCase 后按国标校验，前端出网前先归一，
    // 否则「本地判合法、入库大写」会让唯一键与查询对不上
    await user.type(
      within(drawer).getByPlaceholderText('如 91331100MA2H8N4X7Y'),
      '91330100ma2g7k3p9q',
    );
    await pickInvoice(user, '一般纳税人');

    await user.click(within(drawer).getByRole('button', { name: /保\s*存/ }));
    await waitFor(() => expect(addBody).not.toBeNull());

    expect(addBody.merchantName).toBe('测试旅行社');
    expect(addBody.creditCode).toBe('91330100MA2G7K3P9Q');
    expect(addBody.invoiceCapability).toBe('2');
    expect(addBody.status).toBe('0');
    expect(addBody.merchantId).toBeUndefined();
    // ⚠️ 核心断言：审核字段一个都不能出现
    expect('auditStatus' in addBody).toBe(false);
    expect('auditBy' in addBody).toBe(false);
    expect('auditTime' in addBody).toBe(false);
    expect('auditRemark' in addBody).toBe(false);
    expect('delFlag' in addBody).toBe(false);
    expect(screen.getByText(/新增成功，商户处于「待审核」状态/)).toBeInTheDocument();
  });

  it('编辑已通过商户：信用代码被锁（4069 前置提示），且原有三个费率必须随请求体回传', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('十八线文化传媒');
    await user.click(buttonIn(row, '编辑'));

    expect(
      await screen.findByText('该商户已通过入驻审核，统一社会信用代码已锁定'),
    ).toBeInTheDocument();
    const drawer = drawerOf();
    expect(within(drawer).getByPlaceholderText('如 91331100MA2H8N4X7Y')).toBeDisabled();

    await user.click(within(drawer).getByRole('button', { name: /保\s*存/ }));
    await waitFor(() => expect(editBody).not.toBeNull());

    expect(editBody.merchantId).toBe(2);
    // updateMerchant 对三列费率是无条件更新（NULL = 继承全局），
    // 漏带就等于把商户已谈好的分成率悄悄改回全局值
    expect(editBody.androidShareRate).toBe(78);
    expect(editBody.iosShareRate).toBe(70);
    expect(editBody.commissionRate).toBe(10);
    expect('auditStatus' in editBody).toBe(false);
    expect('auditBy' in editBody).toBe(false);
    expect('auditTime' in editBody).toBe(false);
    expect('auditRemark' in editBody).toBe(false);
  });

  it('统一社会信用代码不足 18 位时就地拦住，不出网', async () => {
    const user = userEvent.setup();
    setup();
    await rowOf('丽水云游旅行社有限公司');
    await user.click(screen.getByRole('button', { name: /新增商户/ }));
    await screen.findByText(/新增的商户一律是「待审核」/);

    const drawer = drawerOf();
    await user.type(within(drawer).getByPlaceholderText('如 丽水某某旅行社有限公司'), '测试旅行社');
    await user.type(
      within(drawer).getByPlaceholderText('如 91331100MA2H8N4X7Y'),
      '91330100MA2G7K3P',
    );
    await pickInvoice(user, '小规模纳税人');
    await user.click(within(drawer).getByRole('button', { name: /保\s*存/ }));

    expect(await screen.findByText(/必须是 18 位/)).toBeInTheDocument();
    expect(addBody).toBeNull();
  });

  it('信用代码含国标排除字母（I O Z S V）时就地拦住', async () => {
    const user = userEvent.setup();
    setup();
    await rowOf('丽水云游旅行社有限公司');
    await user.click(screen.getByRole('button', { name: /新增商户/ }));
    await screen.findByText(/新增的商户一律是「待审核」/);

    const drawer = drawerOf();
    await user.type(within(drawer).getByPlaceholderText('如 丽水某某旅行社有限公司'), '测试旅行社');
    // 第 9 位用 I：与数字 1 易混，国标刻意排除
    await user.type(
      within(drawer).getByPlaceholderText('如 91331100MA2H8N4X7Y'),
      '91330100IA2G7K3P9Q',
    );
    await pickInvoice(user, '小规模纳税人');
    await user.click(within(drawer).getByRole('button', { name: /保\s*存/ }));

    expect(await screen.findByText(/国标排除 I O Z S V/)).toBeInTheDocument();
    expect(addBody).toBeNull();
  });

  it('抽屉里明示分成率上限＝100−渠道费率（安卓 99%、iOS 88%）', async () => {
    const user = userEvent.setup();
    setup();
    await rowOf('丽水云游旅行社有限公司');
    await user.click(screen.getByRole('button', { name: /新增商户/ }));

    // 上限不是 100：平台到手 = 实付 − 渠道费，分成超过平台到手会被资损闸门拒单，
    // 后果是该商户名下所有线路的打赏全部报「分成配置异常」
    expect(await screen.findByText(/分成率上限：安卓 ≤ 99%，iOS ≤ 88%/)).toBeInTheDocument();
    expect(screen.getByText(/上限 = 100 − 该平台渠道费率/)).toBeInTheDocument();
  });
});

describe('打赏商户页 · 入驻审核（三道硬门槛）', () => {
  it('材料缺失的商户点审核：一次列全三条门槛，后端拒绝时弹窗不关闭', async () => {
    server.use(
      http.post('*/travel18/merchant/audit', async ({ request }) => {
        auditBody = await request.json();
        return bizFail(4063, '该商户开票能力为「无」，不得通过入驻审核');
      }),
    );
    const user = userEvent.setup();
    setup();
    const row = await rowOf('缺材料商户');
    await user.click(buttonIn(row, /审核/));

    const gapTitle = await screen.findByText('审核门槛未满足，选「通过」会被后端拒绝');
    const gapModal = gapTitle.closest('.ant-modal') as HTMLElement;
    // 一次只报一条的话，运营要来回三次才知道差哪些材料。
    // ⚠️ 必须限定在弹窗内查：后端拒绝时的原文（拦截器弹的 toast）里含同样字样，
    // 全局 getByText 会命中多个元素直接抛错
    expect(within(gapModal).getByText(/开票能力为「无」/)).toBeInTheDocument();
    expect(within(gapModal).getByText(/营业执照附件未上传/)).toBeInTheDocument();
    expect(within(gapModal).getByText(/对公账户名或账号未登记/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /提交审核结论/ }));
    await waitFor(() => expect(auditBody).not.toBeNull());

    // 拦截器已经弹了后端原文，页面绝不能再弹一次（同一条原因弹两次会让运营以为出了两个错）
    await waitFor(() => expect(document.querySelectorAll('.ant-message-error').length).toBe(1));
    // 弹窗必须留着：运营要能就地改结论或看清缺什么，而不是被关掉后重新找一遍商户
    expect(screen.getByText('审核门槛未满足，选「通过」会被后端拒绝')).toBeInTheDocument();
  });

  it('门槛齐备的商户审核通过：pass=true 出网，弹窗关闭', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('丽水云游旅行社有限公司');
    await user.click(buttonIn(row, /审核/));

    const modal = (await screen.findByText(/入驻审核：丽水云游旅行社有限公司/)).closest(
      '.ant-modal',
    ) as HTMLElement;
    // 材料齐备时不该出现红色门槛告警
    expect(within(modal).queryByText('审核门槛未满足，选「通过」会被后端拒绝')).toBeNull();

    // 刷新次数要在点提交**之前**取，否则 reload 可能已经发生，before==after 会假失败
    const before = listCount;
    await user.click(screen.getByRole('button', { name: /提交审核结论/ }));
    await waitFor(() => expect(auditBody).not.toBeNull());
    expect(auditBody).toMatchObject({ merchantId: 1, pass: true });
    // 审核成功后必须刷新列表，否则运营看到的还是旧的「待审核」标签，会再点一次
    await waitFor(() => expect(listCount).toBeGreaterThan(before));
    /**
     * 弹窗关闭：jsdom 不会触发 animationend，rc-motion 的离场动画永远停在
     * ant-zoom-leave-active，DOM 不会被移除（真机会移除）。所以两种状态都算通过。
     */
    await waitFor(() => {
      const modalEl = document.querySelector('.ant-modal');
      const unmounted = !document.querySelector('.ant-modal-title');
      expect(unmounted || /ant-zoom-leave/.test(modalEl?.className ?? '')).toBe(true);
    });
  });

  it('拒绝入驻必须填审核意见：不填就地拦住不出网，填了才提交', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('丽水云游旅行社有限公司');
    await user.click(buttonIn(row, /审核/));
    await screen.findByText(/入驻审核：丽水云游旅行社有限公司/);

    await user.click(screen.getByText('拒绝'));
    await user.click(screen.getByRole('button', { name: /提交审核结论/ }));

    // 拒绝必须留痕：商家要知道差什么材料，否则只会反复提交同样的资料
    expect(await screen.findByText(/拒绝入驻必须填写审核意见/)).toBeInTheDocument();
    expect(auditBody).toBeNull();

    await user.type(
      screen.getByPlaceholderText(/营业执照附件缺失，请补传后重新提交/),
      '对公账户名与营业执照名称不一致',
    );
    await user.click(screen.getByRole('button', { name: /提交审核结论/ }));
    await waitFor(() => expect(auditBody).not.toBeNull());
    expect(auditBody).toMatchObject({ merchantId: 1, pass: false });
    expect(auditBody.auditRemark).toBe('对公账户名与营业执照名称不一致');
  });

  it('已通过的商户审核按钮显示为「撤销通过」，并给出撤销后果提示', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('十八线文化传媒');
    await user.click(buttonIn(row, /撤销通过/));

    // 从「已通过」→「已拒绝」的实际语义是撤销合作资格，必须显式告知后果
    expect(await screen.findByText('该商户当前是「已通过」')).toBeInTheDocument();
    expect(screen.getByText(/撤销后月结批次不再纳入该商户/)).toBeInTheDocument();
  });
});

describe('打赏商户页 · 删除', () => {
  it('有未结算流水被拒（4065）时给出「改为停用」这条出路，并能就地打开编辑', async () => {
    server.use(
      http.delete('*/travel18/merchant/:merchantIds', () => {
        removeCount += 1;
        return bizFail(4065, '该商户仍有未结算的应付流水，禁止删除');
      }),
    );
    const user = userEvent.setup();
    setup();
    const row = await rowOf('丽水云游旅行社有限公司');
    await user.click(buttonIn(row, '删除'));
    await user.click(await screen.findByRole('button', { name: /确\s*定/ }));

    await waitFor(() => expect(removeCount).toBe(1));
    // 只弹一句「删除失败」是没用的：运营需要知道该做什么。
    // antd 的 confirm 会把标题渲染两份（.ant-modal-confirm-title 与无障碍副本），
    // 这里断言「至少出现一次」，不假设 DOM 结构细节
    expect(
      (await screen.findAllByText('该商户还有未结算的应付流水，不能删除')).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /去改为停用/ }));
    await screen.findByText(/审核状态不在这里改：只能走列表上的「审核」按钮/);
    expect(drawerOf()).toBeTruthy();
  });

  it('普通删除成功后提示并刷新列表', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('已拒绝商户');
    await user.click(buttonIn(row, '删除'));
    await user.click(await screen.findByRole('button', { name: /确\s*定/ }));

    await waitFor(() => expect(removeCount).toBe(1));
    expect(await screen.findByText('删除成功')).toBeInTheDocument();
  });
});
