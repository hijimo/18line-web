/**
 * 达人路线专用的景点选择器：**公共景点 + 我的私域景点** 的并集。
 *
 * 为什么不能直接用既有的 `components/DataSelect/AttractionSelect`：
 * - 它只查 `/travel18/attraction/list`，而后端在该 statement 里**硬编码**追加了
 *   `owner_user_id IS NULL`（契约 §3 fail-closed 隔离），所以达人自己的私域景点
 *   在那个接口里**永远查不到**；
 * - 私域景点必须走 A9 `/travel18/expertAttraction/list`。
 * 两个接口取并集，并在 UI 上**显式区分来源**（分组标题 + 名称后缀），
 * 因为「把别人的私域景点编进自己路线」是隔离设计要防的事，运营看一眼就得能分辨。
 *
 * ⚠️ 私域景点若是「已封禁(owner_audit_status='2')」，后端会拒绝编入路线；
 *    这里给选项打上标记并禁用，避免用户选完提交才吃到报错。
 */

import { useQuery } from '@tanstack/react-query';
import { useDebounceFn } from 'ahooks';
import { Select, Spin } from 'antd';
import React, { useMemo, useState } from 'react';
import { BlindStatusEnum, OwnerAuditStatusEnum } from '@/enums';
import { listExpertAttraction, listPublicAttractions } from '@/services/expert';

/** 选中项的最小引用（详情页回显时也带这些字段，避免只显示裸 ID） */
export type ExpertAttractionRef = {
  attractionId: number;
  attractionName?: string;
  /** null / undefined = 平台公共景点；有值 = 归属该达人的私域景点 */
  ownerUserId?: number | null;
  /** 私域景点的审核状态；'2' = 已封禁，不可编入路线 */
  ownerAuditStatus?: string | null;
  /** 景点自身盲态（travel_attraction.blind_status）：'1' = 全盲，编辑页要据此给讲解警示 */
  blindStatus?: string | null;
};

type ExpertAttractionSelectProps = {
  value?: ExpertAttractionRef[];
  onChange?: (next: ExpertAttractionRef[]) => void;
  placeholder?: string;
  disabled?: boolean;
  /** 单次最多可选数量（后端 MAX_DAY_ATTRACTION_COUNT = 20） */
  maxCount?: number;
};

type OptionMeta = ExpertAttractionRef & { isPrivate: boolean; banned: boolean };

const PAGE_SIZE = 50;

export const ExpertAttractionSelect: React.FC<ExpertAttractionSelectProps> = ({
  value,
  onChange,
  placeholder = '搜索并选择景点（公共 + 我的私域）',
  disabled,
  maxCount,
}) => {
  const [keyword, setKeyword] = useState('');

  const { run: handleSearch } = useDebounceFn((next: string) => setKeyword(next), { wait: 300 });

  // 公共景点：既有接口，后端硬编码 owner_user_id IS NULL
  const publicQuery = useQuery({
    queryKey: ['expert-attraction-public', keyword],
    queryFn: () => listPublicAttractions(keyword, PAGE_SIZE),
    staleTime: 30 * 1000,
  });

  // 私域景点：A9，daren 只看自己，admin 看全部（后端 @AuthorDataScope 决定）
  const privateQuery = useQuery({
    queryKey: ['expert-attraction-private', keyword],
    queryFn: async () => {
      const res = await listExpertAttraction({
        pageNum: 1,
        pageSize: PAGE_SIZE,
        attractionName: keyword || undefined,
      });
      return res?.rows ?? [];
    },
    staleTime: 30 * 1000,
  });

  /** id → 元信息，onChange 时据此还原名称与来源（Select 只回传 id 数组） */
  const metaMap = useMemo(() => {
    const map = new Map<number, OptionMeta>();
    (publicQuery.data ?? []).forEach((item) => {
      map.set(item.attractionId, {
        attractionId: item.attractionId,
        attractionName: item.attractionName,
        ownerUserId: null,
        ownerAuditStatus: null,
        blindStatus: item.blindStatus ?? null,
        isPrivate: false,
        banned: false,
      });
    });
    (privateQuery.data ?? []).forEach((item) => {
      map.set(item.attractionId, {
        attractionId: item.attractionId,
        attractionName: item.attractionName,
        ownerUserId: item.ownerUserId ?? null,
        ownerAuditStatus: item.ownerAuditStatus ?? null,
        blindStatus: item.blindStatus ?? null,
        isPrivate: true,
        banned: item.ownerAuditStatus === OwnerAuditStatusEnum.BANNED,
      });
    });
    return map;
  }, [publicQuery.data, privateQuery.data]);

  const buildOptions = (list: OptionMeta[]) =>
    list.map((item) => ({
      value: item.attractionId,
      // 名称后缀 + 分组标题双重标注来源；封禁的直接禁用并写明原因；
      // 全盲景点标「全盲」——设计文档 §7.1 校验 2 要求 option 上就能看到 blindStatus
      label: item.banned
        ? `${item.attractionName}（私域·已封禁）`
        : `${item.attractionName}（${item.isPrivate ? '私域' : '公共'}${
            item.blindStatus === BlindStatusEnum.YES ? '·全盲' : ''
          }）`,
      disabled: item.banned,
    }));

  const options = useMemo(() => {
    const all = [...metaMap.values()];
    const groups = [
      {
        label: '我的私域景点',
        options: buildOptions(all.filter((i) => i.isPrivate)),
      },
      {
        label: '公共景点',
        options: buildOptions(all.filter((i) => !i.isPrivate)),
      },
    ];
    // 编辑回显：已选但不在当前搜索结果里的项，用详情带回来的名称兜底，
    // 否则 Select 会显示裸 ID，运营看不出选了什么。
    const seeds = (value ?? []).filter((v) => !metaMap.has(v.attractionId));
    if (seeds.length) {
      groups.push({
        label: '已选（不在当前搜索结果中）',
        options: buildOptions(
          seeds.map((s) => ({
            attractionId: s.attractionId,
            attractionName: s.attractionName ?? `#${s.attractionId}`,
            ownerUserId: s.ownerUserId ?? null,
            blindStatus: s.blindStatus ?? null,
            isPrivate: s.ownerUserId != null,
            banned: s.ownerAuditStatus === OwnerAuditStatusEnum.BANNED,
          })),
        ),
      });
    }
    return groups.filter((g) => g.options.length > 0);
  }, [metaMap, value]);

  const handleChange = (ids: number[]) => {
    const next: ExpertAttractionRef[] = ids.map((id) => {
      const meta = metaMap.get(id);
      if (meta) {
        return {
          attractionId: id,
          attractionName: meta.attractionName,
          ownerUserId: meta.ownerUserId ?? null,
          ownerAuditStatus: meta.ownerAuditStatus ?? null,
          blindStatus: meta.blindStatus ?? null,
        };
      }
      // 不在当前结果里（例如被封禁后从列表消失）：保留原有回显信息，别把它变成裸 ID
      const prev = (value ?? []).find((v) => v.attractionId === id);
      return prev ?? { attractionId: id };
    });
    onChange?.(next);
  };

  const loading = publicQuery.isFetching || privateQuery.isFetching;

  return (
    <Select
      mode="multiple"
      value={(value ?? []).map((v) => v.attractionId)}
      onChange={handleChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      loading={loading}
      allowClear
      showSearch
      filterOption={false}
      onSearch={handleSearch}
      maxCount={maxCount}
      notFoundContent={loading ? <Spin size="small" /> : '暂无数据'}
      style={{ width: '100%' }}
    />
  );
};

export default ExpertAttractionSelect;
