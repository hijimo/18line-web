/**
 * 达人↔商家绑定页（menu 2240，仅 admin）测试。
 *
 * ## 这一组测试锁的是「文案与后端真实语义一致」，不是渲染
 * 后端 `DELETE /travel18/merchantExpert/{id}`（`TravelMerchantExpertController.java:167-173`，
 * `operationId=merchantExpertRemove`）内部调的是 `merchantExpertService.release(id)`，
 * **等价于软解绑**：历史绑定行与账单记录都保留。而本页曾经把确认弹窗写成
 * 「确定物理删除这条绑定记录吗？」+「删除会丢失换绑轨迹，对账时无法追溯」——
 * 这是**假的**，后果是 admin 不敢点、或者点了之后以为数据没了去查库。
 * 所以这里把 title/description 原文钉死，并显式断言不得出现「不可恢复」「物理删除」。
 *
 * ## 另一条被钉死的行为：**不按后端 msg 分支**
 * 后端 `remove()` 在幂等场景（该行本来就是解绑态）也返回成功，且 msg 是「解绑成功」，
 * 不像 `PUT /{id}/release` 会返回「该绑定已是解绑状态」。如果前端拿 msg 做判断
 * （例如"msg 里没有'已解绑'就报失败"），幂等重试就会误报。所以这里用两个用例覆盖：
 * 后端分别返回一个**与前端文案无关**的 msg（'操作成功'）和幂等场景的 msg（'解绑成功'），
 * 前端都必须提示同一句固定成功文案、且不得出现 error 提示。
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { message } from 'antd';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { server } from '../../../../mocks/server';
import { useAuthStore } from '@/stores/authStore';
import { render } from '@/test-utils';
import MerchantExpertPage from '../index';

const page = (rows: unknown[], total = rows.length) =>
  HttpResponse.json({ code: 200, msg: 'success', rows, total });

/** 生效中的绑定（有「解绑」+「删除」两个入口） */
const boundRow = {
  id: 11,
  merchantId: 3,
  merchantName: '某入驻商家',
  authorUserId: 77,
  authorNickname: '达人甲',
  bindStatus: '0',
  bindTime: '2026-09-01 10:00:00',
  unbindTime: null,
  settleRatio: 70,
  remark: '首次绑定',
};

/** 已解绑的绑定（只有「删除」入口）——用于幂等场景 */
const releasedRow = {
  id: 12,
  merchantId: 4,
  merchantName: '另一家商家',
  authorUserId: 78,
  authorNickname: '达人乙',
  bindStatus: '1',
  bindTime: '2026-08-01 09:00:00',
  unbindTime: '2026-08-20 18:30:00',
  // null = 平台不介入这层分配；显示 0% 会让商家以为平台承诺了 0 分成
  settleRatio: null,
  remark: null,
};

const rows = [boundRow, releasedRow];

/** 记录 DELETE 是否真的出网、打到哪个 id */
let deleteCalls: string[] = [];
let deleteMsg = '操作成功';

const handlers = [
  http.get('*/travel18/merchantExpert/list', () => page(rows)),
  http.delete('*/travel18/merchantExpert/:id', ({ params }) => {
    deleteCalls.push(String(params.id));
    return HttpResponse.json({ code: 200, msg: deleteMsg });
  }),
  // 筛选控件的数据源（不 stub 会走到 jsdom 网络错误 → request.ts 的 messageInstance 未初始化 → Unhandled Rejection）
  http.get('*/travel18/merchant/list', () =>
    page([{ merchantId: 3, merchantName: '某入驻商家', auditStatus: '1', status: '0' }]),
  ),
  http.get('*/system/role/list', () => page([{ roleId: 101, roleKey: 'daren', roleName: '达人' }])),
  http.get('*/system/role/authUser/allocatedList', () =>
    page([{ userId: 77, userName: 'daren1', nickName: '达人甲' }]),
  ),
];

/**
 * 断言出现过某条全局提示。
 * 刻意不按「最后一条」取值：拦截器与页面都会往 message 里写，顺序取决于 await 时机。
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

/** 最新一条提示的类型 class（用来断言"没有 error"） */
const lastNoticeType = () => {
  const notices = Array.from(document.querySelectorAll('.ant-message-notice'));
  const content = notices[notices.length - 1]?.querySelector('.ant-message-custom-content');
  return content?.className ?? '';
};

/** antd 会给两个汉字的按钮插空格，用宽松正则匹配按钮名 */
const buttonNamed = (name: string) =>
  screen.getByRole('button', { name: new RegExp(name.split('').join('\\s*')) });

/** 传文本或已拿到的元素都行（`findByText` 的返回值直接塞进来最容易踩） */
const rowOf = (textOrEl: string | HTMLElement) =>
  (typeof textOrEl === 'string' ? screen.getByText(textOrEl) : textOrEl).closest(
    'tr',
  ) as HTMLElement;

