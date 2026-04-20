/**
 * 滚动控制 Hook
 * 管理消息列表的滚动行为和滚动按钮显示
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MessageDetailResponse } from '@/types/api/messageDetailResponse';

/**
 * useScroll Hook 参数
 */
interface UseScrollParams {
  /** 消息列表 */
  messages: MessageDetailResponse[];
  /** 滚动到顶部时的回调（用于加载更多历史消息） */
  onLoadMore?: () => void;
  /** 是否正在加载更多 */
  isLoadingMore?: boolean;
}

/**
 * useScroll Hook 返回值
 */
interface UseScrollReturn {
  /** 滚动容器引用 */
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  /** 滚动到顶部 */
  scrollToTop: () => void;
  /** 滚动到底部 */
  scrollToBottom: () => void;
  /** 是否显示"滚动到顶部"按钮 */
  showScrollToTop: boolean;
  /** 是否显示"滚动到底部"按钮 */
  showScrollToBottom: boolean;
}

/**
 * 滚动控制 Hook
 * @param params 滚动控制参数
 * @returns 滚动控制相关的状态和方法
 */
export const useScroll = ({
  messages,
  onLoadMore,
  isLoadingMore = false,
}: UseScrollParams): UseScrollReturn => {
  // 滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 按钮显示状态
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // 上次消息数量（用于判断是否有新消息）
  const lastMessageCountRef = useRef(messages.length);

  // 上次滚动高度（用于加载更多后保持滚动位置）
  const lastScrollHeightRef = useRef(0);

  // 是否正在加载更多的标记
  const isLoadingMoreRef = useRef(false);

  // 滚动到顶部
  const scrollToTop = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, []);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  // 更新按钮显示状态
  const updateButtonVisibility = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromTop = scrollTop;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // 距离顶部 > 100px 时显示"滚动到顶部"按钮
    setShowScrollToTop(distanceFromTop > 100);

    // 距离底部 > 100px 时显示"滚动到底部"按钮
    setShowScrollToBottom(distanceFromBottom > 100);
  }, []);

  // 检查是否需要加载更多历史消息
  const checkLoadMore = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !onLoadMore || isLoadingMoreRef.current) return;

    const { scrollTop } = container;

    // 当滚动到距离顶部 100px 以内时，触发加载更多
    if (scrollTop < 100) {
      isLoadingMoreRef.current = true;
      // 记录当前滚动高度，用于加载完成后恢复位置
      lastScrollHeightRef.current = container.scrollHeight;
      onLoadMore();
    }
  }, [onLoadMore]);

  // 监听滚动事件
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // 初始化按钮状态
    updateButtonVisibility();

    // 滚动事件处理函数
    const handleScroll = () => {
      updateButtonVisibility();
      checkLoadMore();
    };

    // 添加滚动事件监听
    container.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [updateButtonVisibility, checkLoadMore]);

  // 加载更多完成后，恢复滚动位置
  useEffect(() => {
    if (isLoadingMore) {
      return;
    }

    // 加载完成，重置标记
    if (isLoadingMoreRef.current) {
      const container = scrollContainerRef.current;
      if (container && lastScrollHeightRef.current > 0) {
        // 计算新增的内容高度
        const newScrollHeight = container.scrollHeight;
        const heightDiff = newScrollHeight - lastScrollHeightRef.current;

        // 恢复滚动位置（加上新增的高度）
        if (heightDiff > 0) {
          container.scrollTop = heightDiff;
        }

        lastScrollHeightRef.current = 0;
      }
      isLoadingMoreRef.current = false;
    }
  }, [isLoadingMore, messages.length]);

  // 新消息到达时自动滚动到底部
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // 检查是否有新消息
    const hasNewMessages = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;

    if (!hasNewMessages) return;

    // 计算距离底部的距离
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // 仅当用户在底部附近时（距离底部 < 150px）才自动滚动
    if (distanceFromBottom < 150) {
      // 使用 setTimeout 确保 DOM 更新后再滚动
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 100);
    }
  }, [messages]);

  return {
    scrollContainerRef,
    scrollToTop,
    scrollToBottom,
    showScrollToTop,
    showScrollToBottom,
  };
};
