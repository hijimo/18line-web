/**
 * 打赏档位（虚拟支付道具）页测试。
 *
 * 重点不是「渲染出来了」，而是**资金安全与状态语义不变量**：
 *   - 「上传中」必须禁用上传按钮：重复提交必撞微信 268490012，
 *     表现为「明明提交成功了却报失败」
 *   - 未上传成功的档位不能发布（后端 4044 的前置守卫，页面先挡一层）
 *   - start 接口受理成功（pending=true）必须提示「等待微信处理」，不能显示「已完成」
 *   - 4045 价格不一致必须强提示并禁用发布：本地按 A 价记账、用户按微信侧 B 价付款＝资损
 *   - 已上传档位的单价/道具ID/环境必须锁死（后端 4046 的前置提示）
 *   - 单价以「元」录入、以「分」出网，换算必须 round
 * 这几条一旦回归，直接后果是档位挂在中间态、或按错误价格把道具发布出去。
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test-utils';
import { message, Modal } from 'antd';
import dayjs from 'dayjs';
import { http, HttpResponse } from 'msw';
import React from 'react';
// 复用 setupTests 里已 listen 的全局 server。
// 不要在测试文件里再 setupServer：msw 2.14 下两个 server 同时监听，
// 同一个请求会被处理两次，「一次点击只能出网一次」的断言会假失败。
import { server } from '../../../../mocks/server';
import RewardTier from '../index';

/** 业务失败同样是 HTTP 层 code=200，业务码在 data.code —— 与后端控制器契约一致 */
const ok = (data?: unknown, msg = '操作成功') => HttpResponse.json({ code: 200, msg, data });
const page = (rows: unknown[], total = rows.length) =>
  HttpResponse.json({ code: 200, msg: 'success', rows, total });

const future = dayjs().add(8, 'minute').format('YYYY-MM-DD HH:mm:ss');
const past = dayjs().subtract(30, 'minute').format('YYYY-MM-DD HH:mm:ss');

/** 六种典型档位状态，覆盖上传/发布状态机的每个分支 */
const tiers = [
  {
    tierId: 1,
    tierCode: 'T001',
    tierName: '鼓励一下',
    wxProductId: 'rw-1',
    priceFen: 100,
    env: '0',
    isTest: '0',
    allowPlatforms: 'android,ios,ohos,ohos_pc,windows',
    itemUrl: 'https://cdn.example.com/rw-1.png',
    uploadStatus: '0',
    publishStatus: '0',
    sortOrder: 1,
    status: '0',
  },
  {
    tierId: 2,
    tierCode: 'T005',
    tierName: '小心意',
    wxProductId: 'rw-5',
    priceFen: 500,
    env: '0',
    isTest: '0',
    itemUrl: 'https://cdn.example.com/rw-5.png',
    uploadStatus: '3', // 上传中
    publishStatus: '0',
    goodsMsg: '上传任务已提交，等待微信处理',
    sortOrder: 2,
    status: '0',
  },
  {
    tierId: 3,
    tierCode: 'T010',
    tierName: '支持作者',
    wxProductId: 'rw-10',
    priceFen: 1000,
    env: '0',
    isTest: '0',
    itemUrl: 'https://cdn.example.com/rw-10.png',
    uploadStatus: '1', // 已上传，未发布
    publishStatus: '0',
    sortOrder: 3,
    status: '0',
  },
  {
    tierId: 4,
    tierCode: 'T020',
    tierName: '大力支持',
    wxProductId: 'rw-20',
    priceFen: 2000,
    env: '0',
    isTest: '0',
    itemUrl: 'https://cdn.example.com/rw-20.png',
    uploadStatus: '1',
    publishStatus: '2', // 已发布
    publishTime: past,
    effectiveTime: future, // 但还没到生效时间
    sortOrder: 4,
    status: '0',
  },
  {
    tierId: 5,
    tierCode: 'T030',
    tierName: '非常感谢',
    wxProductId: 'rw-30',
    priceFen: 3000,
    env: '0',
    isTest: '0',
    itemUrl: 'https://cdn.example.com/rw-30.png',
    uploadStatus: '1',
    publishStatus: '2',
    publishTime: past,
    effectiveTime: past, // 已生效
    sortOrder: 5,
    status: '0',
  },
  {
    tierId: 6,
    tierCode: 'S001',
    tierName: '沙箱一分档',
    wxProductId: 'rw-sandbox-1',
    priceFen: 1,
    env: '1', // 沙箱
    isTest: '1',
    itemUrl: 'https://cdn.example.com/rw-sandbox-1.png',
    uploadStatus: '0',
    publishStatus: '0',
    sortOrder: 1,
    status: '0',
  },
];

