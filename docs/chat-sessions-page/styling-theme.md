# 样式和主题

## 概述

本文档总结了聊天会话页面的样式设计和主题应用，包括主题色、响应式布局、CSS 架构等。

## 主题色

### Teal 主题色系

项目使用 Teal（青色）作为主题色，营造现代、清新的视觉效果。

**主色**: `#14b8a6` (teal-500)
**深色**: `#0d9488` (teal-600)
**浅色**: `rgba(20, 184, 166, 0.1)` (teal-500 with 10% opacity)

### 主题色应用

#### 1. ChatHeader 组件

**渐变背景**:

```css
.chatHeader {
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
}
```

#### 2. 用户消息

**背景色**:

```css
.userMessage .messageContent {
  background-color: #14b8a6;
  color: #fff;
}
```

#### 3. 发送按钮

**按钮样式**:

```css
.sendButton {
  background-color: #14b8a6;
  border-color: #14b8a6;
}

.sendButton:hover {
  background-color: #0d9488;
  border-color: #0d9488;
}
```

#### 4. 会话选中状态

**选中样式**:

```css
.sessionItem.active .title {
  color: #14b8a6;
  font-weight: 600;
}

.sessionItem.active .messageCount {
  color: #14b8a6;
}
```

#### 5. 输入框焦点

**焦点样式**:

```css
.textarea:focus {
  border-color: #14b8a6;
  box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.1);
}
```

#### 6. 保存指示器

**指示器样式**:

```css
.savingIndicator {
  background-color: #14b8a6;
  color: #fff;
}
```

#### 7. 生成中动画

**动画点**:

```css
.dot {
  background-color: #14b8a6;
  animation: bounce 1.4s infinite ease-in-out both;
}
```

## 响应式布局

### 断点设置

- **桌面端**: > 768px
- **移动端**: ≤ 768px

### 桌面端布局

**ChatPage**:

```css
.chatPage {
  display: flex;
  height: calc(100vh - 64px);
}

.sessionList {
  width: 280px;
  flex-shrink: 0;
}

.chatArea {
  flex: 1;
  display: flex;
  flex-direction: column;
}
```

### 移动端布局

#### ChatHeader

```css
@media (max-width: 768px) {
  .chatHeader {
    height: 56px;
    padding: 0 16px;
  }

  .title {
    font-size: 16px;
  }
}
```

#### ChatInput

```css
@media (max-width: 768px) {
  .chatInput {
    padding: 12px 16px;
  }

  .textarea {
    font-size: 14px;
  }

  .sendButton {
    height: 36px;
    padding: 0 16px;
  }
}
```

#### Message

```css
@media (max-width: 768px) {
  .messageContent {
    max-width: 85%;
  }

  .avatar {
    width: 32px;
    height: 32px;
  }
}
```

#### MessageMarkdown

```css
@media (max-width: 768px) {
  .markdown {
    font-size: 13px;
  }

  .markdown h1 {
    font-size: 20px;
  }

  .markdown h2 {
    font-size: 18px;
  }
}
```

#### MessageCodeBlock

```css
@media (max-width: 768px) {
  .code {
    font-size: 12px;
  }

  .header {
    padding: 6px 12px;
  }
}
```

## CSS 架构

### CSS Modules

所有组件使用 CSS Modules 实现样式隔离。

**命名规范**:

- 文件名: `index.module.css`
- 类名: camelCase（如 `.chatHeader`, `.messageContent`）

**示例**:

```tsx
import styles from './index.module.css';

export const Component = () => {
  return <div className={styles.container}>Content</div>;
};
```

### 样式组织

每个组件的样式文件包含：

1. **组件主样式**: 基础布局和样式
2. **状态样式**: hover、active、disabled 等
3. **响应式样式**: 媒体查询
4. **动画**: keyframes 和 transition

**示例结构**:

```css
/* 组件主样式 */
.component {
  /* 基础样式 */
}

/* 状态样式 */
.component:hover {
  /* 悬停样式 */
}

.component.active {
  /* 激活样式 */
}

/* 响应式样式 */
@media (max-width: 768px) {
  .component {
    /* 移动端样式 */
  }
}

/* 动画 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## 颜色系统

### 主色

- **Primary**: `#14b8a6` (teal-500)
- **Primary Dark**: `#0d9488` (teal-600)
- **Primary Light**: `rgba(20, 184, 166, 0.1)`

