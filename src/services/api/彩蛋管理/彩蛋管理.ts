/**
 * 彩蛋管理 API 服务
 * 暂无后端接口，预留接口路径
 */
import type { AjaxResult, TableDataInfo } from '../../../types/api';
import { orvalMutator } from '../../../utils/orval-mutator';

export const get = () => {
  const list = (params: Record<string, unknown>) => {
    return orvalMutator<TableDataInfo>({
      url: `/travel18/easterEgg/list`,
      method: 'POST',
      params,
    });
  };

  const add = (params: Record<string, unknown>) => {
    return orvalMutator<AjaxResult>({
      url: `/travel18/easterEgg/add`,
      method: 'POST',
      params,
    });
  };

  const edit = (params: Record<string, unknown>) => {
    return orvalMutator<AjaxResult>({
      url: `/travel18/easterEgg/edit`,
      method: 'POST',
      params,
    });
  };

  const remove = (params: Record<string, unknown>) => {
    return orvalMutator<AjaxResult>({
      url: `/travel18/easterEgg/remove`,
      method: 'POST',
      params,
    });
  };

  const getInfo = ({ easterEggId }: { easterEggId: number }) => {
    return orvalMutator<AjaxResult>({
      url: `/travel18/easterEgg/${easterEggId}`,
      method: 'GET',
    });
  };

  return { list, add, edit, remove, getInfo };
};

export type ListResult = NonNullable<Awaited<ReturnType<ReturnType<typeof get>['list']>>>;
export type AddResult = NonNullable<Awaited<ReturnType<ReturnType<typeof get>['add']>>>;
export type EditResult = NonNullable<Awaited<ReturnType<ReturnType<typeof get>['edit']>>>;
export type RemoveResult = NonNullable<Awaited<ReturnType<ReturnType<typeof get>['remove']>>>;
export type GetInfoResult = NonNullable<Awaited<ReturnType<ReturnType<typeof get>['getInfo']>>>;