# 流式输出移植文档

## 概述

本次将 chatbot-ui-main 中的流式输出实现移植到 `pages/chat/ChatUI` 组件中，实现了更好的用户体验和实时反馈。

## 移植内容

### 1. 核心实现参考

参考了 chatbot-ui-main 的以下核心实现：

- **consumeReadableStream** (`chatbot-ui-main/lib/consume-stream.ts`)
  - 流式数据消费函数
  - 使用 ReadableStream API 读取流式响应
  - 支持 AbortController 中止流式传输

- **processResponse** (`chatbot-ui-main/components/chat/chat-helpers/index.ts`)
  - 处理流式响应的核心逻辑
  - 实时更新消息内容
  - 支持 Ollama 和托管模型的不同格式

- **ChatMessages** (`chatbot-ui-main/components/chat/chat-messages.tsx`)
  - 消息列表渲染
  - 实时显示流式内容
  - 自动滚动到底部

### 2. 已实现的功能

#### 2.1 实时内容渲染

在 `ChatMessages` 组件中：

```typescript
// 如果是最后一条 AI 消息且正在生成，显示流式内容
const displayContent =
  isLastMessage && !isUser && isGenerating && streamState?.outputContent
    ? streamState.outputContent
    : message.content || '';
```

- 最后一条 AI 消息会实时显示 `streamState.outputContent`
- 其他消息显示原始内容
- 流式完成后自动切换到完整内容

#### 2.2 打字机光标效果

在 `Message` 组件中添加了视觉反馈：

```typescript
{/* 流式输出时显示打字机光标 */}
{isStreaming && !isUser && <span className={styles.streamingCursor} />}
```

CSS 动画实现闪烁效果：

```css
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.streamingCursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background-color: currentColor;
  margin-left: 2px;
  animation: blink 1s infinite;
  vertical-align: text-bottom;
}
```

#### 2.3 自动滚动

```typescript
// 自动滚动到底部（当有新消息或流式内容更新时）
useEffect(() => {
  if (isGenerating || messages.length > 0) {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }
}, [messages.length, streamState?.outputContent, isGenerating]);
```

- 监听消息数量和流式内容变化
- 平滑滚动到底部
- 确保用户始终看到最新内容

#### 2.4 流式状态指示器

在最后一条 AI 消息下方显示当前处理阶段：

```typescript
{isLastMessage && !isUser && isGenerating && streamState && (
  <div className={styles.streamIndicatorWrapper}>
    <StreamStatusIndicator
      stage={streamState.stage}
      stageMessage={streamState.stageMessage}
      thinkingContent={streamState.thinkingContent}
      showThinking={streamState.stage === 'thinking'}
    />
  </div>
)}
```

支持的阶段包括：

- `tool_call_start` - 工具调用开始
- `tool_call_progress` - 工具执行中
- `internal_searching` - 搜索知识库
- `thinking` - AI 思考中
- 空字符串 - 正常输出

### 3. 数据流

```
useStreamResponse Hook
  ↓ (streamState)
ChatPage
  ↓ (streamState, messages)
ChatUI
  ↓ (streamState, messages, isGenerating)
ChatMessages
  ↓ (displayContent, isStreaming)
Message (实时渲染 + 光标效果)
```

### 4. 与 chatbot-ui-main 的差异

#### 相同点

1. **流式数据处理**
   - 都使用 ReadableStream API
   - 都支持 AbortController 中止
   - 都实时更新消息内容

2. **用户体验**
   - 实时显示生成内容
   - 自动滚动到底部
   - 视觉反馈（光标/加载动画）

#### 不同点

1. **数据格式**
   - chatbot-ui-main: OpenAI/Ollama 格式
   - 本项目: 腾讯云 SSE 格式（支持多阶段）

2. **状态管理**
   - chatbot-ui-main: Context API
   - 本项目: React Query + 自定义 Hook

3. **消息更新方式**
   - chatbot-ui-main: 直接修改消息数组
   - 本项目: 通过 streamState 传递，在渲染时合并

## 使用方式

### 在 ChatPage 中

