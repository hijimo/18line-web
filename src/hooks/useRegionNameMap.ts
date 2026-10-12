/**
 * 行政区划编码 → 名称映射。
 *
 * 为什么要这个 hook：后台达人路线列表拿到的是 `province/city/district` **6 位编码**
 * （`TravelExpertRouteMapper.selectRouteList` 只 select 编码列，没有 regionName），
 * 直接渲染就是设计文档 §2.8 记录的既有缺陷 B6「C 端线路地区文案显示 6 位编码」。
 * C 端由后端 `RegionNameResolver` 解决；后台这里用既有的 `regionTree` 接口在前端解析，
 * 范式照抄 `src/pages/Users/index.tsx:34-56`（同一个 flatten 写法）。
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { get as getRegionApi } from '@/services/api/省市区编码管理/省市区编码管理';

const regionApi = getRegionApi();

type RegionNode = {
  regionCode?: string;
  regionName?: string;
  children?: RegionNode[];
};

const flattenRegions = (nodes: RegionNode[], map: Map<string, string>): void => {
  nodes.forEach((node) => {
    if (node?.regionCode) {
      map.set(node.regionCode, node.regionName ?? node.regionCode);
    }
    if (node?.children?.length) {
      flattenRegions(node.children, map);
    }
  });
};

/** 全量区划树拍平成 code → name；请求失败时返回空 Map（页面显示 '--'，不崩） */
export const useRegionNameMap = (): Map<string, string> => {
  const { data } = useQuery({
    queryKey: ['region-tree-name-map'],
    queryFn: () => regionApi.regionTree() as unknown as Promise<{ data?: RegionNode[] }>,
    staleTime: 10 * 60 * 1000,
  });

  return useMemo(() => {
    const map = new Map<string, string>();
    flattenRegions((data?.data ?? []) as RegionNode[], map);
    return map;
  }, [data]);
};

/** 把 province/city/district 三个编码拼成可读地区名；一个都解析不出来时返回 '--' */
export const formatRegionName = (
  map: Map<string, string>,
  region: { province?: string | null; city?: string | null; district?: string | null },
): string => {
  const names = [region.province, region.city, region.district]
    .filter((code): code is string => !!code)
    .map((code) => map.get(code))
    .filter((name): name is string => !!name);
  // 去重：直辖市/部分数据里省与市同名，重复显示「浙江省浙江省」很难看
  const unique = names.filter((name, idx) => names.indexOf(name) === idx);
  return unique.length ? unique.join(' / ') : '--';
};