### 中性色

- **White**: `#ffffff`
- **Gray 50**: `#fafafa`
- **Gray 100**: `#f3f4f6`
- **Gray 200**: `#e8e8e8`
- **Gray 400**: `#d9d9d9`
- **Gray 600**: `#8c8c8c`
- **Gray 800**: `#595959`
- **Black**: `#000000`

### 语义色

- **Success**: `#52c41a` (green)
- **Warning**: `#faad14` (orange)
- **Error**: `#ff4d4f` (red)
- **Info**: `#1890ff` (blue)

## 字体系统

### 字体族

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
  'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
  'Noto Color Emoji';
```

### 字号

- **最小字号**: 12px（代码块移动端）
- **正文字号**: 14px
- **标题字号**: 16px - 24px
- **大标题**: 20px - 28px

### 字重

- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

## 间距系统

### 基础间距

- **4px**: 最小间距
- **8px**: 小间距
- **12px**: 中小间距
- **16px**: 中等间距
- **24px**: 大间距
- **32px**: 超大间距

### 组件间距

- **Padding**: 12px - 24px
- **Margin**: 8px - 24px
- **Gap**: 4px - 16px

## 圆角系统

- **Small**: 4px
- **Medium**: 8px
- **Large**: 12px
- **Circle**: 50%

## 阴影系统

### 卡片阴影

```css
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
```

### 悬浮阴影

```css
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
```

### 深度阴影

```css
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
```

## 动画系统

### 过渡动画

```css
transition: all 0.3s ease;
```

### 淡入动画

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 弹跳动画

```css
@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
```

## 可访问性

### 对比度

- **文字对比度**: 至少 4.5:1
- **大文字对比度**: 至少 3:1
- **UI 组件对比度**: 至少 3:1

### 焦点指示

```css
:focus {
  outline: 2px solid #14b8a6;
  outline-offset: 2px;
}
```

### 最小触摸目标

- **按钮**: 至少 44x44px
- **链接**: 至少 44x44px
- **输入框**: 至少 44px 高度

## 暗色模式（未实现）

### 建议实现

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1a1a1a;
    --bg-secondary: #2d2d2d;
    --text-primary: #ffffff;
    --text-secondary: #a0a0a0;
    --border-color: #404040;
  }
}
```

## 最佳实践

### 1. 使用 CSS Modules

- ✅ 避免全局样式污染
- ✅ 类名自动生成唯一标识
- ✅ 支持组合和继承

### 2. 响应式设计

- ✅ 移动优先或桌面优先
- ✅ 使用媒体查询
- ✅ 测试不同屏幕尺寸

### 3. 性能优化

- ✅ 避免过度嵌套
- ✅ 使用 CSS 变量
- ✅ 合理使用动画

### 4. 可维护性

- ✅ 统一命名规范
- ✅ 组织清晰的文件结构
- ✅ 添加必要的注释

## 组件样式示例

### ChatHeader

```css
.chatHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

@media (max-width: 768px) {
  .chatHeader {
    height: 56px;
    padding: 0 16px;
  }

  .title {
    font-size: 16px;
  }
}
```

### Message

```css
.messageWrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.userMessage {
  justify-content: flex-end;
}

.userMessage .messageContent {
  background-color: #14b8a6;
  color: #fff;
  padding: 12px 16px;
  border-radius: 12px;
  border-bottom-right-radius: 4px;
}

@media (max-width: 768px) {
  .messageContent {
    max-width: 85%;
  }
}
```

## 总结

聊天会话页面采用了统一的 Teal 主题色系，实现了完整的响应式布局。通过 CSS Modules 实现样式隔离，确保了代码的可维护性。所有组件都遵循统一的设计规范，提供了良好的视觉体验和可访问性。

## 参考资料

- [CSS Modules](https://github.com/css-modules/css-modules)
- [Responsive Web Design](https://web.dev/responsive-web-design-basics/)
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [Ant Design Colors](https://ant.design/docs/spec/colors)
