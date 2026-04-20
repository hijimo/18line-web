/**
 * 乐享 AI 搜索 Hook
 * 基于 React Query 封装搜索接口
 */
import { useMutation } from '@tanstack/react-query';
import { getLexiangAi } from '@/services/api/lexiang-ai/lexiang-ai';
import type { AISearchRequestSwagger } from '@/types/api';

const lexiangAi = getLexiangAi();

/**
 * AI 搜索 Hook
 * 使用 mutation 因为搜索是用户主动触发的操作
 */
export const useLexiangSearch = () => {
  return useMutation({
    mutationFn: (params: AISearchRequestSwagger) => lexiangAi.postLexiangAiSearch(params),
  });
};
