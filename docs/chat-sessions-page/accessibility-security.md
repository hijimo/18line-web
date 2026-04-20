# 可访问性和安全

## 概述

本文档总结了聊天会话页面的可访问性实现和安全防护措施，确保所有用户都能使用，并保护用户免受安全威胁。

## 可访问性（Accessibility）

### ARIA 属性

#### 1. aria-label

为所有交互元素添加描述性标签。

**ChatHeader 组件**:

```tsx
<Button
  icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
  onClick={onToggleCollapse}
  aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
/>

<Button
  icon={<SettingOutlined />}
  onClick={onOpenSettings}
  aria-label="打开设置"
/>
```

**ChatInput 组件**:

```tsx
<TextArea
  ref={textAreaRef}
  value={value}
  onChange={handleChange}
  aria-label="消息输入框"
  placeholder="输入消息..."
/>
```

**ChatScrollButtons 组件**:

```tsx
<FloatButton
  icon={<UpOutlined />}
  tooltip="滚动到顶部"
  onClick={onScrollToTop}
  aria-label="滚动到顶部"
/>

<FloatButton
  icon={<DownOutlined />}
  tooltip="滚动到底部"
  onClick={onScrollToBottom}
  aria-label="滚动到底部"
/>
```

#### 2. role 属性

**ChatMessages 组件**:

```tsx
<div
  ref={scrollRef}
  className={styles.chatMessages}
  role="log"
  aria-live="polite"
>
  {/* 消息列表 */}
</div>
```

- `role="log"`: 标识为日志区域
- `aria-live="polite"`: 新消息到达时通知屏幕阅读器

#### 3. aria-busy（建议添加）

```tsx
<div aria-busy={isLoading}>
  {/* 加载中的内容 */}
</div>
```

### 键盘导航

#### 1. Tab 键导航

所有交互元素都支持 Tab 键导航：

- 会话列表项
- 新建会话按钮
- 搜索输入框
- 消息输入框
- 发送按钮
- 设置按钮
- 滚动按钮

#### 2. Enter 键操作

**ChatInput 组件**:

```tsx
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  // Enter 发送，Shift+Enter 换行
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!isGenerating && value.trim()) {
      onSend();
    }
  }
};
```

#### 3. 全局快捷键

**ChatPage 组件**:

```tsx
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Ctrl+L 或 Cmd+L 聚焦输入框
    if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
      event.preventDefault();
      chatUIRef.current?.focusInput();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}, []);
```

### 焦点管理

#### 1. 自动聚焦

使用 `useImperativeHandle` 暴露 focus 方法：

**ChatInput 组件**:

```tsx
export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  (props, ref) => {
    const textAreaRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        textAreaRef.current?.focus();
      },
    }));

    return <TextArea ref={textAreaRef} />;
  }
);
```

#### 2. 焦点指示

```css
:focus {
  outline: 2px solid #14b8a6;
  outline-offset: 2px;
}

:focus-visible {
  outline: 2px solid #14b8a6;
  outline-offset: 2px;
}
```

### 语义化 HTML

使用语义化标签提升可访问性：

```tsx
// 使用 button 而非 div
<button onClick={handleClick}>点击</button>

// 使用 nav 标识导航区域
<nav className={styles.sessionList}>
  {/* 会话列表 */}
</nav>

// 使用 main 标识主内容区域
<main className={styles.chatArea}>
  {/* 聊天内容 */}
</main>
```

### 文字可读性

#### 1. 字号

- **最小字号**: 12px（代码块移动端）
- **正文字号**: 14px
- **标题字号**: 16px - 24px

#### 2. 对比度

- **文字对比度**: 至少 4.5:1
- **大文字对比度**: 至少 3:1
- **UI 组件对比度**: 至少 3:1

#### 3. 行高

```css
line-height: 1.5; /* 正文 */
line-height: 1.2; /* 标题 */
```

### 触摸目标

确保触摸目标足够大：

- **按钮**: 至少 44x44px
- **链接**: 至少 44x44px
- **输入框**: 至少 44px 高度

```css
.button {
  min-width: 44px;
  min-height: 44px;
}
```

## 安全防护

### 1. XSS 防护

#### React 默认转义

React 自动转义用户输入，防止 XSS 攻击：

```tsx
// 安全：React 会自动转义
<div>{userInput}</div>
```

#### Markdown 安全模式

**MessageMarkdown 组件**:

```tsx
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  // 安全选项：禁止危险元素
  disallowedElements={['script', 'iframe']}
  unwrapDisallowed
  components={{
    // 自定义组件渲染
  }}
>
  {content}
</ReactMarkdown>
```

**禁止的元素**:

- `<script>`: 防止执行恶意脚本
- `<iframe>`: 防止嵌入恶意页面

### 2. 外部链接安全

**MessageMarkdown 组件**:

```tsx
components={{
  a: ({ node, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.link}
    />
  ),
}}
```

**安全属性**:

- `target="_blank"`: 在新标签页打开
- `rel="noopener"`: 防止新页面访问 window.opener
- `rel="noreferrer"`: 不发送 Referer 头

