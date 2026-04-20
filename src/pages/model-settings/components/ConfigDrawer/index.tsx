/**
 * 配置抽屉组件
 * 用于创建和编辑模型配置
 */
import { Button, Drawer, Form, Input, message, Select, Space } from 'antd';
import React, { useEffect } from 'react';
import {
  useCreateModelConfiguration,
  useModelConfiguration,
  useUpdateModelConfiguration,
} from '@/hooks/useModelConfigurations';
import { CreateModelConfigurationRequestModelProvider } from '@/types/api';
import type { CreateModelConfigurationRequest } from '@/types/api';

const { Option } = Select;
const { TextArea } = Input;

interface ConfigDrawerProps {
  /** 是否显示抽屉 */
  visible: boolean;
  /** 预选的提供商 */
  provider?: string;
  /** 编辑的配置 ID */
  configId?: string;
  /** 关闭回调 */
  onClose: () => void;
}

const ConfigDrawer: React.FC<ConfigDrawerProps> = ({ visible, provider, configId, onClose }) => {
  const [form] = Form.useForm();
  const createConfig = useCreateModelConfiguration();
  const updateConfig = useUpdateModelConfiguration();
  const { data: configData } = useModelConfiguration(configId || '', { enabled: !!configId });

  const isEdit = !!configId;
  const selectedProvider = Form.useWatch('modelProvider', form);

  // 加载编辑数据
  useEffect(() => {
    if (configData?.data) {
      const config = configData.data;
      form.setFieldsValue({
        name: config.name,
        modelProvider: config.modelProvider,
        model: config.model,
        baseUrl: config.baseUrl,
        queryParams: config.queryParams,
        // 注意：apiKey 不会从服务器返回，编辑时需要重新输入
      });
    } else if (provider) {
      form.setFieldsValue({ modelProvider: provider });
    }
  }, [configData, provider, form]);

  // 重置表单
  useEffect(() => {
    if (!visible) {
      form.resetFields();
    }
  }, [visible, form]);

  const handleSubmit = async (values: CreateModelConfigurationRequest) => {
    try {
      if (isEdit) {
        await updateConfig.mutateAsync({ id: configId, data: values });
        message.success('配置更新成功');
      } else {
        await createConfig.mutateAsync(values);
        message.success('配置创建成功');
      }
      onClose();
    } catch (error) {
      // 错误已在 hook 中处理
      console.error(error);
    }
  };

  // 根据不同的提供商渲染不同的表单字段
  const renderProviderFields = () => {
    switch (selectedProvider) {
      case CreateModelConfigurationRequestModelProvider.openai:
      case CreateModelConfigurationRequestModelProvider.anthropic:
      case CreateModelConfigurationRequestModelProvider.googlegenai:
        return (
          <Form.Item
            label="API Key"
            name="apiKey"
            rules={[{ required: !isEdit, message: '请输入 API Key' }]}
            tooltip={isEdit ? '留空则保持原有配置不变' : undefined}
          >
            <Input.Password placeholder={isEdit ? '留空保持不变' : '请输入 API Key'} />
          </Form.Item>
        );

      case CreateModelConfigurationRequestModelProvider.bianlian:
        return (
          <>
            <Form.Item
              label="API Key"
              name="apiKey"
              rules={[{ required: !isEdit, message: '请输入 API Key' }]}
              tooltip={isEdit ? '留空则保持原有配置不变' : undefined}
            >
              <Input.Password placeholder={isEdit ? '留空保持不变' : '请输入 API Key'} />
            </Form.Item>
            <Form.Item
              label="Base URL"
              name="baseUrl"
              rules={[{ required: true, message: '请输入 Base URL' }]}
            >
              <Input placeholder="例如: https://api.bailian.com" />
            </Form.Item>
          </>
        );

      case CreateModelConfigurationRequestModelProvider.azureopenai:
        return (
          <>
            <Form.Item
              label="API Key"
              name="apiKey"
              rules={[{ required: !isEdit, message: '请输入 API Key' }]}
              tooltip={isEdit ? '留空则保持原有配置不变' : undefined}
            >
              <Input.Password
                placeholder={isEdit ? '留空保持不变' : '请输入 Azure OpenAI API Key'}
              />
            </Form.Item>
            <Form.Item
              label="Base URL"
              name="baseUrl"
              rules={[{ required: true, message: '请输入 Base URL' }]}
              tooltip="Azure OpenAI 资源端点"
            >
              <Input placeholder="例如: https://my-resource.openai.azure.com" />
            </Form.Item>
            <Form.Item
              label="Deployment Name"
              name="model"
              rules={[{ required: true, message: '请输入 Deployment Name' }]}
              tooltip="Azure OpenAI 中创建的部署名称"
            >
              <Input placeholder="例如: gpt-35-turbo" />
            </Form.Item>
            <Form.Item
              label="API Version"
              name="queryParams"
              rules={[{ required: true, message: '请输入 API Version' }]}
              tooltip="API 版本，格式为 JSON"
            >
              <Input placeholder='例如: {"api-version":"2024-02-15-preview"}' />
            </Form.Item>
          </>
        );

      case CreateModelConfigurationRequestModelProvider.custom_openai:
        return (
          <>
            <Form.Item
              label="API Key"
              name="apiKey"
              rules={[{ required: !isEdit, message: '请输入 API Key' }]}
              tooltip={isEdit ? '留空则保持原有配置不变' : undefined}
            >
              <Input.Password placeholder={isEdit ? '留空保持不变' : '请输入 API Key'} />
            </Form.Item>
            <Form.Item
              label="Base URL"
              name="baseUrl"
              rules={[{ required: true, message: '请输入 Base URL' }]}
            >
              <Input placeholder="例如: https://api.custom-openai.com" />
            </Form.Item>
            <Form.Item label="Custom Query Params" name="queryParams" tooltip="自定义查询参数">
              <TextArea rows={3} placeholder='例如: {"param1":"value1"}' />
            </Form.Item>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Drawer
      title={isEdit ? '编辑模型配置' : '添加模型配置'}
      width={600}
      open={visible}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            onClick={() => form.submit()}
            loading={createConfig.isPending || updateConfig.isPending}
          >
            {isEdit ? '更新' : '创建'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
        <Form.Item
          label="配置名称"
          name="name"
          rules={[{ required: true, message: '请输入配置名称' }]}
        >
          <Input placeholder="例如: GPT-4 生产环境" />
        </Form.Item>

        <Form.Item
          label="模型提供商"
          name="modelProvider"
          rules={[{ required: true, message: '请选择模型提供商' }]}
        >
          <Select placeholder="请选择模型提供商" disabled={isEdit}>
            <Option value={CreateModelConfigurationRequestModelProvider.openai}>OpenAI</Option>
            <Option value={CreateModelConfigurationRequestModelProvider.anthropic}>
              Anthropic
            </Option>
            <Option value={CreateModelConfigurationRequestModelProvider.googlegenai}>
              Google AI
            </Option>
            <Option value={CreateModelConfigurationRequestModelProvider.azureopenai}>
              Azure OpenAI
            </Option>
            <Option value={CreateModelConfigurationRequestModelProvider.bianlian}>百炼</Option>
            <Option value={CreateModelConfigurationRequestModelProvider.custom_openai}>
              Custom OpenAI
            </Option>
          </Select>
        </Form.Item>

        {selectedProvider &&
          selectedProvider !== CreateModelConfigurationRequestModelProvider.azureopenai && (
            <Form.Item
              label="模型"
              name="model"
              rules={[{ required: true, message: '请输入模型标识' }]}
              tooltip="模型标识，例如: gpt-4, claude-3-opus-20240229"
            >
              <Input placeholder="例如: gpt-4" />
            </Form.Item>
          )}

        {selectedProvider && renderProviderFields()}
      </Form>
    </Drawer>
  );
};

export default ConfigDrawer;
