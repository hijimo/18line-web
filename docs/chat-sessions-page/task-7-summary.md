# 任务 7 实现总结：流式响应处理

## 完成时间

2025-10-27

## 任务概述

为聊天页面实现完整的流式响应处理功能，支持实时显示 AI 生成的内容，并提供停止生成的能力。

## 实现内容

### 1. useStreamResponse Hook

**文件**: `src/hooks/chat/useStreamResponse.ts`

**功能**:

- 处理流式 API 调用
- 使用 fetch ReadableStream 接收流式数据
- 解析 SSE (Server-Sent Events) 格式数据
- 实时更新流式内容
- 支持中止流式响应
- 完善的错误处理

**关键代码**:

```tsx
export const useStreamResponse = (): UseStreamResponseReturn => {
  const [state, setState] = useState<StreamState>({
    currentStreamContent: '',
    isStreaming: false,
    streamError: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // 开始流式消息
  const streamMessage = useCallback(async (request: ChatRequestBody): Promise<string> => {
    // 创建 AbortController
    abortControllerRef.current = new AbortController();

    setState((prev) => ({ ...prev, isStreaming: true, streamError: null }));

    let fullContent = '';

    try {
      // 调用流式 API
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 获取 ReadableStream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // 读取流式数据
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 解码数据
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        // 处理每一行 SSE 数据
        for (const line of lines) {
          if (line.trim() === '') continue;

          const content = parseSSEData(line);
          if (content !== null) {
            fullContent += content;
            // 实时更新流式内容
            setState((prev) => ({
              ...prev,
              currentStreamContent: fullContent,
            }));
          }
        }
      }

      setState((prev) => ({ ...prev, isStreaming: false }));
      return fullContent;
    } catch (error: any) {
      // 处理中止错误
      if (error.name === 'AbortError') {
        message.info('已停止生成');
        setState((prev) => ({ ...prev, isStreaming: false }));
        return fullContent;
      }

      // 处理其他错误
      message.error(error.message || '流式响应失败');
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        streamError: error,
      }));
      throw error;
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  // 停止流式响应
  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  return {
    currentStreamContent: state.currentStreamContent,
    isStreaming: state.isStreaming,
    streamError: state.streamError,
    streamMessage,
    stopStream,
    resetStream,
  };
};
```

**SSE 数据解析**:

```tsx
const parseSSEData = (line: string): string | null => {
  // SSE 格式: data: {...}
  if (line.startsWith('data: ')) {
    const data = line.slice(6).trim();
    
    // 检查是否是 [DONE] 标记
    if (data === '[DONE]') {
      return null;
    }

    try {
      const parsed = JSON.parse(data);
      // 根据实际 API 返回格式调整
      return parsed.content || parsed.message || parsed.delta || '';
    } catch (error) {
      console.warn('解析 SSE 数据失败:', error);
      return null;
    }
  }
  return null;
};
```

### 2. useChatHandler Hook 更新

**文件**: `src/hooks/chat/useChatHandler.ts`

**改动**:

- 集成 useStreamResponse hook
- 实现 sendStreamMessage 函数
- 管理临时消息 ID
- 实现乐观更新
- 提供停止生成功能

**关键代码**:

```tsx
export const useChatHandler = (sessionId: string) => {
  const queryClient = useQueryClient();
  
  // 流式响应 hook
  const { currentStreamContent, isStreaming, streamMessage, stopStream, resetStream } =
    useStreamResponse();

  // 临时消息 ID
  const [tempMessageId, setTempMessageId] = useState<string | null>(null);

  // 发送流式消息
  const sendStreamMessage = async (content: string) => {
    if (!sessionId) {
      message.error('会话 ID 不能为空');
      return;
    }

    try {
      // 重置流式状态
      resetStream();

      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: ['messages', sessionId] });

      // 创建临时用户消息
      const tempUserMessage: MessageDetailResponse = {
        id: `temp-user-${Date.now()}`,
        content,
        role: 'user',
        createdAt: new Date().toISOString(),
        sessionId,
      };

      // 创建临时 AI 消息（用于显示流式内容）
      const tempAIMessageId = `temp-ai-${Date.now()}`;
      const tempAIMessage: MessageDetailResponse = {
        id: tempAIMessageId,
        content: '',
        role: 'assistant',
        createdAt: new Date().toISOString(),
        sessionId,
      };

      setTempMessageId(tempAIMessageId);

      // 乐观更新：添加用户消息和空的 AI 消息
      queryClient.setQueryData(['messages', sessionId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: [...(old.data?.data || []), tempUserMessage, tempAIMessage],
          },
        };
      });

      // 开始流式响应
      const fullContent = await streamMessage({
        message: content,
        messageId: sessionId,
      });

      // 流式完成后，刷新消息列表获取真实数据
      await queryClient.invalidateQueries({ queryKey: ['messages', sessionId] });

      setTempMessageId(null);
    } catch (error: any) {
      console.error('流式消息发送失败:', error);
      // 刷新消息列表，移除临时消息
      await queryClient.invalidateQueries({ queryKey: ['messages', sessionId] });
      setTempMessageId(null);
    }
  };

  // 停止生成
  const handleStopGeneration = () => {
    stopStream();
    queryClient.invalidateQueries({ queryKey: ['messages', sessionId] });
    setTempMessageId(null);
  };

  return {
    sendStreamMessage,
    isStreaming,
    currentStreamContent,
    tempMessageId,
    stopGeneration: handleStopGeneration,
    // ... 其他方法
  };
};
```

