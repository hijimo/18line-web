/**
 * iOS（Apple 支付）订单退款引导 —— 「点退款只给引导」的唯一文案来源
 *
 * ## 为什么要有这个文件
 *
 * 2026-10-19 生产事故：管理员对一笔 iOS 现网单（`rw_5` / 5 元）连点 3 次退款，
 * 每次都被微信以 `690000020「OS订单不支持开发者发起退款」` 拒绝，
 * 而后台文案是兜底那句「可修正后重试」——**这个码不可修正**，于是人被文案带着一直点。
 *
 * 后端随后加了入口拦截（`platform=ios` 直接拒，不出网、不烧微信频率配额），
 * 但拦截只解决「不让它失败」，没有解决「操作者下一步该做什么」。
 * 官方《虚拟支付：企业、个体户》§2.4「iOS 退款问询推送」#背景原文：
 * 「Apple 支付不支持开发者主动向用户发起退款，用户可在 App Store 申请退款」——
 * iOS 单的退款动作在**用户侧**，后台唯一能做的是把用户引导过去，所以引导就是全部功能。
 *
 * ## 为什么三处共用一份
 *
 * 引导会出现在三个位置：两个列表页的「退款」点击、退款弹窗的兜底渲染、
 * 后端返回 4019 时的提示。写三遍必然漂移，而漂移的代价是客服照着旧文案给用户指错路。
 * 所以**文案、判定口径、链接常量都只在本文件里有一份**，
 * 与「退款规则只在 RewardRefundModal 里有一份」是同一个原则。
 *
 * ## 与后端的口径一致性（改一边必须改另一边）
 *
 * - 判定：后端 `RewardConstants.isIosPlatform()` = trim + equalsIgnoreCase("ios")，
 *   这里逐字对齐；`null` / 空串 / `devtools` / `ohos` 一律**不算** iOS，
 *   否则鸿蒙单和脏数据单会被误挡在退款之外（那是能退的单，挡了就是资金功能失效）。
 * - 链接：后端 `RewardConstants.IOS_REFUND_DOC_URL` 存的是**不带锚点**的页面地址
 *   （纯文本会被复制进工单和客服对话，中文锚点在部分终端里会断），
 *   本文件额外提供带锚点直链，方便一键跳到那一节。两者指向同一篇文档。
 */
import { Modal, Typography } from 'antd';
import React from 'react';

/**
 * 微信官方原文直链（带锚点，直达 §2.4「iOS 退款问询推送」→ #背景）。
 *
 * 锚点是文档站自动生成的中文标题 id，这里用百分号编码形式，
 * 保证粘到任何地方都不会因为全角括号被截断。
 */
export const IOS_REFUND_DOC_URL =
  'https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment.html#iOS-%E9%80%80%E6%AC%BE%E9%97%AE%E8%AF%A2%E6%8E%A8%E9%80%81%EF%BC%88xpay-subscribe-ios-refund-query-notify%EF%BC%89';

/** 官方原文那一句，逐字引用。要能直接念给用户听，所以不做任何改写 */
export const IOS_REFUND_DOC_QUOTE =
  'Apple 支付不支持开发者主动向用户发起退款，用户可在 App Store 申请退款';

/** 用户侧申请入口（网页版，用户手边没有 iPhone 时用） */
export const APPLE_REPORT_PROBLEM_URL = 'https://reportaproblem.apple.com';

/**
 * 终端是否为 iOS（走 Apple 支付通道）。与后端 `RewardConstants.isIosPlatform` 同口径。
 *
 * 后端在 2026-10-19 之前各处散写 `equalsIgnoreCase`，已收敛成一个方法；
 * 前端同样只允许用这一个判定，不要在页面里再写 `platform === 'ios'`。
 */
export const isIosPlatform = (platform?: string | null): boolean =>
  (platform ?? '').trim().toLowerCase() === 'ios';

/**
 * 引导正文。列表页弹窗与退款弹窗兜底共用，所以不带任何外层容器样式，
 * 由调用方决定放在 Modal.content 还是 Alert 里。
 */
export const IosRefundGuide: React.FC<{ outTradeNo?: string | null }> = ({ outTradeNo }) => (
  <div>
    <p>
      这笔是 <b>iOS（Apple 支付）</b>订单，微信不允许开发者发起退款，后台点「退款」必然失败，
      <b>请不要重试</b>。退款动作在用户侧，请引导用户自行到 App Store 申请：
    </p>
    <ol style={{ margin: '8px 0', paddingLeft: 20 }}>
      <li>iPhone「设置」→ 点顶部自己的 Apple 账户</li>
      <li>「媒体与购买项目」→「查看账户」</li>
      <li>「购买记录」→ 找到本笔打赏 →「报告问题」</li>
    </ol>
    <p>
      用户手边没有 iPhone 时，可让其用浏览器打开{' '}
      <Typography.Link href={APPLE_REPORT_PROBLEM_URL} target="_blank" rel="noreferrer">
        reportaproblem.apple.com
      </Typography.Link>{' '}
      申请。
    </p>
    <p>
      用户申请后，Apple 会向我方发起<b>最多 3 次</b>退款问询（每次须 3 秒内应答，系统已自动应答，
      策略见参数 <Typography.Text code>reward.ios.refund.auto.block</Typography.Text>）， 最终由
      Apple 决定；退款成功后经 <Typography.Text code>xpay_refund_notify</Typography.Text>{' '}
      回推，系统自动冲销应付流水并把订单置为已退款终态，<b>无需人工再操作</b>。
    </p>
    <p style={{ marginBottom: 0 }}>
      依据（微信官方原文，可直接转给用户，也可用于和微信 / Apple 对质）：
      <br />
      <Typography.Link href={IOS_REFUND_DOC_URL} target="_blank" rel="noreferrer">
        《虚拟支付：企业、个体户》→ 2.4 消息推送 → iOS 退款问询推送 → 背景
      </Typography.Link>
      <br />
      <Typography.Text type="secondary">「{IOS_REFUND_DOC_QUOTE}」</Typography.Text>
    </p>
    {outTradeNo ? (
      <p style={{ marginBottom: 0, marginTop: 8 }}>
        业务订单号：<Typography.Text copyable>{outTradeNo}</Typography.Text>
      </p>
    ) : null}
  </div>
);

/**
 * 列表页点「退款」时用：**只弹引导**，不进退款表单、不发预览请求、不出网。
 *
 * 用 `Modal.info` 而不是 `Modal.warning/error`：这不是系统故障，也不是操作者做错了，
 * 是这条路本来就不通。红色弹窗会让人以为出事了，进而去找「重试」。
 */
export const showIosRefundGuide = (outTradeNo?: string | null): void => {
  Modal.info({
    title: 'iOS 订单不能在后台退款',
    width: 620,
    okText: '我知道了',
    content: <IosRefundGuide outTradeNo={outTradeNo} />,
  });
};
