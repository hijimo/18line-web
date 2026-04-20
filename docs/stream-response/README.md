# 流式响应功能文档

## 概述

本项目实现了基于腾讯云 SSE 格式的流式响应功能，支持多阶段流式输出，包括工具调用、知识库搜索、思考过程和内容生成等阶段。

## 技术架构

### 核心组件

1. **useStreamResponse Hook** (`src/hooks/chat/useStreamResponse.ts`)
   - 处理 SSE 流式数据解析
   - 管理流式状态
   - 支持中止请求

2. **StreamState 类型** (`src/types/stream.ts`)
   - 定义流式响应的所有类型
   - 包含各个阶段的详细信息

3. **StreamStatusIndicator 组件** (`src/pages/chat/components/StreamStatusIndicator`)
   - 显示流式响应的当前阶段
   - 可选显示思考过程

## 流式响应阶段

### 1. 工具调用阶段

- `tool_call_start` - 开始调用工具
- `tool_call_progress` - 工具执行中
- `tool_call_complete` - 工具调用完成
- `tool_call_error` - 工具调用失败

### 2. 搜索/检索阶段

- `internal_searching` - 正在搜索知识库
- `finished_internal_searching` - 搜索完成
- `resource_retrieval_start` - 开始检索资源
- `resource_retrieval_complete` - 资源检索完成

### 3. 思考阶段

- `thinking` - 正在思考（显示思考过程的增量内容）

### 4. 输出阶段

- `''` (空字符串) - 正式输出内容

### 5. 结束阶段

- `finish` 事件 - 流式输出结束，包含完整内容和引用文档

## 使用方法

### 基础使用

```typescript
import { useStreamResponse } from '@/hooks/chat/useStreamResponse';

const MyComponent = () => {
  const streamResponse = useStreamResponse();

  const handleSend = async () => {
    try {
      const result = await streamResponse.streamMessage({
        sessionId: 'session-id',
        message: '用户消息',
      });
      console.log('完整响应:', result);
    } catch (error) {
      console.error('流式响应失败:', error);
    }
  };

  return (
    <div>
      {/* 显示当前阶段 */}
      <div>阶段: {streamResponse.stage}</div>
      <div>状态: {streamResponse.stageMessage}</div>
      
      {/* 显示思考内容 */}
      {streamResponse.thinkingContent && (
        <div>思考: {streamResponse.thinkingContent}</div>
      )}
      
      {/* 显示输出内容 */}
      <div>输出: {streamResponse.outputContent}</div>
      
      {/* 停止按钮 */}
      {streamResponse.isStreaming && (
        <button onClick={streamResponse.stopStream}>停止</button>
      )}
    </div>
  );
};
```

### 在聊天界面中使用

```typescript
import { useChatHandler } from '@/hooks/chat/useChatHandler';

const ChatPage = () => {
  const { sendStreamMessage, streamState, stopGeneration } = useChatHandler(sessionId);

  return (
    <ChatUI
      messages={messages}
      isGenerating={streamState.isStreaming}
      streamState={streamState}
      onSendMessage={sendStreamMessage}
      onStopGeneration={stopGeneration}
    />
  );
};
```

## StreamState 接口

```typescript
interface StreamState {
  /** 当前阶段 */
  stage: StreamStage;
  /** 阶段消息 */
  stageMessage: string;
  /** 思考内容 */
  thinkingContent: string;
  /** 输出内容 */
  outputContent: string;
  /** 完整内容（finish 时） */
  fullContent: string;
  /** 是否正在流式传输 */
  isStreaming: boolean;
  /** 是否完成 */
  isFinished: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 引用文档 */
  referenceDocs?: ReferenceDoc[];
  /** 引用片段 */
  referenceChunks?: ReferenceChunk[];
  /** 会话ID */
  sessionId?: string;
  /** 完成ID */
  completionId?: string;
}
```

## 数据流程

### 1. 用户发送消息

```
用户输入 → sendStreamMessage() → 创建临时消息 → 调用流式 API
```

### 2. 流式响应处理

```
SSE 数据流 → 解析 data: 行 → 更新 StreamState → 更新 UI
```

