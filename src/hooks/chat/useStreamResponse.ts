/**
 * 流式响应处理 Hook
 * 处理腾讯云 SSE 格式的流式响应，支持实时更新和中止
 */

import { message } from 'antd';
import { useCallback, useRef, useState } from 'react';
import { TOKEN_KEY } from '@/utils/userData';
import type { SendMessageRequestBody } from '@/types/api/sendMessageRequestBody';
import type { StreamStage, StreamState, TencentCloudMessage } from '@/types/stream';

/**
 * 流式消息请求参数
 */
interface StreamMessageRequest {
  /** 会话 ID */
  sessionId: string;
  /** 消息内容 */
  message: string;
  /** 模型 ID（可选） */
  modelId?: string;
  /** AI 高级参数（可选） */
  options?: any;
}

/**
 * useStreamResponse Hook 返回值
 */
interface UseStreamResponseReturn extends StreamState {
  /** 开始流式消息 */
  streamMessage: (request: StreamMessageRequest) => Promise<string>;
  /** 停止流式响应 */
  stopStream: () => void;
  /** 重置流式状态 */
  resetStream: () => void;
}

/**
 * 流式响应处理 Hook
 * 支持腾讯云 SSE 格式的多阶段流式输出
 */
export const useStreamResponse = (): UseStreamResponseReturn => {
  // 流式状态
  const [state, setState] = useState<StreamState>({
    stage: '',
    stageMessage: '',
    thinkingContent: '',
    outputContent: '',
    fullContent: '',
    isStreaming: false,
    isFinished: false,
    error: null,
    referenceDocs: undefined,
    referenceChunks: undefined,
    sessionId: undefined,
    completionId: undefined,
  });

  // AbortController 引用，用于中止请求
  const abortControllerRef = useRef<AbortController | null>(null);
  // 缓冲区，用于处理不完整的 SSE 数据
  const bufferRef = useRef<string>('');

  // 重置流式状态
  const resetStream = useCallback(() => {
    setState({
      stage: '',
      stageMessage: '',
      thinkingContent: '',
      outputContent: '',
      fullContent: '',
      isStreaming: false,
      isFinished: false,
      error: null,
      referenceDocs: undefined,
      referenceChunks: undefined,
      sessionId: undefined,
      completionId: undefined,
    });
    bufferRef.current = '';
  }, []);

  // 停止流式响应
  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  // 处理阶段消息
  const getStageMessage = (stage: StreamStage, message: string): string => {
    const stageMessages: Record<string, string> = {
      tool_call_start: '正在调用工具...',
      tool_call_progress: '工具执行中...',
      tool_call_complete: '工具调用完成',
      tool_call_error: '工具调用失败',
      internal_searching: '正在搜索知识库...',
      finished_internal_searching: '搜索完成',
      resource_retrieval_start: '正在检索资源...',
      resource_retrieval_complete: '资源检索完成',
      thinking: '正在思考...',
      '': '',
    };

    return message || stageMessages[stage] || '';
  };

  // 解析 SSE 数据
  const parseSSEMessage = (line: string): { event?: string; data?: TencentCloudMessage } | null => {
    // 处理 event 行
    if (line.startsWith('event:')) {
      const event = line.slice(6).trim();
      return { event };
    }

    // 处理 data 行
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

  // 处理流式消息
  const handleStreamMessage = useCallback((msg: TencentCloudMessage, isFinish: boolean = false) => {
    setState((prev) => {
      const newState: StreamState = { ...prev };

      // 更新基础信息
      if (msg.completion_id) {
        newState.completionId = msg.completion_id;
      }
      if (msg.session_id) {
        newState.sessionId = msg.session_id;
      }

      // 处理不同阶段
      const stage = msg.processes.stage as StreamStage;
      newState.stage = stage;
      newState.stageMessage = getStageMessage(stage, msg.processes.message);

      // 工具调用阶段
      if (stage.startsWith('tool_call_')) {
        // 显示工具调用状态
        console.log('工具调用:', stage, msg.processes.detail);
      }

      // 搜索阶段
      if (stage === 'internal_searching' || stage === 'resource_retrieval_start') {
        // 显示搜索状态
        console.log('搜索中:', msg.processes.message);
      }

      // 搜索完成，保存引用片段
      if (stage === 'finished_internal_searching' && msg.additional_content?.reference_chunks) {
        newState.referenceChunks = msg.additional_content.reference_chunks;
      }

      // 思考阶段 - 累积思考内容
      if (stage === 'thinking' && msg.processes.delta_content) {
        newState.thinkingContent = prev.thinkingContent + msg.processes.delta_content;
      }

      // 输出阶段 - 累积输出内容
      if (stage === '' && msg.delta_content) {
        newState.outputContent = prev.outputContent + msg.delta_content;
      }

      // finish 事件 - 保存完整内容和引用文档
      if (isFinish) {
        newState.fullContent = msg.content;
        newState.isFinished = true;
        newState.isStreaming = false;

        if (msg.additional_content?.reference_docs) {
          newState.referenceDocs = msg.additional_content.reference_docs;
        }

        // 如果有完整内容，使用完整内容替换输出内容
        if (msg.content) {
          newState.outputContent = msg.content;
        }
      }

      // 检查是否停止
      if (msg.is_stop) {
        newState.isStreaming = false;
      }

      return newState;
    });
  }, []);

  // 处理错误响应
  const handleErrorResponse = useCallback((errorData: any) => {
    const errorMessage = errorData?.message || errorData?.error || '流式响应失败';
    const error = new Error(errorMessage);

    setState((prev) => ({
      ...prev,
      isStreaming: false,
      isFinished: true,
      error,
    }));

    message.error(errorMessage);
  }, []);

  // 开始流式消息
  const streamMessage = useCallback(
    async (request: StreamMessageRequest): Promise<string> => {
      // 重置状态
      resetStream();

      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();

      setState((prev) => ({
        ...prev,
        isStreaming: true,
        isFinished: false,
        error: null,
      }));

      try {
        // 从 localStorage 读取持久化的模型值
        const STORAGE_KEY = 'selected_model_value';
        const storedModelId = localStorage.getItem(STORAGE_KEY);

        // 优先使用传入的 modelId，否则使用持久化的 modelId
        const finalModelId = request.modelId || storedModelId || undefined;

        // 构建请求体
        const requestBody: SendMessageRequestBody = {
          message: request.message,
          sessionId: request.sessionId,
          options: {
            ...request.options,
            // 如果有 modelId，将其作为 modelName 传递
            // 注意：这里传递的是配置 ID，后端会根据 ID 查找对应的模型配置
            ...(finalModelId && { modelName: finalModelId }),
          },
        };

        const authorization = localStorage.getItem(TOKEN_KEY);

        // 调用流式 API
        const response = await fetch(`/api/v1/chat/sessions/${request.sessionId}/messages/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authorization}`,
          },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          // 尝试解析错误响应
          try {
            const errorData = await response.json();
            handleErrorResponse(errorData);
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
          } catch (e) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        }

        if (!response.body) {
          throw new Error('响应体为空');
        }

        // 获取 ReadableStream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let currentEvent: string | undefined;

        // 读取流式数据
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // 解码数据并添加到缓冲区
          const chunk = decoder.decode(value, { stream: true });
          bufferRef.current += chunk;

          // 按行分割
          const lines = bufferRef.current.split('\n');

          // 保留最后一行（可能不完整）
          bufferRef.current = lines.pop() || '';

          // 处理每一行
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
              // 空行表示一个消息结束
              currentEvent = undefined;
              continue;
            }

            const parsed = parseSSEMessage(trimmedLine);
            if (!parsed) continue;

            // 处理 event
            if (parsed.event) {
              currentEvent = parsed.event;
              continue;
            }

            // 处理 data
            if (parsed.data) {
              const isFinish = currentEvent === 'finish';
              handleStreamMessage(parsed.data, isFinish);

              // 如果是 finish 事件，结束流式传输
              if (isFinish) {
                const finalContent = parsed.data.content || state.outputContent;
                setState((prev) => ({
                  ...prev,
                  isStreaming: false,
                  isFinished: true,
                }));
                return finalContent;
              }
            }
          }
        }

        // 流式完成
        setState((prev) => {
          const finalContent = prev.fullContent || prev.outputContent;
          return {
            ...prev,
            isStreaming: false,
            isFinished: true,
            outputContent: finalContent,
          };
        });

        // 返回最终内容
        const finalState = state;
        return finalState.fullContent || finalState.outputContent;
      } catch (error: any) {
        // 处理中止错误
        if (error.name === 'AbortError') {
          message.info('已停止生成');
          setState((prev) => ({
            ...prev,
            isStreaming: false,
          }));
          return state.outputContent;
        }

        // 处理其他错误
        console.error('流式响应错误:', error);

        const errorMessage = error.message || '流式响应失败';
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          isFinished: true,
          error: error,
        }));

        message.error(errorMessage);
        throw error;
      } finally {
        abortControllerRef.current = null;
        bufferRef.current = '';
      }
    },
    [resetStream, handleStreamMessage, handleErrorResponse, state],
  );

  return {
    ...state,
    streamMessage,
    stopStream,
    resetStream,
  };
};