let uploadCount = 0;
let publishCount = 0;
let addBody: any = null;
let editBody: any = null;

const handlers = [
  http.get('*/travel18/reward/tier/list', () => page(tiers)),
  // 注意顺序：/sync/pending 与 /sync 必须排在 /:tierId 之前，否则会被路径参数吃掉
  http.post('*/travel18/reward/tier/sync/pending', () =>
    ok(
      [
        {
          env: '0',
          scanned: 1,
          uploaded: 0,
          published: 0,
          failed: 0,
          pending: 1,
          priceMismatched: 1,
          updated: 0,
          callFailed: 0,
          costMs: 320,
          details: ['T005 本地 500 分 / 微信侧 100 分，已禁止发布'],
        },
      ],
      '环境0 扫描1 处理中1 价格不一致1',
    ),
  ),
  http.post('*/travel18/reward/tier/sync', () => ok({ env: '0', scanned: 6 }, '全量对账完成')),
  http.post('*/travel18/reward/tier/:tierId/upload', () => {
    uploadCount += 1;
    return ok({
      success: true,
      code: 0,
      message: '上传任务已提交，微信正在处理；请稍后点「同步道具状态」确认结果',
      tierId: 1,
      pending: true,
      uploadStatus: '3',
      publishStatus: '0',
    });
  }),
  http.post('*/travel18/reward/tier/:tierId/publish', () => {
    publishCount += 1;
    return ok({
      success: true,
      code: 0,
      message: '发布任务已提交，微信正在处理；发布成功后约 10 分钟生效',
      tierId: 3,
      pending: true,
      uploadStatus: '1',
      publishStatus: '1',
    });
  }),
  http.post('*/travel18/reward/tier', async ({ request }) => {
    addBody = await request.json();
    return ok({ tierId: 99 }, '新增成功');
  }),
  http.put('*/travel18/reward/tier', async ({ request }) => {
    editBody = await request.json();
    return ok(null, '修改成功');
  }),
  http.get('*/travel18/reward/tier/:tierId', ({ params }) => {
    const row = tiers.find((t) => t.tierId === Number(params.tierId));
    return HttpResponse.json({
      code: 200,
      msg: '操作成功',
      data: row,
      // availableForUser 是后端 RewardTierGate 的权威结论，只有详情接口给
      availableForUser: row?.tierId === 5,
    });
  }),
];

beforeEach(() => {
  uploadCount = 0;
  publishCount = 0;
  addBody = null;
  editBody = null;
  server.use(...handlers);
});

afterEach(() => {
  // antd 的 message / Modal 挂在 body 上，不受 RTL cleanup 管理，
  // 不清掉会串到下一个用例
  message.destroy();
  Modal.destroyAll();
});

const setup = () => render(<RewardTier />);

/** 按档位码定位所在行，断言才能精确到「这一行的按钮」 */
const rowOf = async (tierCode: string) => {
  const cell = await screen.findByText(tierCode);
  const row = cell.closest('tr');
  if (!row) throw new Error(`未找到 ${tierCode} 所在行`);
  return row as HTMLElement;
};