### 3. 阶段转换

```
工具调用 → 搜索知识库 → 思考 → 输出内容 → finish 事件
```

### 4. 完成处理

```
finish 事件 → 保存完整内容 → 刷新消息列表 → 显示最终结果
```

## 错误处理

### 1. HTTP 错误

```typescript
if (!response.ok) {
  // 尝试解析错误响应
  const errorData = await response.json();
  // 显示错误消息
  message.error(errorData.message);
}
```

### 2. 网络错误

```typescript
catch (error) {
  if (error.name === 'AbortError') {
    // 用户主动停止
    message.info('已停止生成');
  } else {
    // 其他错误
    message.error(error.message);
  }
}
```

### 3. 解析错误

```typescript
try {
  const data = JSON.parse(dataStr);
} catch (error) {
  console.warn('解析 SSE 数据失败:', error);
  // 跳过无效数据
}
```

## 性能优化

### 1. 缓冲区处理

使用 `bufferRef` 处理不完整的 SSE 数据行：

```typescript
bufferRef.current += chunk;
const lines = bufferRef.current.split('\n');
bufferRef.current = lines.pop() || ''; // 保留最后一行
```

### 2. 状态更新优化

使用函数式更新避免闭包问题：

```typescript
setState((prev) => ({
  ...prev,
  outputContent: prev.outputContent + msg.delta_content,
}));
```

### 3. 内存清理

在组件卸载或请求完成时清理资源：

```typescript
finally {
  abortControllerRef.current = null;
  bufferRef.current = '';
}
```

## 注意事项

1. **编码问题**: 中文字符可能被分割成多个字节，需要使用 `TextDecoder` 正确解码
2. **空行处理**: SSE 格式中的空行表示消息结束，需要正确处理
3. **事件类型**: 只有 `finish` 事件有 `event:` 前缀，其他都是 `data:` 行
4. **内容合并**: 思考内容在 `processes.delta_content`，输出内容在 `delta_content`
5. **引用文档**: 搜索完成时有 `reference_chunks`，finish 时有 `reference_docs`

## 调试技巧

### 1. 查看原始数据

```typescript
console.log('SSE chunk:', chunk);
console.log('Parsed message:', parsed);
```

### 2. 监控状态变化

```typescript
useEffect(() => {
  console.log('Stream state:', streamState);
}, [streamState]);
```

### 3. 检查网络请求

在浏览器开发者工具的 Network 标签中查看流式请求的响应。

## 扩展功能

### 1. 显示思考过程

设置 `showThinking={true}` 显示 AI 的思考过程：

```typescript
<StreamStatusIndicator
  stage={streamState.stage}
  stageMessage={streamState.stageMessage}
  thinkingContent={streamState.thinkingContent}
  showThinking={true}
/>
```

### 2. 显示引用文档

在消息完成后显示引用的文档：

```typescript
{streamState.referenceDocs?.map((doc) => (
  <a key={doc.target_id} href={doc.url}>
    {doc.title}
  </a>
))}
```

### 3. 自定义阶段显示

根据不同阶段显示不同的 UI：

```typescript
switch (streamState.stage) {
  case 'tool_call_start':
    return <ToolCallIndicator />;
  case 'internal_searching':
    return <SearchIndicator />;
  case 'thinking':
    return <ThinkingIndicator />;
  default:
    return <DefaultIndicator />;
}
```

## 相关文件

- `src/hooks/chat/useStreamResponse.ts` - 流式响应 Hook
- `src/hooks/chat/useChatHandler.ts` - 聊天处理 Hook
- `src/types/stream.ts` - 流式类型定义
- `src/pages/chat/components/StreamStatusIndicator/` - 状态指示器组件
- `src/pages/chat/components/ChatMessages/` - 消息列表组件
- `腾讯云流格式.md` - 腾讯云流格式详细说明

## 更新日志

### 2024-01-XX

- ✅ 实现基于腾讯云 SSE 格式的流式响应
- ✅ 支持多阶段流式输出（工具调用、搜索、思考、输出）
- ✅ 添加流式状态指示器组件
- ✅ 完善错误处理和用户提示
- ✅ 优化性能和内存管理