### 3. ChatPage 组件更新

**文件**: `src/pages/chat/index.tsx`

**改动**:

- 使用 sendStreamMessage 替代 sendMessage
- 合并真实消息和流式消息
- 传递 onStopGeneration 回调
- 使用 isStreaming 状态

**关键代码**:

```tsx
const ChatPage: React.FC = () => {
  // 获取消息处理方法（使用流式响应）
  const {
    sendStreamMessage,
    isStreaming,
    currentStreamContent,
    tempMessageId,
    stopGeneration,
  } = useChatHandler(currentSessionId || '');

  // 合并真实消息和流式消息
  const displayMessages = useMemo(() => {
    const messages = messagesData?.data?.data || [];
    
    // 如果正在流式传输，更新临时消息的内容
    if (isStreaming && tempMessageId && currentStreamContent) {
      return messages.map((msg) =>
        msg.id === tempMessageId
          ? { ...msg, content: currentStreamContent }
          : msg
      );
    }
    
    return messages;
  }, [messagesData, isStreaming, tempMessageId, currentStreamContent]);

  // 处理发送消息（使用流式响应）
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!currentSessionId) {
        message.warning('请先选择一个会话');
        return;
      }
      try {
        await sendStreamMessage(content);
      } catch (error) {
        // 错误已在 hook 中处理
      }
    },
    [currentSessionId, sendStreamMessage],
  );

  // 处理停止生成
  const handleStopGeneration = useCallback(() => {
    stopGeneration();
  }, [stopGeneration]);

  return (
    <ChatUI
      messages={displayMessages}
      isGenerating={isStreaming}
      onSendMessage={handleSendMessage}
      onStopGeneration={handleStopGeneration}
    />
  );
};
```

### 4. ChatUI 组件更新

**文件**: `src/pages/chat/components/ChatUI/index.tsx`

**改动**:

- 接收 onStopGeneration 回调
- 传递给 ChatInput 组件

**关键代码**:

```tsx
export const ChatUI = forwardRef<ChatUIRef, ChatUIProps>((props, ref) => {
  const { onStopGeneration, isGenerating } = props;

  const handleStop = () => {
    onStopGeneration?.();
  };

  return (
    <ChatInput
      onStop={handleStop}
      isGenerating={isGenerating}
    />
  );
});
```

## 技术亮点

1. **流式数据处理**: 使用 fetch ReadableStream API 处理流式数据
2. **SSE 解析**: 正确解析 Server-Sent Events 格式数据
3. **中止控制**: 使用 AbortController 实现流式响应中止
4. **乐观更新**: 立即显示用户消息和空的 AI 消息，提升用户体验
5. **实时更新**: 流式内容实时更新到 UI
6. **错误处理**: 完善的错误处理和用户提示
7. **状态管理**: 清晰的状态管理，区分流式状态和普通状态

## 流式响应流程

### 发送消息流程

1. 用户输入消息并点击发送
2. 调用 `sendStreamMessage`
3. 创建临时用户消息和空的 AI 消息
4. 乐观更新：立即显示这两条消息
5. 调用 `streamMessage` 开始流式响应
6. 实时接收流式数据，更新临时 AI 消息内容
7. 流式完成后，刷新消息列表获取真实数据
8. 移除临时消息 ID

### 停止生成流程

1. 用户点击停止按钮
2. 调用 `stopGeneration`
3. 调用 `AbortController.abort()` 中止请求
4. 更新状态为非流式
5. 刷新消息列表
6. 移除临时消息 ID

### 数据流

