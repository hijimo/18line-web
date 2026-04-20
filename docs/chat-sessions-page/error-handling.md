# 错误处理和加载状态

## 概述

本文档总结了聊天会话页面的错误处理机制和加载状态实现，确保用户在各种情况下都能获得友好的反馈。

## 错误类型定义

### ChatErrorType 枚举

**文件**: `src/types/chat.ts`

```typescript
export enum ChatErrorType {
  /** 网络错误 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** 会话不存在 */
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  /** 消息发送失败 */
  MESSAGE_SEND_FAILED = 'MESSAGE_SEND_FAILED',
  /** 文件上传失败 */
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  /** 流式响应错误 */
  STREAM_ERROR = 'STREAM_ERROR',
  /** 无效输入 */
  INVALID_INPUT = 'INVALID_INPUT',
  /** 未授权 */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /** 服务器错误 */
  SERVER_ERROR = 'SERVER_ERROR',
}
```

### ChatError 接口

```typescript
export interface ChatError {
  /** 错误类型 */
  type: ChatErrorType;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: unknown;
  /** 错误代码 */
  code?: string;
}
```

## 错误处理实现

### 1. API 错误处理

#### React Query 错误处理

**ChatPage 组件**:

```typescript
const {
  data: sessionsData,
  isLoading: isLoadingSessions,
  error: sessionsError,
  refetch: refetchSessions,
} = useQuery({
  queryKey: ['sessions'],
  queryFn: async () => {
    try {
      const response = await sessionsApi.getChatSessions({
        pageNo: 1,
        pageSize: 50,
        isArchived: false,
      });
      return response;
    } catch (err) {
      message.error('加载会话列表失败');
      throw err;
    }
  },
  retry: 2,
  staleTime: 30000,
});

// 错误处理
if (error) {
  return (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <p>加载会话列表失败</p>
      <button onClick={() => refetchSessions()}>重试</button>
    </div>
  );
}
```

#### useMutation 错误处理

**useChatHandler Hook**:

```typescript
const sendMessage = useMutation({
  mutationFn: async (content: string) => {
    if (!sessionId) {
      throw new Error('会话 ID 不能为空');
    }
    const response = await messagesApi.postChatSessionsIdMessages(
      { id: sessionId },
      { message: content, sessionId: sessionId },
    );
    return response;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['messages', sessionId] });
    message.success('消息发送成功');
  },
  onError: (error: any, _content, context) => {
    // 恢复之前的消息列表
    if (context?.previousMessages) {
      queryClient.setQueryData(['messages', sessionId], context.previousMessages);
    }
    message.error(error?.message || '消息发送失败');
  },
});
```

### 2. 流式响应错误处理

**useStreamResponse Hook**:

```typescript
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

  // 处理流式数据...
} catch (error: any) {
  // 处理中止错误
  if (error.name === 'AbortError') {
    message.info('已停止生成');
    setState((prev) => ({ ...prev, isStreaming: false }));
    return fullContent;
  }

  // 处理其他错误
  console.error('流式响应错误:', error);
  message.error(error.message || '流式响应失败');

  setState((prev) => ({
    ...prev,
    isStreaming: false,
    streamError: error,
  }));

  throw error;
}
```

### 3. 会话操作错误处理

**useSessionOperations Hook**:

```typescript
const deleteSession = useMutation({
  mutationFn: async (sessionId: string) => {
    const response = await sessionsApi.deleteChatSessionsId({ id: sessionId });
    return response;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    message.success('会话已删除');
  },
  onError: (error: any) => {
    console.error('删除会话失败:', error);
    message.error(error?.message || '删除会话失败');
  },
});
```

### 4. 表单验证错误

**ChatSettings 组件**:

```typescript
const handleSave = async () => {
  if (!sessionId) return;

  try {
    const values = await form.validateFields();
    setIsSaving(true);

    const updateData: UpdateSessionRequest = {
      modelName: values.modelName,
      temperature: values.temperature,
      topP: values.topP,
      systemPrompt: values.systemPrompt,
    };

    await sessionsApi.patchChatSessionsId({ id: sessionId }, updateData);

    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });

    message.success('设置已保存');
  } catch (error: any) {
    console.error('保存设置失败:', error);
    // 验证错误不显示提示
    if (error.errorFields) {
      return;
    }
    message.error(error?.message || '保存设置失败');
  } finally {
    setIsSaving(false);
  }
};
```

## 加载状态实现

### 1. 页面初始加载

**ChatUI 组件**:

```typescript
// 无会话时显示空状态
if (!sessionId) {
  return (
    <div className={styles.chatUIEmpty}>
      <Empty
        description="请选择一个会话或创建新会话开始聊天"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    </div>
  );
}
```

### 2. 会话列表加载

**SessionList 组件**:

```typescript
interface SessionListProps {
  sessions: SessionResponse[];
  loading?: boolean;
  // ... 其他 props
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  loading,
  // ...
}) => {
  return (
    <div className={styles.sessionList}>
      {/* 头部 */}
      <div className={styles.header}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreateSession}
          loading={loading}
        >
          新建会话
        </Button>
      </div>

      {/* 会话列表 */}
      {loading ? (
        <div className={styles.loading}>
          <Spin tip="加载中..." />
        </div>
      ) : (
        <div className={styles.sessions}>
          {sessions.map((session) => (
            <SessionItem key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
};
```

### 3. 消息发送中禁用输入框

**ChatInput 组件**:

