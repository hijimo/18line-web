/**
 * 乐享知识节点相关的 React Query Hooks
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { getLexiangEntries } from '@/services/api/lexiang-entries/lexiang-entries';
import type {
  CreateFileEntryRequestSwagger,
  CreateFolderRequestSwagger,
  GetLexiangEntriesParams,
  LexiangEntryItem,
} from '@/types/api';

// 查询键工厂
export const lexiangEntryKeys = {
  all: ['lexiang-entries'] as const,
  lists: () => [...lexiangEntryKeys.all, 'list'] as const,
  list: (params: GetLexiangEntriesParams) => [...lexiangEntryKeys.lists(), params] as const,
  details: () => [...lexiangEntryKeys.all, 'detail'] as const,
  detail: (id: string) => [...lexiangEntryKeys.details(), id] as const,
  content: (id: string) => [...lexiangEntryKeys.all, 'content', id] as const,
};

/**
 * 获取知识节点列表
 */
export const useLexiangEntries = (params: GetLexiangEntriesParams) => {
  const api = getLexiangEntries();

  return useQuery({
    queryKey: lexiangEntryKeys.list(params),
    queryFn: () => api.getLexiangEntries(params),
    enabled: !!params.spaceId,
  });
};

/**
 * 获取知识节点详情
 */
export const useLexiangEntryDetail = (id: string) => {
  const api = getLexiangEntries();

  return useQuery({
    queryKey: lexiangEntryKeys.detail(id),
    queryFn: () => api.getLexiangEntriesId({ id }),
    enabled: !!id,
  });
};

/**
 * 获取线上文档内容
 */
export const useLexiangEntryContent = (id: string) => {
  const api = getLexiangEntries();

  return useQuery({
    queryKey: lexiangEntryKeys.content(id),
    queryFn: () => api.getLexiangEntriesIdContent({ id }),
    enabled: !!id,
  });
};

/**
 * 删除知识节点
 */
export const useDeleteLexiangEntry = () => {
  const queryClient = useQueryClient();
  const api = getLexiangEntries();

  return useMutation({
    mutationFn: (id: string) => api.deleteLexiangEntriesId({ id }),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: lexiangEntryKeys.lists() });
    },
    onError: () => {
      message.error('删除失败');
    },
  });
};

/**
 * 创建文件节点
 */
export const useCreateLexiangEntryFile = () => {
  const queryClient = useQueryClient();
  const api = getLexiangEntries();

  return useMutation({
    mutationFn: (data: CreateFileEntryRequestSwagger) => api.postLexiangEntriesFile(data),
    onSuccess: () => {
      message.success('文件创建成功');
      queryClient.invalidateQueries({ queryKey: lexiangEntryKeys.lists() });
    },
    onError: () => {
      message.error('文件创建失败');
    },
  });
};

/**
 * 创建文件夹
 */
export const useCreateLexiangEntryFolder = () => {
  const queryClient = useQueryClient();
  const api = getLexiangEntries();

  return useMutation({
    mutationFn: (data: CreateFolderRequestSwagger) => api.postLexiangEntriesFolder(data),
    onSuccess: () => {
      message.success('文件夹创建成功');
      queryClient.invalidateQueries({ queryKey: lexiangEntryKeys.lists() });
    },
    onError: () => {
      message.error('文件夹创建失败');
    },
  });
};

export type { LexiangEntryItem };
