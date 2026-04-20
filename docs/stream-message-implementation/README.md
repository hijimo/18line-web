# 流式消息实现文档

## 概述

本文档说明如何使用 `postChatSessionsIdMessagesStream` 接口实现流式消息发送功能。

## 技术实现

### 1. API 接口

使用 `/chat/sessions/{id}/messages/stream` 接口发送流式消息：

```typescript
// API 定义位置：src/services/api/messages/messages.ts
const postChatSessionsIdMessagesStream = (
  { id }: PostChatSessionsIdMessagesStreamPathParameters,
  sendMessageRequestBody: SendMessageRequestBody,
) => {
  return orvalMutator<string>({
    url: `/chat/sessions/${id}/messages/stream`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: sendMessageRequestBody,
  });
};
```

### 2. 请求参数

**路径参数：**

- `id`: 会话 ID (string)

**请求体：**

```typescript
interface SendMessageRequestBody {
  message: string;      // 消息内容（必填）
  sessionId: string;    // 会话 ID（必填）
  options?: ChatOptions; // AI 高级参数（可选）
}
```

### 3. 流式响应处理

#### useStreamResponse Hook

位置：`src/hooks/chat/useStreamResponse.ts`

**功能：**

- 处理 SSE (Server-Sent Events) 流式响应
- 实时更新消息内容
- 支持中止流式传输
- 错误处理和状态管理

**使用方法：**

```typescript
import { useStreamResponse } from '@/hooks/chat/useStreamResponse';

const {
  currentStreamContent,  // 当前流式内容
  isStreaming,          // 是否正在流式传输
  streamError,          // 流式错误
  streamMessage,        // 开始流式消息
  stopStream,           // 停止流式响应
  resetStream,          // 重置流式状态
} = useStreamResponse();

// 发送流式消息
await streamMessage({
  sessionId: 'session-id',
  message: '你好',
  options: { temperature: 0.7 }
});
```

#### useChatHandler Hook

位置：`src/hooks/chat/useChatHandler.ts`

**功能：**

- 封装消息发送逻辑
- 乐观更新 UI
- 管理临时消息
- 集成 React Query

**使用方法：**

```typescript
import { useChatHandler } from '@/hooks/chat/useChatHandler';

const {
  sendStreamMessage,     // 发送流式消息
  isStreaming,          // 是否正在流式传输
  currentStreamContent, // 当前流式内容
  tempMessageId,        // 临时消息 ID
  stopGeneration,       // 停止生成
} = useChatHandler(sessionId);

// 发送消息
await sendStreamMessage('你好，AI！');

// 停止生成
stopGeneration();
```

### 4. SSE 数据格式

流式响应使用 SSE (Server-Sent Events) 格式：

```
data: {"content": "你"}

data: {"content": "好"}

data: {"content": "！"}

data: [DONE]
```

**解析逻辑：**

- 每行以 `data:` 开头
- 数据为 JSON 格式
- `[DONE]` 标记表示流式结束
- 支持多种字段名：`content`、`message`、`delta`

### 5. 完整流程

```
用户输入消息
    ↓
调用 sendStreamMessage()
    ↓
创建临时用户消息（乐观更新）
    ↓
创建临时 AI 消息（空内容）
    ↓
调用 postChatSessionsIdMessagesStream API
    ↓
接收 SSE 流式数据
    ↓
实时更新临时 AI 消息内容
    ↓
流式完成
    ↓
刷新消息列表获取真实数据
    ↓
移除临时消息
```

## 核心特性

### 1. 乐观更新

在 API 响应前立即在 UI 中显示用户消息和空的 AI 消息，提升用户体验。

### 2. 实时流式显示

通过 ReadableStream 和 TextDecoder 实时解析 SSE 数据，逐字显示 AI 回复。

### 3. 中止支持

使用 AbortController 支持用户随时中止流式传输。

### 4. 错误处理

- 网络错误处理
- 中止错误处理
- 解析错误处理
- 自动回滚乐观更新

### 5. 状态管理

使用 React Query 管理消息列表缓存和更新。

## 使用示例

### 在组件中使用

```typescript
import { useChatHandler } from '@/hooks/chat/useChatHandler';

const ChatComponent = ({ sessionId }: { sessionId: string }) => {
  const {
    sendStreamMessage,
    isStreaming,
    currentStreamContent,
    stopGeneration,
  } = useChatHandler(sessionId);

  const handleSend = async (content: string) => {
    try {
      await sendStreamMessage(content);
      console.log('消息发送成功');
    } catch (error) {
      console.error('消息发送失败:', error);
    }
  };

  return (
    <div>
      {isStreaming && (
        <div>
          <p>AI 正在回复：{currentStreamContent}</p>
          <button onClick={stopGeneration}>停止生成</button>
        </div>
      )}
      <button onClick={() => handleSend('你好')}>
        发送消息
      </button>
    </div>
  );
};
```

## 注意事项

1. **API 路径**：确保 Vite 代理配置正确，`/api` 路径会被代理到后端服务器
2. **SSE 格式**：根据实际后端返回的 SSE 格式调整 `parseSSEData` 函数
3. **错误处理**：流式传输失败时会自动刷新消息列表，移除临时消息
4. **性能优化**：使用 React Query 的缓存机制避免重复请求
5. **类型安全**：所有 API 类型都由 orval 自动生成，确保类型安全

## 相关文件

- `src/hooks/chat/useStreamResponse.ts` - 流式响应处理
- `src/hooks/chat/useChatHandler.ts` - 消息处理逻辑
- `src/services/api/messages/messages.ts` - API 定义
- `src/types/api/sendMessageRequestBody.ts` - 请求体类型
- `src/pages/chat/index.tsx` - 聊天页面使用示例

## 技术栈

- React 18.3
- TypeScript 5.8
- React Query (TanStack Query)
- Fetch API (ReadableStream)
- Server-Sent Events (SSE)
