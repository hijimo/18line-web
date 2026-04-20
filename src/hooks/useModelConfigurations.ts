/**
 * 模型配置相关的 React Query Hooks
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { getModelConfiguration } from '@/services/api/model-configuration/model-configuration';
import type {
  CreateModelConfigurationRequest,
  GetModelConfigurationsParams,
  UpdateModelConfigurationRequest,
  UpdateStatusRequest,
} from '@/types/api';

const modelConfigApi = getModelConfiguration();

// 查询键工厂
export const modelConfigKeys = {
  all: ['modelConfigurations'] as const,
  lists: () => [...modelConfigKeys.all, 'list'] as const,
  list: (params?: GetModelConfigurationsParams) => [...modelConfigKeys.lists(), params] as const,
  details: () => [...modelConfigKeys.all, 'detail'] as const,
  detail: (id: string) => [...modelConfigKeys.details(), id] as const,
  available: () => [...modelConfigKeys.all, 'available'] as const,
};

/**
 * 获取模型配置列表
 */
export const useModelConfigurations = (params?: GetModelConfigurationsParams) => {
  return useQuery({
    queryKey: modelConfigKeys.list(params),
    queryFn: () => modelConfigApi.getModelConfigurations(params),
  });
};

/**
 * 获取可用模型配置列表
 */
export const useAvailableModelConfigurations = () => {
  return useQuery({
    queryKey: modelConfigKeys.available(),
    queryFn: () => modelConfigApi.getModelConfigurationsAvailable(),
  });
};

/**
 * 获取单个模型配置详情
 */
export const useModelConfiguration = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: modelConfigKeys.detail(id),
    queryFn: () => modelConfigApi.getModelConfigurationsId({ id }),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
};

/**
 * 创建模型配置
 */
export const useCreateModelConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateModelConfigurationRequest) =>
      modelConfigApi.postModelConfigurations(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modelConfigKeys.lists() });
      queryClient.invalidateQueries({ queryKey: modelConfigKeys.available() });
      message.success('模型配置创建成功');
    },
    onError: () => {
      message.error('模型配置创建失败');
    },
  });
};

/**
 * 更新模型配置
 */
export const useUpdateModelConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateModelConfigurationRequest }) =>
      modelConfigApi.putModelConfigurationsId({ id }, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: modelConfigKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: modelConfigKeys.lists() });
      queryClient.invalidateQueries({ queryKey: modelConfigKeys.available() });
      message.success('模型配置更新成功');
    },
    onError: () => {
      message.error('模型配置更新失败');
    },
  });
};

/**
 * 删除模型配置
 */
export const useDeleteModelConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => modelConfigApi.deleteModelConfigurationsId({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modelConfigKeys.lists() });
      queryClient.invalidateQueries({ queryKey: modelConfigKeys.available() });
      message.success('模型配置删除成功');
    },
    onError: () => {
      message.error('模型配置删除失败');
    },
  });
};

/**
 * 更新模型配置状态
 */
export const useUpdateModelConfigurationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UpdateStatusRequest }) =>
      modelConfigApi.patchModelConfigurationsIdStatus({ id }, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modelConfigKeys.lists() });
      queryClient.invalidateQueries({ queryKey: modelConfigKeys.available() });
      message.success('模型状态更新成功');
    },
    onError: () => {
      message.error('模型状态更新失败');
    },
  });
};

/**
 * 验证模型配置
 */
export const useValidateModelConfiguration = () => {
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      modelConfigApi.postModelConfigurationsIdValidate({ id }),
  });
};
