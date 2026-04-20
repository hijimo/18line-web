/**
 * 乐享文件上传相关的 React Query Hooks
 * 封装文件上传流程：上传文件 -> 获取 state -> 创建知识节点
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { getLexiangEntries } from '@/services/api/lexiang-entries/lexiang-entries';
import { getLexiangUpload } from '@/services/api/lexiang-upload/lexiang-upload';
import type {
  CreateFileEntryRequestSwaggerEntryType,
  PostLexiangUploadBodyMediaType,
} from '@/types/api';
import { lexiangEntryKeys } from './useLexiangEntries';

/**
 * 上传文件参数
 */
export interface UploadFileParams {
  /** 文件对象 */
  file: File;
  /** 媒体类型 */
  mediaType: PostLexiangUploadBodyMediaType;
  /** 知识库 ID */
  spaceId: string;
  /** 父节点 ID（可选，默认为知识库根目录） */
  parentId?: string;
}

/**
 * 上传文件并创建知识节点
 * 完整流程：上传文件到 COS -> 获取 state -> 创建文件节点
 */
export const useLexiangUpload = () => {
  const queryClient = useQueryClient();
  const uploadApi = getLexiangUpload();
  const entriesApi = getLexiangEntries();

  return useMutation({
    mutationFn: async ({ file, mediaType, spaceId, parentId }: UploadFileParams) => {
      // 第一步：上传文件到 COS，获取 state
      const uploadResult = await uploadApi.postLexiangUpload({
        file,
        mediaType,
      });

      const state = uploadResult?.data?.state;
      if (!state) {
        throw new Error('上传文件失败：未获取到 state');
      }

      // 第二步：使用 state 创建文件节点
      // 将媒体类型映射到节点类型
      const entryTypeMap: Record<
        PostLexiangUploadBodyMediaType,
        CreateFileEntryRequestSwaggerEntryType
      > = {
        file: 'file',
        video: 'video',
        audio: 'audio',
      };

      const entryResult = await entriesApi.postLexiangEntriesFile({
        name: file.name,
        state,
        parentId: parentId || spaceId,
        entryType: entryTypeMap[mediaType],
      });

      return entryResult;
    },
    onSuccess: () => {
      message.success('文件上传成功');
      // 刷新知识节点列表
      queryClient.invalidateQueries({ queryKey: lexiangEntryKeys.lists() });
    },
    onError: (error: Error) => {
      message.error(error.message || '文件上传失败');
    },
  });
};

/**
 * 批量上传文件
 */
export const useLexiangBatchUpload = () => {
  const queryClient = useQueryClient();
  const uploadApi = getLexiangUpload();
  const entriesApi = getLexiangEntries();

  return useMutation({
    mutationFn: async (params: UploadFileParams[]) => {
      const results = await Promise.allSettled(
        params.map(async ({ file, mediaType, spaceId, parentId }) => {
          // 上传文件
          const uploadResult = await uploadApi.postLexiangUpload({
            file,
            mediaType,
          });

          const state = uploadResult?.data?.state;
          if (!state) {
            throw new Error(`上传文件 ${file.name} 失败：未获取到 state`);
          }

          // 创建文件节点
          const entryTypeMap: Record<
            PostLexiangUploadBodyMediaType,
            CreateFileEntryRequestSwaggerEntryType
          > = {
            file: 'file',
            video: 'video',
            audio: 'audio',
          };

          return entriesApi.postLexiangEntriesFile({
            name: file.name,
            state,
            parentId: parentId || spaceId,
            entryType: entryTypeMap[mediaType],
          });
        }),
      );

      // 统计成功和失败数量
      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failedCount = results.filter((r) => r.status === 'rejected').length;

      return { successCount, failedCount, results };
    },
    onSuccess: ({ successCount, failedCount }) => {
      if (failedCount === 0) {
        message.success(`成功上传 ${successCount} 个文件`);
      } else {
        message.warning(`上传完成：${successCount} 个成功，${failedCount} 个失败`);
      }
      // 刷新知识节点列表
      queryClient.invalidateQueries({ queryKey: lexiangEntryKeys.lists() });
    },
    onError: () => {
      message.error('批量上传失败');
    },
  });
};
