/**
 * 乐享知识库相关的 React Query Hooks
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { getLexiangKnowledgeBase } from '@/services/api/lexiang-knowledge-base/lexiang-knowledge-base';
import type {
  CreateSpaceRequestSwagger,
  LexiangSpaceItem,
  PutLexiangSpacesIdBody,
} from '@/types/api';

// 获取环境变量中的团队ID
const TEAM_ID = import.meta.env.VITE_LEXIANG_TEAM_ID || '';

// 查询键工厂
export const lexiangSpaceKeys = {
  all: ['lexiang-spaces'] as const,
  lists: () => [...lexiangSpaceKeys.all, 'list'] as const,
  list: (params: { teamId: string; limit?: number; pageToken?: string }) =>
    [...lexiangSpaceKeys.lists(), params] as const,
  details: () => [...lexiangSpaceKeys.all, 'detail'] as const,
  detail: (id: string) => [...lexiangSpaceKeys.details(), id] as const,
};

/**
 * 获取知识库列表
 */
export const useLexiangSpaces = (params?: { limit?: number; pageToken?: string }) => {
  const api = getLexiangKnowledgeBase();

  return useQuery({
    queryKey: lexiangSpaceKeys.list({ teamId: TEAM_ID, ...params }),
    queryFn: () =>
      api.getLexiangSpaces({
        teamId: TEAM_ID,
        limit: params?.limit,
        pageToken: params?.pageToken,
      }),
    enabled: !!TEAM_ID,
  });
};

/**
 * 获取知识库详情
 */
export const useLexiangSpaceDetail = (id: string) => {
  const api = getLexiangKnowledgeBase();

  return useQuery({
    queryKey: lexiangSpaceKeys.detail(id),
    queryFn: () => api.getLexiangSpacesId({ id }),
    enabled: !!id,
  });
};

/**
 * 创建知识库
 */
export const useCreateLexiangSpace = () => {
  const queryClient = useQueryClient();
  const api = getLexiangKnowledgeBase();

  return useMutation({
    mutationFn: (data: Omit<CreateSpaceRequestSwagger, 'teamId'>) =>
      api.postLexiangSpaces({
        ...data,
        teamId: TEAM_ID,
      }),
    onSuccess: () => {
      message.success('知识库创建成功');
      queryClient.invalidateQueries({ queryKey: lexiangSpaceKeys.lists() });
    },
    onError: () => {
      message.error('知识库创建失败');
    },
  });
};

/**
 * 更新知识库
 */
export const useUpdateLexiangSpace = () => {
  const queryClient = useQueryClient();
  const api = getLexiangKnowledgeBase();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PutLexiangSpacesIdBody }) =>
      api.putLexiangSpacesId({ id }, data),
    onSuccess: (_, { id }) => {
      message.success('知识库更新成功');
      queryClient.invalidateQueries({ queryKey: lexiangSpaceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: lexiangSpaceKeys.lists() });
    },
    onError: () => {
      message.error('知识库更新失败');
    },
  });
};

/**
 * 删除知识库
 */
export const useDeleteLexiangSpace = () => {
  const queryClient = useQueryClient();
  const api = getLexiangKnowledgeBase();

  return useMutation({
    mutationFn: (id: string) => api.deleteLexiangSpacesId({ id }),
    onSuccess: () => {
      message.success('知识库删除成功');
      queryClient.invalidateQueries({ queryKey: lexiangSpaceKeys.lists() });
    },
    onError: () => {
      message.error('知识库删除失败');
    },
  });
};

export type { LexiangSpaceItem };
