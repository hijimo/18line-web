/**
 * 消息分页加载 Hook
 * 使用 React Query 的 useInfiniteQuery 实现消息的无限滚动加载
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { message } from 'antd';
import { useMemo } from 'react';
import { getMessages } from '@/services/api/messages/messages';
import type { MessageDetailResponse } from '@/types/api/messageDetailResponse';

/**
 * 消息分页参数
 */
interface UseMessagesPaginationParams {
  /** 会话 ID */
  sessionId: string | null;
  /** 每页消息数量 */
  pageSize?: number;
  /** 是否启用自动加载 */
  enabled?: boolean;
}

/**
 * 消息分页加载 Hook
 */
export const useMessagesPagination = ({
  sessionId,
  pageSize = 20,
  enabled = true,
}: UseMessagesPaginationParams) => {
  const messagesApi = getMessages();

  // 使用 useInfiniteQuery 实现无限滚动
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } =
    useInfiniteQuery({
      queryKey: ['messages', sessionId],
      queryFn: async ({ pageParam = 1 }) => {
        if (!sessionId) {
          throw new Error('会话 ID 不能为空');
        }

        try {
          const response = await messagesApi.getChatSessionsIdMessages(
            { id: sessionId },
            { pageNo: pageParam, pageSize },
          );
          return response;
        } catch (err) {
          message.error('加载消息失败');
          throw err;
        }
      },
      getNextPageParam: (lastPage, allPages) => {
        // 检查是否还有更多数据
        const currentTotal = allPages.reduce(
          (sum, page) => sum + (page.data?.data?.length || 0),
          0,
        );
        const totalCount = lastPage.data?.totalCount || 0;

        // 如果已加载的消息数量小于总数，返回下一页页码
        if (currentTotal < totalCount) {
          return allPages.length + 1;
        }

        // 没有更多数据
        return undefined;
      },
      initialPageParam: 1,
      enabled: enabled && !!sessionId,
      retry: 2,
      staleTime: 30000, // 30秒内数据视为新鲜
    });

  // 合并所有页的消息，并反转顺序（最新消息在最后）
  const messages = useMemo(() => {
    if (!data?.pages) return [];

    // 服务器返回：每页消息按创建时间倒序（最新在前）
    // 分页顺序：第1页是最新的消息，第2页是更早的消息...
    // 目标：聊天界面正序显示（最旧在上，最新在下）

    // 1. 先反转页面顺序（让最早的页在前）
    const reversedPages = [...data.pages].reverse();

    // 2. 合并所有页的消息，每页内部也反转（让最早的消息在前）
    const allMessages = reversedPages.flatMap((page) => {
      const pageMessages = page.data?.data || [];
      return [...pageMessages].reverse();
    });

    return allMessages;
  }, [data]);

  // 加载更多消息
  const loadMore = async () => {
    if (isFetchingNextPage || !hasNextPage) {
      return;
    }

    try {
      await fetchNextPage();
    } catch (err) {
      console.error('加载更多消息失败:', err);
    }
  };

  // 获取总消息数
  const totalCount = data?.pages?.[0]?.data?.totalCount || 0;

  return {
    /** 消息列表（已反转，最新消息在最后） */
    messages,
    /** 是否正在加载第一页 */
    isLoading,
    /** 是否正在加载更多 */
    isFetchingNextPage,
    /** 是否还有更多消息 */
    hasNextPage,
    /** 加载更多消息 */
    loadMore,
    /** 错误信息 */
    error,
    /** 重新加载 */
    refetch,
    /** 总消息数 */
    totalCount,
    /** 已加载消息数 */
    loadedCount: messages.length,
  };
};
