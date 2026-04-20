/**
 * 会话操作 Hook
 * 提供会话的创建、删除、置顶、归档等操作
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { getSessions } from '@/services/api/sessions/sessions';
import type { CreateSessionParams } from '@/types/chat';

/**
 * 会话操作 Hook
 */
export const useSessionOperations = () => {
  const queryClient = useQueryClient();
  const sessionsApi = getSessions();

  /**
   * 创建新会话
   */
  const createSession = useMutation({
    mutationFn: async (params?: CreateSessionParams) => {
      const response = await sessionsApi.postChatSessions({
        title: params?.title || '新会话',
        modelName: params?.modelName || 'gpt-4',
        systemPrompt: params?.systemPrompt || '',
        temperature: params?.temperature || 0.7,
        topP: params?.topP || 1.0,
      });
      return response;
    },
    onSuccess: () => {
      // 刷新会话列表
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      message.success('会话创建成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '创建会话失败');
    },
  });

  /**
   * 置顶/取消置顶会话
   */
  const pinSession = useMutation({
    mutationFn: async ({ sessionId, pinned }: { sessionId: string; pinned: boolean }) => {
      const response = await sessionsApi.postChatSessionsIdPin({ id: sessionId }, { pinned });
      return response;
    },
    onSuccess: (_, variables) => {
      // 刷新会话列表
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      message.success(variables.pinned ? '已置顶' : '已取消置顶');
    },
    onError: (error: any) => {
      message.error(error?.message || '操作失败');
    },
  });

  /**
   * 归档/取消归档会话
   */
  const archiveSession = useMutation({
    mutationFn: async ({ sessionId, archived }: { sessionId: string; archived: boolean }) => {
      const response = await sessionsApi.postChatSessionsIdArchive({ id: sessionId }, { archived });
      return response;
    },
    onSuccess: (_, variables) => {
      // 刷新会话列表
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      message.success(variables.archived ? '已归档' : '已取消归档');
    },
    onError: (error: any) => {
      message.error(error?.message || '操作失败');
    },
  });

  /**
   * 删除会话
   */
  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await sessionsApi.deleteChatSessionsId({ id: sessionId });
      return response;
    },
    onSuccess: () => {
      // 刷新会话列表
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      message.success('会话已删除');
    },
    onError: (error: any) => {
      message.error(error?.message || '删除失败');
    },
  });

  /**
   * 更新会话信息
   */
  const updateSession = useMutation({
    mutationFn: async ({
      sessionId,
      data,
    }: {
      sessionId: string;
      data: {
        title?: string;
        modelName?: string;
        systemPrompt?: string;
        temperature?: number;
        topP?: number;
      };
    }) => {
      const response = await sessionsApi.patchChatSessionsId({ id: sessionId }, data);
      return response;
    },
    onSuccess: () => {
      // 刷新会话列表和会话详情
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      message.success('会话更新成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '更新失败');
    },
  });

  return {
    // 创建会话
    createSession: createSession.mutateAsync,
    isCreating: createSession.isPending,

    // 置顶会话
    pinSession: pinSession.mutateAsync,
    isPinning: pinSession.isPending,

    // 归档会话
    archiveSession: archiveSession.mutateAsync,
    isArchiving: archiveSession.isPending,

    // 删除会话（直接删除，不带确认）
    deleteSession: deleteSession.mutateAsync,
    isDeleting: deleteSession.isPending,

    // 更新会话
    updateSession: updateSession.mutateAsync,
    isUpdating: updateSession.isPending,
  };
};
