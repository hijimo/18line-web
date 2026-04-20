# 聊天页面快捷键

## 概述

聊天页面支持多种键盘快捷键，提升用户输入效率和操作体验。

## 支持的快捷键

### 消息输入

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Enter` | 发送消息 | 在输入框中按 Enter 键发送当前消息 |
| `Shift + Enter` | 插入换行 | 在消息中插入换行符，支持多行输入 |

### 全局快捷键

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Ctrl + L` (Windows/Linux) | 聚焦输入框 | 快速将光标定位到消息输入框 |
| `Cmd + L` (macOS) | 聚焦输入框 | 快速将光标定位到消息输入框 |

## 实现细节

### 组件架构

快捷键功能通过以下组件层级实现：

```
ChatPage (全局快捷键监听)
  └─ ChatUI (暴露 focusInput 方法)
      └─ ChatInput (暴露 focus 方法)
```

### 技术实现

1. **ChatInput 组件**
   - 使用 `forwardRef` 包裹组件
   - 使用 `useRef` 获取 TextArea 引用
   - 使用 `useImperativeHandle` 暴露 `focus` 方法
   - 监听 `onKeyDown` 事件处理 Enter 和 Shift+Enter

2. **ChatUI 组件**
   - 使用 `forwardRef` 包裹组件
   - 创建 `inputRef` 引用 ChatInput
   - 使用 `useImperativeHandle` 暴露 `focusInput` 方法

3. **ChatPage 组件**
   - 使用 `useRef` 创建 ChatUI 引用
   - 使用 `useEffect` 监听全局 `keydown` 事件
   - 检测 `Ctrl+L` 或 `Cmd+L` 组合键
   - 调用 `chatUIRef.current?.focusInput()` 聚焦输入框

### 代码示例

#### ChatInput 组件

```tsx
export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  (props, ref) => {
    const textAreaRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        textAreaRef.current?.focus();
      },
    }));

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isGenerating && value.trim()) {
          onSend();
        }
      }
    };

    return <TextArea ref={textAreaRef} onKeyDown={handleKeyDown} />;
  }
);
```

#### ChatPage 全局快捷键

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

## 用户体验优化

### 视觉提示

- 输入框底部显示快捷键提示：`"按 Enter 发送，Shift + Enter 换行"`
- 提示文本使用灰色小字，不干扰主要内容

### 行为优化

- Enter 键仅在有输入内容时才发送消息
- 生成中禁用 Enter 发送，避免重复发送
- 使用 `preventDefault()` 阻止默认行为，避免意外换行

### 可访问性

- 输入框添加 `aria-label="消息输入框"` 属性
- 支持屏幕阅读器识别输入框功能

## 未来扩展

可以考虑添加以下快捷键：

- `Ctrl/Cmd + K`: 快速搜索会话
- `Ctrl/Cmd + N`: 创建新会话
- `Ctrl/Cmd + /`: 显示快捷键帮助
- `Esc`: 取消当前操作或关闭弹窗
- `↑/↓`: 浏览历史消息（编辑模式）

## 注意事项

1. **快捷键冲突**: 避免与浏览器或操作系统的默认快捷键冲突
2. **跨平台兼容**: 区分 Windows/Linux 的 Ctrl 和 macOS 的 Cmd
3. **事件清理**: 使用 `useEffect` 的清理函数移除事件监听器
4. **性能优化**: 避免在快捷键处理函数中执行耗时操作