### 3. 输入验证

#### 表单验证

**ChatSettings 组件**:

```tsx
<Form.Item
  name="modelName"
  label="模型"
  rules={[{ required: true, message: '请选择模型' }]}
>
  <Select placeholder="请选择模型" />
</Form.Item>

<Form.Item
  name="temperature"
  label="温度"
  rules={[
    { required: true },
    { type: 'number', min: 0, max: 2 },
  ]}
>
  <Slider min={0} max={2} step={0.1} />
</Form.Item>
```

#### 消息内容验证

```tsx
const handleSend = () => {
  if (!userInput.trim()) {
    message.warning('输入内容不能为空');
    return;
  }
  
  if (userInput.length > 10000) {
    message.warning('消息内容过长');
    return;
  }
  
  onSendMessage(userInput.trim());
};
```

### 4. HTTPS 通信

所有 API 请求都应使用 HTTPS：

```typescript
// 使用相对路径，自动继承当前协议
const response = await fetch('/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(request),
});
```

### 5. 敏感信息保护

#### 不在客户端存储敏感信息

```typescript
// ❌ 错误：不要在 localStorage 存储敏感信息
localStorage.setItem('apiKey', 'secret-key');

// ✅ 正确：只存储非敏感配置
localStorage.setItem('chat-sidebar-collapsed', 'true');
```

#### 使用 HTTP-only Cookie

```typescript
// 由后端设置 HTTP-only Cookie
// 前端无法通过 JavaScript 访问
```

### 6. 内容安全策略（CSP）

建议在 HTML 中添加 CSP 头：

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    connect-src 'self' https://api.example.com;
  "
/>
```

### 7. 速率限制（后端）

建议后端实现速率限制：

```typescript
// 后端示例
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 最多 100 个请求
}));
```

## WCAG 2.1 合规性

### Level A（完全合规）

- ✅ 1.1.1 非文本内容：所有图片都有 alt 文本
- ✅ 1.3.1 信息和关系：使用语义化 HTML
- ✅ 2.1.1 键盘：所有功能都可通过键盘访问
- ✅ 2.4.1 绕过区块：提供跳转链接
- ✅ 3.1.1 页面语言：设置 lang 属性

### Level AA（基本合规）

- ✅ 1.4.3 对比度（最小）：文字对比度至少 4.5:1
- ✅ 1.4.5 文字图像：使用真实文字而非图片
- ✅ 2.4.7 焦点可见：焦点指示清晰可见
- ⏸️ 3.2.4 一致的识别：组件行为一致

### Level AAA（部分合规）

- ⏸️ 1.4.6 对比度（增强）：文字对比度至少 7:1
- ⏸️ 2.4.8 位置：提供面包屑导航
- ⏸️ 3.1.5 阅读水平：使用简单语言

## 测试工具

### 1. 自动化测试

- **axe DevTools**: Chrome 扩展，检测可访问性问题
- **Lighthouse**: Chrome DevTools，综合评分
- **WAVE**: 在线工具，可访问性评估

### 2. 手动测试

- **键盘导航**: 仅使用键盘操作
- **屏幕阅读器**: NVDA（Windows）、VoiceOver（macOS）
- **缩放测试**: 放大到 200% 测试可读性

### 3. 对比度检查

- **WebAIM Contrast Checker**: 在线工具
- **Contrast**: macOS 应用
- **Chrome DevTools**: 内置对比度检查

## 最佳实践

### 可访问性

1. ✅ 使用语义化 HTML
2. ✅ 添加 ARIA 属性
3. ✅ 支持键盘导航
4. ✅ 确保足够的对比度
5. ✅ 提供文字替代
6. ✅ 管理焦点状态

### 安全

1. ✅ 使用 HTTPS
2. ✅ 验证用户输入
3. ✅ 转义输出内容
4. ✅ 配置 CSP
5. ✅ 安全的外部链接
6. ⏸️ 实现速率限制

## 改进建议

### 可访问性

1. **添加跳转链接**: 允许用户跳过导航直接到主内容
2. **改进焦点指示**: 使用更明显的焦点样式
3. **添加键盘快捷键帮助**: 显示可用快捷键列表
4. **支持高对比度模式**: 检测系统设置并应用高对比度样式

### 安全

1. **实现 CSP**: 添加内容安全策略头
2. **添加 CSRF 保护**: 使用 CSRF token
3. **实现速率限制**: 防止滥用
4. **添加输入长度限制**: 防止 DoS 攻击
5. **日志和监控**: 记录安全事件

## 总结

聊天会话页面实现了良好的可访问性和安全防护：

**可访问性**:

- 完整的 ARIA 属性支持
- 键盘导航和快捷键
- 语义化 HTML
- 良好的对比度和可读性
- 焦点管理

**安全**:

- XSS 防护（React 转义 + Markdown 安全模式）
- 外部链接安全（noopener noreferrer）
- 输入验证
- HTTPS 通信

这些措施确保了所有用户都能使用页面，并保护用户免受常见的安全威胁。

## 参考资料

- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [React Security Best Practices](https://react.dev/learn/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
