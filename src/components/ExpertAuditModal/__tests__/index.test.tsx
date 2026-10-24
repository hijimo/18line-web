/**
 * 达人路线审核弹窗测试。
 *
 * 这里的红线是**报错可读性**：审核是资金动作（audit_status='1' 是下单闸门 G2 的必要条件），
 * 运营被拒时必须知道**为什么**被拒。线上曾出现后端返回
 * `{code:4103, msg:"不能审核自己提交的路线"}`、前端却只弹「服务器错误，请稍后重试」，
 * 运营无从判断该换人审核还是该报障（缺陷 49）。
 *
 * 组件本身的 catch 块是空的（只留了一句「拦截器已提示」注释）—— 它**完全依赖**统一拦截器，
 * 所以这组用例实际上是在守「所有走拦截器的页面」的报错可读性。
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test-utils';
import { App as AntdApp } from 'antd';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { AntdStaticProvider } from '@/components/AntdStaticProvider';
// 复用 setupTests 里已 listen 的全局 server，不要再 setupServer（会双重监听）
import { server } from '../../../../mocks/server';
import { ExpertAuditModal } from '../index';

const GENERIC = '服务器错误，请稍后重试';

const route = {
  routeId: 9001,
  routeTitle: '松阳三日·古村与茶园',
  auditStatus: '0',
  auditRemark: null,
  authorNickname: '达人甲',
  authorUserId: 77,
  dayCount: 3,
  attractionCount: 6,
} as never;

/** 所有屏幕上出现过的 antd message 文案 */
const toasts = () =>
  Array.from(document.querySelectorAll('.ant-message-notice')).map((n) => n.textContent ?? '');

// antd message 的 DOM 节点带 3s 存活期，会跨用例残留；不清掉会让 toasts() 读到上一条的文案
beforeEach(() => {
  document.querySelectorAll('.ant-message-notice').forEach((n) => n.remove());
});

const setup = (props?: Partial<React.ComponentProps<typeof ExpertAuditModal>>) => {
  const onClose = vi.fn();
  const onAudited = vi.fn();
  render(
    <AntdApp>
      <AntdStaticProvider>
        <ExpertAuditModal route={route} onClose={onClose} onAudited={onAudited} {...props} />
      </AntdStaticProvider>
    </AntdApp>,
  );
  return { onClose, onAudited };
};

const submit = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /提交审核结果/ }));
};

describe('达人路线审核弹窗 · 报错必须显示后端原文', () => {
  it('🔴 4103「不能审核自己提交的路线」原样弹给运营，不再是「服务器错误，请稍后重试」', async () => {
    const user = userEvent.setup();
    server.use(
      http.put('*/travel18/expertRoute/audit', () =>
        HttpResponse.json({ code: 4103, msg: '不能审核自己提交的路线' }),
      ),
    );
    const { onClose, onAudited } = setup();

    await submit(user);

    expect(await screen.findByText('不能审核自己提交的路线')).toBeInTheDocument();
    expect(toasts().join('|')).not.toContain(GENERIC);
    // 审核没成功：不能关弹窗、不能刷新列表，否则运营会以为已经审完了
    expect(onAudited).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('后端换一句原文（4103 无权访问该数据）也照样透出，说明不是对 4103 做了硬编码', async () => {
    const user = userEvent.setup();
    server.use(
      http.put('*/travel18/expertRoute/audit', () =>
        HttpResponse.json({ code: 4103, msg: '无权访问该数据' }),
      ),
    );
    setup();

    await submit(user);

    expect(await screen.findByText('无权访问该数据')).toBeInTheDocument();
    expect(toasts().join('|')).not.toContain(GENERIC);
  });

  it('后端真的炸了（HTTP 502 且响应体不是 JSON）才用通用文案，且不泄漏英文 axios 文本', async () => {
    const user = userEvent.setup();
    server.use(
      http.put('*/travel18/expertRoute/audit', () =>
        HttpResponse.text('<html>502 Bad Gateway</html>', {
          status: 502,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    );
    setup();

    await submit(user);

    expect(await screen.findByText(GENERIC)).toBeInTheDocument();
    expect(toasts().join('|')).not.toContain('Request failed');
  });

  it('同一句原文只弹一次：拦截器弹过之后，组件的空 catch 不会再补一条', async () => {
    const user = userEvent.setup();
    server.use(
      http.put('*/travel18/expertRoute/audit', () =>
        HttpResponse.json({ code: 4103, msg: '不能审核自己提交的路线' }),
      ),
    );
    setup();

    await submit(user);
    await screen.findByText('不能审核自己提交的路线');
    await waitFor(() => expect(toasts().length).toBeGreaterThan(0));

    expect(toasts().filter((t) => t.includes('不能审核自己提交的路线')).length).toBe(1);
  });
});

describe('达人路线审核弹窗 · 审核语义', () => {
  it('审核通过成功：提示成功、刷新列表并关闭弹窗', async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      http.put('*/travel18/expertRoute/audit', async ({ request }) => {
        calls += 1;
        const body = (await request.json()) as Record<string, unknown>;
        expect(body.auditStatus).toBe('1');
        return HttpResponse.json({ code: 200, msg: '操作成功' });
      }),
    );
    const { onClose, onAudited } = setup();

    await submit(user);

    expect(await screen.findByText('已通过审核')).toBeInTheDocument();
    await waitFor(() => expect(calls).toBe(1));
    expect(onAudited).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('选「拒绝」但没填意见：前端先拦，一次网都不出（服务层也会校验，但别让运营白等一个往返）', async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      http.put('*/travel18/expertRoute/audit', () => {
        calls += 1;
        return HttpResponse.json({ code: 200, msg: '操作成功' });
      }),
    );
    const { onAudited } = setup();

    await user.click(screen.getByLabelText(/拒绝/));
    await submit(user);

    // 前端校验先拦下来：表单里给出原因，且一次网都不出
    expect(await screen.findByText('拒绝时必须填写审核意见')).toBeInTheDocument();
    await waitFor(() => expect(calls).toBe(0));
    expect(onAudited).not.toHaveBeenCalled();
  });
});
