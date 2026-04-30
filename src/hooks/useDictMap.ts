import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get as getDictApi } from '@/services/api/字典数据/字典数据';

const dictApi = getDictApi();

/** 获取字典数据原始列表 */
export const useDictData = (code: string) => {
  return useQuery({
    queryKey: ['dict', code],
    queryFn: () => dictApi.dictType({ dictType: code }),
    staleTime: 60 * 1000,
    enabled: !!code,
  });
};

/** 获取字典 value → label 映射 */
export const useDictMap = (code: string): Record<string, string> => {
  const { data } = useDictData(code);
  return useMemo(() => {
    const list = (data as any)?.data || [];
    return Object.fromEntries(list.map((item: any) => [item.dictValue, item.dictLabel]));
  }, [data]);
};
