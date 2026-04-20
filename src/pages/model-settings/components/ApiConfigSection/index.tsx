/**
 * API 配置区域组件
 * 展示所有 API 提供商的配置卡片
 */
import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Col, message, Row } from 'antd';
import React, { useState } from 'react';
import {
  useModelConfigurations,
  useValidateModelConfiguration,
} from '@/hooks/useModelConfigurations';
import { CreateModelConfigurationRequestModelProvider } from '@/types/api';
import ApiConfigCard from '../ApiConfigCard';
import ConfigDrawer from '../ConfigDrawer';

const ApiConfigSection: React.FC = () => {
  const { data } = useModelConfigurations({ pageNo: 1, pageSize: 100 });
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>();
  const [editingConfigId, setEditingConfigId] = useState<string | undefined>();
  const [validatingId, setValidatingId] = useState<string | undefined>();

  // 获取所有配置
  const configs = data?.data?.data || [];

  // 验证配置
  const { mutateAsync: validateConfig } = useValidateModelConfiguration();

  // 根据提供商分组配置
  const getConfigByProvider = (provider: string) => {
    return configs.find((config) => config.modelProvider === provider);
  };

  // 处理编辑配置
  const handleEdit = (provider: string, configId?: string) => {
    setSelectedProvider(provider);
    setEditingConfigId(configId);
    setDrawerVisible(true);
  };

  // 处理添加自定义配置
  const handleAddCustom = () => {
    setSelectedProvider(CreateModelConfigurationRequestModelProvider.custom_openai);
    setEditingConfigId(undefined);
    setDrawerVisible(true);
  };

  // 处理验证配置
  const handleValidate = async (configId: string) => {
    try {
      setValidatingId(configId);
      await validateConfig({ id: configId });
      message.success('验证成功');
    } catch (error: any) {
      message.error(error?.message || '验证失败');
    } finally {
      setValidatingId(undefined);
    }
  };

  // API 提供商配置
  const apiProviders = [
    {
      provider: CreateModelConfigurationRequestModelProvider.openai,
      label: 'OpenAI API',
      tagColor: 'green',
    },
    {
      provider: CreateModelConfigurationRequestModelProvider.anthropic,
      label: 'Anthropic API',
      tagColor: 'blue',
    },
    {
      provider: CreateModelConfigurationRequestModelProvider.googlegenai,
      label: 'Google AI API',
      tagColor: 'red',
    },
    {
      provider: CreateModelConfigurationRequestModelProvider.azureopenai,
      label: 'Azure OpenAI API',
      tagColor: 'cyan',
    },
    {
      provider: CreateModelConfigurationRequestModelProvider.bianlian,
      label: '百炼 API',
      tagColor: 'purple',
    },
  ];

  return (
    <>
      <Card title="模型配置" className="mb-6">
        <Row gutter={[16, 16]}>
          {apiProviders.map((item) => {
            const config = getConfigByProvider(item.provider);
            return (
              <Col key={item.provider} xs={24} sm={24} md={12} lg={12} xl={8}>
                <ApiConfigCard
                  provider={item.provider}
                  providerLabel={item.label}
                  tagColor={item.tagColor}
                  configured={!!config}
                  apiKey={config ? '已配置' : undefined}
                  baseUrl={config?.baseUrl}
                  extraConfig={
                    config?.model
                      ? {
                          模型: config.model,
                          ...(config.queryParams && { 查询参数: config.queryParams }),
                        }
                      : undefined
                  }
                  onEdit={() => handleEdit(item.provider, config?.id)}
                  onValidate={config?.id ? () => handleValidate(config.id!) : undefined}
                  validating={validatingId === config?.id}
                />
              </Col>
            );
          })}
        </Row>

        <div className="mt-4 text-center">
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddCustom} size="large">
            添加自定义配置
          </Button>
        </div>
      </Card>

      <ConfigDrawer
        visible={drawerVisible}
        provider={selectedProvider}
        configId={editingConfigId}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedProvider(undefined);
          setEditingConfigId(undefined);
        }}
      />
    </>
  );
};

export default ApiConfigSection;