```typescript
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isGenerating?: boolean;
  disabled?: boolean;
  // ...
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  isGenerating = false,
  disabled = false,
  // ...
}) => {
  return (
    <div className={styles.chatInput}>
      <TextArea
        value={value}
        onChange={handleChange}
        disabled={disabled || isGenerating}
        placeholder={isGenerating ? '正在生成中...' : '输入消息...'}
      />
      <Button
        type="primary"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        loading={isGenerating}
      >
        {isGenerating ? '生成中' : '发送'}
      </Button>
    </div>
  );
};
```

### 4. 流式响应生成状态

**ChatMessages 组件**:

```typescript
export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isGenerating = false,
  // ...
}) => {
  return (
    <div className={styles.chatMessages}>
      {/* 消息列表 */}
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}

      {/* 正在生成提示 */}
      {isGenerating && (
        <div className={styles.generatingIndicator}>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
        </div>
      )}
    </div>
  );
};
```

### 5. 模型列表加载

**ChatSettings 组件**:

```typescript
const { data: providersData, isLoading: isLoadingProviders } = useQuery({
  queryKey: ['providers'],
  queryFn: async () => {
    const response = await providersApi.getProviders();
    return response;
  },
  staleTime: 5 * 60 * 1000,
});

return (
  <Form.Item name="modelName" label="模型">
    <Select
      placeholder="请选择模型"
      loading={isLoadingProviders}
      options={models}
    />
  </Form.Item>
);
```

## 乐观更新和错误回滚

### 消息发送乐观更新

**useChatHandler Hook**:

```typescript
const sendMessage = useMutation({
  mutationFn: async (content: string) => {
    // API 调用
  },
  // 乐观更新：立即在 UI 中显示用户消息
  onMutate: async (content: string) => {
    // 取消正在进行的查询
    await queryClient.cancelQueries({ queryKey: ['messages', sessionId] });

    // 获取当前消息列表
    const previousMessages = queryClient.getQueryData(['messages', sessionId]);

    // 创建临时用户消息
    const tempUserMessage: MessageDetailResponse = {
      id: `temp-${Date.now()}`,
      content,
      role: 'user',
      createdAt: new Date().toISOString(),
      sessionId,
    };

    // 乐观更新：添加临时消息到列表
    queryClient.setQueryData(['messages', sessionId], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        data: {
          ...old.data,
          data: [...(old.data?.data || []), tempUserMessage],
        },
      };
    });

    // 返回上下文，用于回滚
    return { previousMessages };
  },
  // 发送失败：回滚乐观更新
  onError: (error: any, _content, context) => {
    // 恢复之前的消息列表
    if (context?.previousMessages) {
      queryClient.setQueryData(['messages', sessionId], context.previousMessages);
    }
    message.error(error?.message || '消息发送失败');
  },
});
```

## 用户反馈

### 1. 成功提示

```typescript
// 操作成功
message.success('消息发送成功');
message.success('会话已删除');
message.success('设置已保存');
```

### 2. 错误提示

```typescript
// 操作失败
message.error('消息发送失败');
message.error('加载会话列表失败');
message.error('保存设置失败');
```

### 3. 警告提示

```typescript
// 警告信息
message.warning('请先选择一个会话');
message.warning('输入内容不能为空');
```

### 4. 信息提示

```typescript
// 一般信息
message.info('已停止生成');
message.info('正在加载...');
```

## 错误边界（未实现）

### 建议实现

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="出错了"
          subTitle="抱歉，页面遇到了一些问题"
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

## 加载状态样式

### 生成中动画

**CSS**:

```css
.generatingIndicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #14b8a6;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
```

## 最佳实践

### 1. 错误处理

- ✅ 使用 try-catch 捕获异步错误
- ✅ 使用 React Query 的 onError 回调
- ✅ 提供友好的错误提示
- ✅ 记录错误日志（console.error）
- ⏸️ 实现错误边界（Error Boundary）

### 2. 加载状态

- ✅ 显示加载指示器（Spin、Skeleton）
- ✅ 禁用正在处理的操作
- ✅ 提供加载提示文本
- ✅ 使用动画提升体验

### 3. 用户反馈

- ✅ 操作成功显示成功提示
- ✅ 操作失败显示错误提示
- ✅ 提供重试机制
- ✅ 显示操作进度

### 4. 乐观更新

- ✅ 立即更新 UI
- ✅ 失败时回滚
- ✅ 提供视觉反馈

## 错误处理流程

```
用户操作
  ↓
API 调用
  ↓
成功？
  ├─ 是 → 更新 UI → 显示成功提示
  └─ 否 → 捕获错误
           ↓
           判断错误类型
           ↓
           显示错误提示
           ↓
           回滚乐观更新（如果有）
           ↓
           提供重试选项（如果适用）
```

## 总结

聊天会话页面实现了完善的错误处理和加载状态机制：

1. **错误类型定义**: 定义了 ChatErrorType 枚举，涵盖各种错误场景
2. **API 错误处理**: 使用 React Query 的 onError 回调统一处理
3. **流式响应错误**: 特殊处理中止错误和网络错误
4. **加载状态**: 在各个组件中显示加载指示器
5. **乐观更新**: 立即更新 UI，失败时回滚
6. **用户反馈**: 使用 Ant Design message 组件提供友好提示

这些措施确保了用户在各种情况下都能获得清晰的反馈，提升了整体用户体验。

## 参考资料

- [React Query Error Handling](https://tanstack.com/query/latest/docs/react/guides/query-functions#handling-and-throwing-errors)
- [Ant Design Message](https://ant.design/components/message-cn)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
