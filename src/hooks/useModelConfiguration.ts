import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { getModelConfiguration } from '@/services/api/model-configuration/model-configuration';
import type {
  CreateModelConfigurationRequest,
  GetModelConfigurationsParams,
  UpdateModelConfigurationRequest,
  UpdateStatusRequest,
} from '@/types/api';

const modelConfigService = getModelConfiguration();

/**
 * 查询键工厂
 */
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
    queryFn: () => modelConfigService.getModelConfigurations(params),
  });
};

/**
 * 获取单个模型配置详情
 */
export const useModelConfiguration = (id: string) => {
  return useQuery({
    queryKey: modelConfigKeys.detail(id),
    queryFn: () => modelConfigService.getModelConfigurationsId({ id }),
    enabled: !!id,
  });
};

/**
 * 获取可用模型配置列表
 */
export const useAvailableModelConfigurations = () => {
  return useQuery({
    queryKey: modelConfigKeys.available(),
    queryFn: () => modelConfigService.getModelConfigurationsAvailable(),
  });
};

/**
 * 创建模型配置
 */
export const useCreateModelConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateModelConfigurationRequest) =>
      modelConfigService.postModelConfigurations(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modelConfigKeys.lists() });
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
      modelConfigService.putModelConfigurationsId({ id }, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: modelConfigKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: modelConfigKeys.lists() });
      message.success('模型配置更新成功');
    },
    onError: () => {
      message.error('模型配置更新失败');
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
      modelConfigService.patchModelConfigurationsIdStatus({ id }, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modelConfigKeys.lists() });
      message.success('状态更新成功');
    },
    onError: () => {
      message.error('状态更新失败');
    },
  });
};

/**
 * 删除模型配置
 */
export const useDeleteModelConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => modelConfigService.deleteModelConfigurationsId({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modelConfigKeys.lists() });
      message.success('模型配置删除成功');
    },
    onError: () => {
      message.error('模型配置删除失败');
    },
  });
};

/**
 * 验证模型配置
 */
export const useValidateModelConfiguration = () => {
  return useMutation({
    mutationFn: (id: string) => modelConfigService.postModelConfigurationsIdValidate({ id }),
    onSuccess: (response) => {
      if (response.data?.valid) {
        message.success('模型配置验证成功');
      } else {
        message.error(`验证失败: ${response.data?.message || '未知错误'}`);
      }
    },
    onError: () => {
      message.error('模型配置验证失败');
    },
  });
};