/**
 * 取行内按钮。
 * 带图标的按钮可访问名会拼上图标 aria-label（如 "cloud-upload 上传道具"），
 * 所以统一用正则匹配，不能用全等字符串。
 */
const buttonIn = (row: HTMLElement, name: string | RegExp) =>
  within(row).getByRole('button', { name: typeof name === 'string' ? new RegExp(name) : name });

describe('打赏档位页 · 列表与状态语义', () => {
  it('按后端枚举翻译上传/发布状态，金额以分传输以元展示', async () => {
    setup();
    await rowOf('T001');
    expect(screen.getAllByText('未上传').length).toBeGreaterThan(0);
    expect(screen.getAllByText('上传中').length).toBeGreaterThan(0);
    expect(screen.getAllByText('已上传').length).toBeGreaterThan(0);
    expect(screen.getAllByText('已发布').length).toBeGreaterThan(0);
    // 500 分 = 5.00 元；若直接显示 500 说明单位没换算，运营会按 500 元配道具
    expect(screen.getAllByText('5.00 元').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0.01 元').length).toBeGreaterThan(0);
  });

  it('现网已发布但未到生效时间显示「等待生效」，已生效显示「已生效」，沙箱不校验', async () => {
    setup();
    await rowOf('T001');
    // 「已发布 ≠ 已生效」是本页最容易误导运营的一点：
    // 生效前前台不下发，用户点进去会拿到微信 -15014
    expect(screen.getAllByText(/等待生效/).length).toBe(1);
    expect(screen.getAllByText('已生效').length).toBe(1);
    expect(screen.getAllByText('沙箱不校验生效').length).toBe(1);
  });

  it('上传中的档位禁用上传按钮，避免重复提交撞 268490012', async () => {
    setup();
    const row = await rowOf('T005');
    const btn = buttonIn(row, '上传中');
    expect(btn).toBeDisabled();
  });

  it('发布按钮只对「已上传成功」的档位开放', async () => {
    setup();
    // T001 未上传 → 禁用；T010 已上传未发布 → 可点
    expect(buttonIn(await rowOf('T001'), /发布道具/)).toBeDisabled();
    expect(buttonIn(await rowOf('T010'), /发布道具/)).toBeEnabled();
    // T020 已发布 → 显示「已发布」且禁用（改价必须换道具ID）
    expect(buttonIn(await rowOf('T020'), '已发布')).toBeDisabled();
  });
});

describe('打赏档位页 · 道具上传/发布（异步任务语义）', () => {
  it('受理成功（pending=true）提示「等待微信处理」，不显示「上传成功」，且只出网一次', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('T001');
    await user.click(buttonIn(row, /上传道具/));
    await user.click(await screen.findByRole('button', { name: /确\s*定/ }));

    expect(await screen.findByText(/等待微信处理/)).toBeInTheDocument();
    expect(screen.queryByText('上传成功')).toBeNull();
    await waitFor(() => expect(uploadCount).toBe(1));
  });

  it('发布受理成功同样提示等待，而不是「发布成功」', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('T010');
    await user.click(buttonIn(row, /发布道具/));
    await user.click(await screen.findByRole('button', { name: /确\s*定/ }));

    expect(await screen.findByText(/等待微信处理/)).toBeInTheDocument();
    expect(screen.queryByText('发布成功')).toBeNull();
    await waitFor(() => expect(publishCount).toBe(1));
  });

  it('4045 价格不一致：强提示 + 该行发布按钮禁用并打「价格不一致」标签', async () => {
    server.use(
      http.post('*/travel18/reward/tier/:tierId/publish', () => {
        publishCount += 1;
        return ok({
          success: false,
          code: 4045,
          message:
            '本地单价与微信侧道具价格不一致：本地 1000 分，微信侧 500 分。已阻止发布——按此发布用户会按微信侧价格付款，而订单与商家分成按本地价格记账，会造成资损',
          tierId: 3,
          priceMismatch: true,
          wxPriceFen: 500,
          uploadStatus: '1',
          publishStatus: '0',
        });
      }),
    );
    const user = userEvent.setup();
    setup();
    const row = await rowOf('T010');
    await user.click(buttonIn(row, /发布道具/));
    await user.click(await screen.findByRole('button', { name: /确\s*定/ }));

    // 资损红线必须挡住：既给出微信侧真实价格，也把发布按钮锁掉
    // antd 的 confirm 会把标题渲染两份（.ant-modal-confirm-title 与无障碍副本），
    // 这里断言「至少出现一次」，不假设 DOM 结构细节
    expect((await screen.findAllByText('价格不一致，已阻止发布')).length).toBeGreaterThan(0);
    const modal = document.querySelector('.ant-modal-confirm') as HTMLElement;
    expect(within(modal).getAllByText('5.00 元').length).toBeGreaterThan(0);

    Modal.destroyAll();
    await waitFor(() => {
      const rowAfter = screen.getByText('T010').closest('tr') as HTMLElement;
      expect(within(rowAfter).getByText('价格不一致')).toBeInTheDocument();
      expect(within(rowAfter).getByRole('button', { name: /发布道具/ })).toBeDisabled();
    });
    await waitFor(() => expect(publishCount).toBe(1));
  });

  it('4043 同环境已有任务在运行：按「等待处理」提示，不当成失败', async () => {
    server.use(
      http.post('*/travel18/reward/tier/:tierId/upload', () =>
        ok({
          success: false,
          code: 4043,
          message: '该档位已有上传任务在处理中，请点「同步道具状态」查看结果后再决定',
          tierId: 1,
          pending: true,
        }),
      ),
    );
    const user = userEvent.setup();
    setup();
    const row = await rowOf('T001');
    await user.click(buttonIn(row, /上传道具/));
    await user.click(await screen.findByRole('button', { name: /确\s*定/ }));

    expect(await screen.findByText(/已有上传任务在处理中/)).toBeInTheDocument();
    expect(document.querySelectorAll('.ant-message-error').length).toBe(0);
  });

  it('同步待处理档位后展示摘要，并对「价格不一致」给出红色告警', async () => {
    const user = userEvent.setup();
    setup();
    await rowOf('T001');
    await user.click(screen.getByRole('button', { name: /同步道具状态/ }));

    expect((await screen.findAllByText('待处理档位同步结果')).length).toBeGreaterThan(0);
    expect(await screen.findByText(/检出 1 个档位本地价格与微信侧不一致/)).toBeInTheDocument();
  });
});

