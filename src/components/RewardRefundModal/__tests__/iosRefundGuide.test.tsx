/**
 * iOS（Apple 支付）退款引导的定点回归。
 *
 * 这个组件没有任何逻辑分支可崩，但它承载的是**操作者唯一能照着做的下一步**：
 * 2026-10-19 管理员对一笔 iOS 现网单连点 3 次退款，就是因为界面只说了「退不了」，
 * 没说「那该去哪儿办」。所以这里测的不是渲染，而是三件会被人「顺手精简」掉的东西：
 *   1. 判定口径 `isIosPlatform` 必须与后端 `RewardConstants.isIosPlatform` 逐字一致
 *      —— 判宽了会把鸿蒙/安卓单挡在退款之外（那是能退的单，挡了就是资金功能失效），
 *         判窄了 iOS 单又会走进「点了必然失败」的弹窗；
 *   2. 用户侧的**逐级点击路径**必须在（只说「去 App Store」等于没说）；
 *   3. 微信官方原文链接必须在、且必须真的指向官方域名。
 */

import { screen } from '@testing-library/react';
import { render } from '@/test-utils';
import React from 'react';
import {
  APPLE_REPORT_PROBLEM_URL,
  IOS_REFUND_DOC_QUOTE,
  IOS_REFUND_DOC_URL,
  IosRefundGuide,
  isIosPlatform,
} from '../iosRefundGuide';

describe('isIosPlatform · 与后端 RewardConstants.isIosPlatform 同口径', () => {
  it('ios 的大小写与首尾空格变体都算 iOS', () => {
    ['ios', 'IOS', 'iOS', ' ios ', '\tios\n'].forEach((raw) => {
      expect(isIosPlatform(raw)).toBe(true);
    });
  });

  it('安卓/鸿蒙/Windows/devtools/空值一律不算 iOS（挡错单 = 资金功能失效）', () => {
    ['android', 'ohos', 'ohos_pc', 'windows', 'devtools', '', ' ', 'iosx', null, undefined].forEach(
      (raw) => {
        expect(isIosPlatform(raw as string | null | undefined)).toBe(false);
      },
    );
  });
});

describe('IosRefundGuide · 引导内容', () => {
  it('给出用户侧逐级点击路径，而不是只说「去 App Store」', () => {
    render(<IosRefundGuide outTradeNo="R261019221457FDXM9B" />);

    // 客服要能照着念给用户听，缺任何一级用户都会卡在半路回来再问一次
    expect(screen.getByText(/iPhone「设置」/)).toBeInTheDocument();
    expect(screen.getByText(/媒体与购买项目/)).toBeInTheDocument();
    expect(screen.getByText(/购买记录/)).toBeInTheDocument();
    expect(screen.getByText(/报告问题/)).toBeInTheDocument();
    // 没有 iPhone 在手时的网页入口
    const web = screen.getByRole('link', { name: 'reportaproblem.apple.com' });
    expect(web).toHaveAttribute('href', APPLE_REPORT_PROBLEM_URL);
    expect(web).toHaveAttribute('target', '_blank');
  });

  it('附微信官方原文链接，且确实指向微信开放文档的那一节', () => {
    render(<IosRefundGuide />);

    const doc = screen.getByRole('link', { name: /虚拟支付：企业、个体户/ });
    expect(doc).toHaveAttribute('href', IOS_REFUND_DOC_URL);
    expect(doc).toHaveAttribute('target', '_blank');
    // 域名与锚点都要锁：换成博客/换成不带锚点的页面，操作者就得自己翻整篇文档
    expect(IOS_REFUND_DOC_URL).toContain('developers.weixin.qq.com');
    expect(IOS_REFUND_DOC_URL).toContain('virtual-payment.html#');
    expect(IOS_REFUND_DOC_URL).toContain('xpay-subscribe-ios-refund-query-notify');
    // 原文那句要逐字在，避免被当成我们自己定的规则
    expect(screen.getByText(new RegExp(IOS_REFUND_DOC_QUOTE))).toBeInTheDocument();
  });

  it('掐掉重试念头，且不得出现「可修正后重试」这类误导文案', () => {
    render(<IosRefundGuide />);

    expect(screen.getByText(/请不要重试/)).toBeInTheDocument();
    expect(screen.getByText(/无需人工再操作/)).toBeInTheDocument();
    // 这句是 2026-10-19 事故的直接诱因：iOS 单不可修正，出现它就是又一次误导
    expect(screen.queryByText(/可修正后重试/)).not.toBeInTheDocument();
  });

  it('带 outTradeNo 时回显业务订单号（客服要拿它去查单），不带时不渲染空行', () => {
    const { unmount } = render(<IosRefundGuide outTradeNo="R261019221457FDXM9B" />);
    expect(screen.getByText('R261019221457FDXM9B')).toBeInTheDocument();
    unmount();

    render(<IosRefundGuide />);
    expect(screen.queryByText('业务订单号：')).not.toBeInTheDocument();
  });
});