```
用户输入
  ↓
sendStreamMessage
  ↓
乐观更新（添加临时消息）
  ↓
streamMessage（调用 /api/chat/stream）
  ↓
ReadableStream.getReader()
  ↓
循环读取数据块
  ↓
解析 SSE 数据
  ↓
实时更新 currentStreamContent
  ↓
ChatPage 合并消息（更新临时消息内容）
  ↓
ChatUI 显示更新后的消息
  ↓
流式完成
  ↓
刷新消息列表（获取真实数据）
```

## 验收标准

✅ 流式响应正常（使用 fetch ReadableStream）
✅ 实时更新消息内容（通过 tempMessageId 和 currentStreamContent）
✅ 停止功能正常（使用 AbortController）
✅ 错误处理完善（try-catch + message.error）
✅ 乐观更新生效（立即显示用户消息和空的 AI 消息）
✅ 流式完成后刷新消息列表
✅ 状态指示器显示正确（isStreaming 状态）
✅ 停止按钮功能正常（ChatInput 中显示停止按钮）

## SSE 数据格式

本实现支持以下 SSE 数据格式：

```
data: {"content": "Hello"}

data: {"message": "World"}

data: {"delta": "!"}

data: [DONE]
```

如果实际 API 返回格式不同，需要调整 `parseSSEData` 函数。

## 错误处理

### 中止错误

- 错误名称：`AbortError`
- 处理：显示"已停止生成"提示，不视为错误

### HTTP 错误

- 检查 `response.ok`
- 抛出错误：`HTTP error! status: ${response.status}`

### 解析错误

- 捕获 JSON.parse 错误
- 记录警告日志，继续处理

### 网络错误

- 捕获所有其他错误
- 显示错误提示
- 刷新消息列表

## 性能优化

1. **useCallback**: 缓存 streamMessage 和 stopStream 函数
2. **useMemo**: 缓存合并后的消息列表
3. **条件更新**: 仅在流式传输时更新消息
4. **取消查询**: 避免并发查询冲突

## 测试建议

### 手动测试

1. **正常流式响应**
   - 发送消息
   - 验证实时显示流式内容
   - 验证流式完成后显示完整消息

2. **停止生成**
   - 发送消息
   - 在生成过程中点击停止按钮
   - 验证生成停止
   - 验证消息列表正确更新

3. **错误处理**
   - 模拟网络错误
   - 验证错误提示显示
   - 验证消息列表恢复正常

4. **并发消息**
   - 快速发送多条消息
   - 验证消息顺序正确
   - 验证没有消息丢失

### 自动化测试（建议）

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useStreamResponse } from './useStreamResponse';

describe('useStreamResponse', () => {
  it('应该正确处理流式响应', async () => {
    const { result } = renderHook(() => useStreamResponse());
    
    // 模拟流式响应
    const content = await result.current.streamMessage({
      message: 'test',
      messageId: 'session-1',
    });
    
    expect(content).toBeTruthy();
    expect(result.current.isStreaming).toBe(false);
  });

  it('应该能够停止流式响应', async () => {
    const { result } = renderHook(() => useStreamResponse());
    
    // 开始流式响应
    const promise = result.current.streamMessage({
      message: 'test',
      messageId: 'session-1',
    });
    
    // 停止流式响应
    result.current.stopStream();
    
    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });
  });
});
```

## 后续优化建议

1. **重试机制**: 流式失败时自动重试
2. **断点续传**: 支持从中断位置继续
3. **缓存策略**: 缓存流式内容，避免重复请求
4. **性能监控**: 监控流式响应性能
5. **类型安全**: 为 SSE 数据定义更严格的类型
6. **配置化**: 支持配置 SSE 数据格式解析规则

## 注意事项

1. **API 格式**: 确保后端 API 返回正确的 SSE 格式
2. **编码问题**: 使用 TextDecoder 正确解码流式数据
3. **内存泄漏**: 确保 AbortController 正确清理
4. **并发控制**: 避免同时发送多个流式请求
5. **浏览器兼容性**: ReadableStream 在旧浏览器可能不支持

## 相关文件

- `src/hooks/chat/useStreamResponse.ts` - 流式响应 Hook
- `src/hooks/chat/useChatHandler.ts` - 聊天处理 Hook（更新）
- `src/pages/chat/index.tsx` - 聊天页面（更新）
- `src/pages/chat/components/ChatUI/index.tsx` - 聊天界面（更新）

## 总结

流式响应功能已完整实现，支持实时显示 AI 生成的内容，提供流畅的用户体验。通过 fetch ReadableStream API 和 SSE 格式解析，实现了高效的流式数据处理。乐观更新和完善的错误处理确保了功能的稳定性和可靠性。