beforeEach(() => {
  server.use(...handlers);
  useAuthStore.setState({ user: { roles: ['admin'], permissions: ['*:*:*'] } as never });
  localStorage.clear();
  deleteCalls = [];
  deleteMsg = '操作成功';
  // ⚠️ 静态 message 的 DOM 挂在 body 上，RTL 的 cleanup 清不到；但只能删 .ant-message-notice，
  //    删掉 .ant-message 容器本身会让后续所有 message.xxx() 都不显示（极难归因）。
  message.destroy();
  document.querySelectorAll('.ant-message-notice').forEach((n) => n.remove());
});

describe('达人商户绑定 · 列表渲染', () => {
  it('渲染绑定行：商家名/达人昵称/状态中文/绑定与解绑时间/分账比例/备注', async () => {
    render(<MerchantExpertPage />);

    const bound = rowOf(await screen.findByText('某入驻商家'));
    expect(within(bound).getByText('达人甲')).toBeInTheDocument();
    expect(within(bound).getByText('生效中')).toBeInTheDocument();
    expect(within(bound).getByText('2026-09-01 10:00:00')).toBeInTheDocument();
    expect(within(bound).getByText('70%')).toBeInTheDocument();
    expect(within(bound).getByText('首次绑定')).toBeInTheDocument();

    const released = rowOf('另一家商家');
    expect(within(released).getByText('已解绑')).toBeInTheDocument();
    expect(within(released).getByText('2026-08-20 18:30:00')).toBeInTheDocument();
    // settleRatio=null 必须显示「平台不介入」，不能显示 0%
    expect(within(released).getByText('平台不介入')).toBeInTheDocument();
    expect(within(released).queryByText('0%')).not.toBeInTheDocument();
  });

  it('生效中的行有「解绑」+「删除」，已解绑的行只有「删除」（解绑不可重复）', async () => {
    render(<MerchantExpertPage />);
    await screen.findByText('某入驻商家');

    expect(within(rowOf('某入驻商家')).getByText('解绑')).toBeInTheDocument();
    expect(within(rowOf('另一家商家')).queryByText('解绑')).not.toBeInTheDocument();
    expect(within(rowOf('另一家商家')).getByText('删除')).toBeInTheDocument();
  });
});

describe('达人商户绑定 · 删除确认文案必须是软解绑语义', () => {
  it('title/description 原文钉死，且不得出现「不可恢复」「物理删除」', async () => {
    render(<MerchantExpertPage />);
    await screen.findByText('某入驻商家');

    fireEvent.click(within(rowOf('某入驻商家')).getByText('删除'));

    expect(await screen.findByText('确定删除这条绑定关系吗？')).toBeInTheDocument();
    expect(
      screen.getByText(
        '这只会解除绑定关系（软解绑），历史绑定与账单记录保留，不影响对账追溯。与「解绑」的差别：删除不要求填写原因，需要留痕请改用「解绑」。',
      ),
    ).toBeInTheDocument();

    // 这两句是**假的**（后端 remove() 就是 release()），一旦出现说明有人改回去了
    expect(screen.queryByText(/不可恢复/)).not.toBeInTheDocument();
    expect(screen.queryByText(/物理删除/)).not.toBeInTheDocument();
    expect(screen.queryByText(/丢失换绑轨迹/)).not.toBeInTheDocument();
  });
});

describe('达人商户绑定 · DELETE 出网且成功提示不依赖后端 msg', () => {
  it('确认删除 → DELETE /travel18/merchantExpert/11 出网，提示固定成功文案', async () => {
    // 后端 msg 与前端文案**无关**：若前端回显/依赖 msg，这条断言就会挂
    deleteMsg = '操作成功';
    render(<MerchantExpertPage />);
    await screen.findByText('某入驻商家');

    fireEvent.click(within(rowOf('某入驻商家')).getByText('删除'));
    fireEvent.click(buttonNamed('确认删除'));

    await expectMessage('已解除绑定关系（历史记录保留）');
    expect(deleteCalls).toEqual(['11']);
    expect(lastNoticeType()).toContain('ant-message-success');
    expect(lastNoticeType()).not.toContain('ant-message-error');
  });

  it('幂等场景：已解绑行再删一次，后端返回「解绑成功」，前端仍按成功提示（不对 msg 分支）', async () => {
    // 后端 remove() 对已是解绑态的行同样返回成功，msg 是「解绑成功」，
    // 而不是 PUT /{id}/release 那句「该绑定已是解绑状态」。
    // 前端若按 msg 分支（例如"没有'已删除'就报失败"），这条会挂。
    deleteMsg = '解绑成功';
    render(<MerchantExpertPage />);
    await screen.findByText('另一家商家');

    fireEvent.click(within(rowOf('另一家商家')).getByText('删除'));
    fireEvent.click(buttonNamed('确认删除'));

    await expectMessage('已解除绑定关系（历史记录保留）');
    expect(deleteCalls).toEqual(['12']);
    expect(lastNoticeType()).toContain('ant-message-success');
    expect(lastNoticeType()).not.toContain('ant-message-error');
  });
});
