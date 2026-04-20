/**
 * 聊天消息处理 Hook
 * 提供消息发送、编辑、删除等功能，支持流式响应
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useState } from 'react';
import { getMessages } from '@/services/api/messages/messages';
import type { MessageDetailResponse } from '@/types/api/messageDetailResponse';
import { useStreamResponse } from './useStreamResponse';

/**
 * 聊天消息处理 Hook
 */
export const useChatHandler = (sessionId: string) => {
  const queryClient = useQueryClient();
  const messagesApi = getMessages();

  // 流式响应 hook
  const streamResponse = useStreamResponse();

  // 临时消息 ID（用于流式响应时的临时消息）
  const [tempMessageId, setTempMessageId] = useState<string | null>(null);

  /**
   * 发送消息
   */
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!sessionId) {
        throw new Error('会话 ID 不能为空');
      }

      const response = await messagesApi.postChatSessionsIdMessages(
        { id: sessionId },
        {
          message: content,
          sessionId: sessionId,
        },
      );
      return response;
    },

    // 乐观更新：立即在 UI 中显示用户消息
    onMutate: async (content: string) => {
      // 取消正在进行的查询，避免覆盖乐观更新
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

      // 乐观更新：添加临时消息到列表开头
      // 注意：服务器返回的数据是倒序的（最新在前），所以新消息要插入到开头
      // useMessagesPagination 会反转数组，使新消息显示在底部
      queryClient.setQueryData(['messages', sessionId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages?.map((page: any, index: number) => {
            // 只在第一页插入新消息
            if (index === 0) {
              return {
                ...page,
                data: {
                  ...page.data,
                  data: [tempUserMessage, ...(page.data?.data || [])],
                },
              };
            }
            return page;
          }),
        };
      });

      // 返回上下文，用于回滚
      return { previousMessages };
    },

    // 发送成功：刷新消息列表
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', sessionId] });
      message.success('消息发送成功');
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

  /**
   * 删除消息
   */
  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      // TODO: 调用删除消息 API
      // const response = await messagesApi.deleteChatMessagesId({ id: messageId });
      // return response;
      throw new Error('删除消息功能暂未实现');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', sessionId] });
      message.success('消息已删除');
    },
    onError: (error: any) => {
      message.error(error?.message || '删除失败');
    },
  });

  /**
   * 编辑消息
   */
  const editMessage = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      // TODO: 调用编辑消息 API
      // const response = await messagesApi.patchChatMessagesId({ id: messageId }, { content });
      // return response;
      throw new Error('编辑消息功能暂未实现');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', sessionId] });
      message.success('消息已更新');
    },
    onError: (error: any) => {
      message.error(error?.message || '更新失败');
    },
  });

  /**
   * 发送流式消息
   */
  const sendStreamMessage = async (content: string, modelId?: string) => {
    if (!sessionId) {
      message.error('会话 ID 不能为空');
      return;
    }

    try {
      // 重置流式状态
      streamResponse.resetStream();

      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: ['messages', sessionId] });

      // 创建临时用户消息
      const tempUserMessageId = `temp-user-${Date.now()}`;
      const tempUserMessage: MessageDetailResponse = {
        id: tempUserMessageId,
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

      // 乐观更新：添加用户消息和空的 AI 消息到列表开头
      // 注意：服务器返回的数据是倒序的（最新在前），所以新消息要插入到开头
      // AI 消息在最前面（最新），用户消息在其后
      // useMessagesPagination 会反转数组，使消息按正确顺序显示（用户消息在上，AI 回复在下）
      queryClient.setQueryData(['messages', sessionId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages?.map((page: any, index: number) => {
            // 只在第一页插入新消息
            if (index === 0) {
              return {
                ...page,
                data: {
                  ...page.data,
                  data: [tempAIMessage, tempUserMessage, ...(page.data?.data || [])],
                },
              };
            }
            return page;
          }),
        };
      });

      // 开始流式响应
      const finalContent = await streamResponse.streamMessage({
        sessionId,
        message: content,
        modelId,
      });

      // 流式完成后，用最终内容更新临时 AI 消息，避免重新请求导致闪烁
      queryClient.setQueryData(['messages', sessionId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages?.map((page: any, index: number) => {
            if (index === 0) {
              return {
                ...page,
                data: {
                  ...page.data,
                  data: (page.data?.data || []).map((msg: MessageDetailResponse) => {
                    // 更新临时 AI 消息的内容为最终内容
                    if (msg.id === tempAIMessageId) {
                      return {
                        ...msg,
                        content: finalContent || msg.content,
                      };
                    }
                    return msg;
                  }),
                },
              };
            }
            return page;
          }),
        };
      });

      // 标记缓存为过期，但不立即重新请求
      // 下次用户切换会话或刷新时会获取真实数据
      queryClient.invalidateQueries({
        queryKey: ['messages', sessionId],
        refetchType: 'none',
      });

      setTempMessageId(null);
    } catch (error: any) {
      console.error('流式消息发送失败:', error);
      // 错误已在 useStreamResponse 中处理
      // 刷新消息列表，移除临时消息
      await queryClient.invalidateQueries({ queryKey: ['messages', sessionId] });
      setTempMessageId(null);
    }
  };

  /**
   * 停止生成
   */
  const handleStopGeneration = () => {
    streamResponse.stopStream();
    // 刷新消息列表
    queryClient.invalidateQueries({ queryKey: ['messages', sessionId] });
    setTempMessageId(null);
  };

  return {
    // 发送消息（非流式）
    sendMessage: sendMessage.mutateAsync,
    isSending: sendMessage.isPending,

    // 发送流式消息
    sendStreamMessage,
    streamState: streamResponse,
    tempMessageId,
    stopGeneration: handleStopGeneration,

    // 删除消息
    deleteMessage: deleteMessage.mutateAsync,
    isDeleting: deleteMessage.isPending,

    // 编辑消息
    editMessage: editMessage.mutateAsync,
    isEditing: editMessage.isPending,
  };
};