```typescript
const { sendStreamMessage, streamState, tempMessageId, stopGeneration } =
  useChatHandler(currentSessionId || '');

// 合并真实消息和流式消息
const displayMessages = useMemo(() => {
  const messages = messagesData?.data?.data || [];

  if (streamState.isStreaming && tempMessageId) {
    const streamContent = streamState.outputContent || streamState.fullContent;
    return messages.map((msg) =>
      msg.id === tempMessageId ? { ...msg, content: streamContent } : msg,
    );
  }

  return messages;
}, [messagesData, streamState, tempMessageId]);
```

### 在 ChatUI 中

```typescript
<ChatMessages
  messages={displayMessages}
  isGenerating={streamState.isStreaming}
  streamState={streamState}
  scrollContainerRef={scrollContainerRef}
/>
```

### 在 ChatMessages 中

```typescript
// 自动判断是否显示流式内容
const displayContent =
  isLastMessage && !isUser && isGenerating && streamState?.outputContent
    ? streamState.outputContent
    : message.content || '';

<Message
  message={{ ...message, content: displayContent }}
  isUser={isUser}
  isStreaming={isLastMessage && !isUser && isGenerating}
/>
```

## 技术细节

### 1. 流式数据解析

参考 `useStreamResponse` Hook：

```typescript
// 解析 SSE 数据
const parseSSEMessage = (line: string): { event?: string; data?: TencentCloudMessage } | null => {
  if (line.startsWith('event:')) {
    const event = line.slice(6).trim();
    return { event };
  }

  if (line.startsWith('data:')) {
    const dataStr = line.slice(5).trim();
    if (!dataStr) return null;

    try {
      const data = JSON.parse(dataStr) as TencentCloudMessage;
      return { data };
    } catch (error) {
      console.warn('解析 SSE 数据失败:', error, dataStr);
      return null;
    }
  }

  return null;
};
```

### 2. 缓冲区处理

```typescript
// 缓冲区，用于处理不完整的 SSE 数据
const bufferRef = useRef<string>('');

// 解码数据并添加到缓冲区
const chunk = decoder.decode(value, { stream: true });
bufferRef.current += chunk;

// 按行分割
const lines = bufferRef.current.split('\n');

// 保留最后一行（可能不完整）
bufferRef.current = lines.pop() || '';
```

### 3. 多阶段处理

```typescript
// 处理不同阶段
const stage = msg.processes.stage as StreamStage;
newState.stage = stage;
newState.stageMessage = getStageMessage(stage, msg.processes.message);

// 思考阶段 - 累积思考内容
if (stage === 'thinking' && msg.processes.delta_content) {
  newState.thinkingContent = prev.thinkingContent + msg.processes.delta_content;
}

// 输出阶段 - 累积输出内容
if (stage === '' && msg.delta_content) {
  newState.outputContent = prev.outputContent + msg.delta_content;
}
```

## 性能优化

1. **React.memo**
   - Message 组件使用 memo 避免不必要的重渲染
   - 仅在 content 或 isStreaming 变化时更新

2. **useMemo**
   - displayMessages 使用 memo 缓存计算结果
   - 减少不必要的数组操作

3. **useCallback**
   - 事件处理函数使用 callback 缓存
   - 避免子组件重渲染

4. **平滑滚动**
   - 使用 `scrollIntoView({ behavior: 'smooth' })`
   - 提供更好的用户体验

## 相关文件

- `src/hooks/chat/useStreamResponse.ts` - 流式响应处理 Hook
- `src/pages/chat/components/ChatMessages/index.tsx` - 消息列表组件
- `src/pages/chat/components/Message/index.tsx` - 单条消息组件
- `src/pages/chat/components/StreamStatusIndicator/index.tsx` - 流式状态指示器
- `src/types/stream.ts` - 流式类型定义

## 参考资源

- [chatbot-ui-main](https://github.com/mckaywrigley/chatbot-ui) - 原始实现参考
- [MDN - ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
- [MDN - Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

## 后续优化建议

1. **错误重试**
   - 添加流式传输失败后的自动重试机制
   - 提供手动重试按钮

2. **断点续传**
   - 支持网络中断后从断点继续
   - 保存已接收的内容

3. **性能监控**
   - 记录流式传输的性能指标
   - 优化大量数据时的渲染性能

4. **可访问性**
   - 添加屏幕阅读器支持
   - 改进键盘导航

5. **测试覆盖**
   - 添加流式输出的单元测试
   - 添加 E2E 测试验证用户体验