describe('打赏档位页 · 编辑锁与金额换算', () => {
  it('已上传档位的单价/道具ID/环境被锁死（后端 4046 的前置提示）', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('T010');
    await user.click(within(row).getByRole('button', { name: '编辑' }));

    expect(await screen.findByText('该档位道具已上传至微信')).toBeInTheDocument();
    const wxId = screen.getByPlaceholderText('如 rw-5');
    expect(wxId).toBeDisabled();
    // 单价用 InputNumber 渲染，取输入框本体
    const priceInput = document.querySelector('input[placeholder="如 5.00"]') as HTMLInputElement;
    expect(priceInput).toBeDisabled();
  });

  it('未上传档位可以改价，保存时元→分（5 元 = 500 分）', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('T001');
    await user.click(within(row).getByRole('button', { name: '编辑' }));
    await screen.findByText('保存只是写入本地配置，用户还看不到');

    const priceInput = document.querySelector('input[placeholder="如 5.00"]') as HTMLInputElement;
    expect(priceInput).toBeEnabled();
    await user.clear(priceInput);
    await user.type(priceInput, '5');

    const drawer = document.querySelector('.ant-drawer-content') as HTMLElement;
    await user.click(within(drawer).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(editBody).not.toBeNull());
    // priceFen 必须是整数分：浮点误差会让每笔订单的分成都对不上微信侧实收
    expect(editBody.priceFen).toBe(500);
    expect(editBody.tierId).toBe(1);
    // ⚠️ 必须 await findByText，不能用同步 getByText（缺陷 63）：
    // 上面那句 waitFor 只等到**请求发出**（editBody 被赋值），
    // 而「档位已保存」是请求**返回后**在 .then() 里弹的，两者之间隔着一次微任务 + 一次渲染。
    // 单独跑本文件时这段间隔足够短，全量并发时（CPU 被其它测试文件占满）就不够了，
    // 表现为「单跑 14/14 绿、全量必挂」，且报错指向的是断言本身，看起来像保存逻辑坏了。
    await screen.findByText('档位已保存');
  });

  it('新增档位时选常用金额 5 元，出网请求体是 priceFen=500', async () => {
    const user = userEvent.setup();
    setup();
    await rowOf('T001');
    await user.click(screen.getByRole('button', { name: /新增档位/ }));
    await screen.findByText('保存只是写入本地配置，用户还看不到');

    const drawer = document.querySelector('.ant-drawer-content') as HTMLElement;
    await user.type(within(drawer).getByPlaceholderText('如 T005'), 'T099');
    await user.type(within(drawer).getByPlaceholderText(/前台展示为/), '测试档位');
    await user.type(within(drawer).getByPlaceholderText('如 rw-5'), 'rw-99');
    await user.type(
      within(drawer).getByPlaceholderText('https://.../reward-5.png'),
      'https://cdn.example.com/rw-99.png',
    );

    // 常用金额下拉：产品定的档位是 1/5/10/20/30 元，另有 1 分档用于真机联调。
    // 占位文本自身是 pointer-events:none，必须点 .ant-select-selector 才能展开
    const presetSelect = within(drawer).getByText('常用金额').closest('.ant-select') as HTMLElement;
    await user.click(presetSelect.querySelector('.ant-select-selector') as HTMLElement);
    await user.click(await screen.findByText('5 元'));
    await waitFor(() =>
      expect(
        (document.querySelector('input[placeholder="如 5.00"]') as HTMLInputElement).value,
      ).toBe('5.00'),
    );

    await user.click(within(drawer).getByRole('button', { name: /保\s*存/ }));
    await waitFor(() => expect(addBody).not.toBeNull());
    expect(addBody.priceFen).toBe(500);
    expect(addBody.tierCode).toBe('T099');
    expect(addBody.wxProductId).toBe('rw-99');
    expect(addBody.env).toBe('0');
    // 多选终端以逗号分隔入库，与后端 allow_platforms 存储格式一致。
    // 这里刻意写死字面量而不是引用 DEFAULT_ALLOW_PLATFORMS：默认值一旦被人改动，
    // 本断言必须失败并迫使改动者去核对后端白名单与档位种子数据。
    // 鸿蒙必须是 ohos / ohos_pc —— 微信 platform 官方合法值里没有 harmony，
    // 写错会让鸿蒙真机拿不到任何档位，前台只显示「打赏暂未开放」且服务端零日志。
    expect(addBody.allowPlatforms).toBe('android,ios,ohos,ohos_pc,windows');
  });
});

describe('打赏档位页 · 详情（后端权威判定）', () => {
  it('详情展示 availableForUser，已生效档位判定为「对前台可用」', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('T030');
    await user.click(within(row).getByRole('button', { name: '详情' }));

    expect(await screen.findByText('后端判定：当前对前台可用')).toBeInTheDocument();
  });

  it('已发布但未到生效时间的档位，后端判定为「对前台不可用」', async () => {
    const user = userEvent.setup();
    setup();
    const row = await rowOf('T020');
    await user.click(within(row).getByRole('button', { name: '详情' }));

    expect(await screen.findByText('后端判定：当前对前台不可用')).toBeInTheDocument();
  });
});
