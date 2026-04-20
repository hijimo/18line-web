/**
 * 模型配置表单组件
 */
import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Divider, Form, Input, Select, Space } from 'antd';
import React, { useState } from 'react';
import { useCreateModelConfiguration } from '@/hooks/useModelConfigurations';
import { CreateModelConfigurationRequestModelProvider } from '@/types/api';
import type { CreateModelConfigurationRequest } from '@/types/api';

const { Option } = Select;
const { TextArea } = Input;

const ModelConfigForm: React.FC = () => {
  const [form] = Form.useForm();
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const createConfig = useCreateModelConfiguration();

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    // 清空相关字段
    form.setFieldsValue({
      apiKey: undefined,
      baseUrl: undefined,
      queryParams: undefined,
    });
  };

  const handleSubmit = async (values: CreateModelConfigurationRequest) => {
    try {
      await createConfig.mutateAsync(values);
      form.resetFields();
      setSelectedProvider('');
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
          <>
            <Form.Item
              label="API Key"
              name="apiKey"
              rules={[{ required: true, message: '请输入 API Key' }]}
            >
              <Input.Password placeholder="请输入 API Key" />
            </Form.Item>
          </>
        );

      case CreateModelConfigurationRequestModelProvider.bianlian:
        return (
          <>
            <Form.Item
              label="API Key"
              name="apiKey"
              rules={[{ required: true, message: '请输入 API Key' }]}
            >
              <Input.Password placeholder="请输入 API Key" />
            </Form.Item>
            <Form.Item
              label="Base URL"
              name="baseUrl"
              rules={[{ required: true, message: '请输入 Base URL' }]}
            >
              <Input placeholder="例如: https://api.bianlian.com" />
            </Form.Item>
          </>
        );

      case CreateModelConfigurationRequestModelProvider.azureopenai:
        return (
          <>
            <Form.Item
              label="API Key"
              name="apiKey"
              rules={[{ required: true, message: '请输入 API Key' }]}
            >
              <Input.Password placeholder="请输入 Azure OpenAI API Key" />
            </Form.Item>
            <Form.Item
              label="Base URL"
              name="baseUrl"
              rules={[{ required: true, message: '请输入 Base URL' }]}
              tooltip="Azure OpenAI 资源端点，例如: https://your-resource.openai.azure.com"
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
              tooltip='API 版本，格式为 JSON: {"api-version":"2024-02-15-preview"}'
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
              rules={[{ required: true, message: '请输入 API Key' }]}
            >
              <Input.Password placeholder="请输入 API Key" />
            </Form.Item>
            <Form.Item
              label="Base URL"
              name="baseUrl"
              rules={[{ required: true, message: '请输入 Base URL' }]}
            >
              <Input placeholder="例如: https://api.custom-openai.com" />
            </Form.Item>
            <Form.Item
              label="Custom Query Params"
              name="queryParams"
              tooltip="自定义查询参数，JSON 格式"
            >
              <TextArea rows={3} placeholder='例如: {"param1":"value1","param2":"value2"}' />
            </Form.Item>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Card title="添加模型配置">
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
          <Select placeholder="请选择模型提供商" onChange={handleProviderChange}>
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
            <Option value={CreateModelConfigurationRequestModelProvider.bianlian}>变脸</Option>
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

        {selectedProvider && (
          <>
            <Divider orientation="left">提供商配置</Divider>
            {renderProviderFields()}
          </>
        )}

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<PlusOutlined />}
              loading={createConfig.isPending}
              disabled={!selectedProvider}
            >
              添加配置
            </Button>
            <Button
              onClick={() => {
                form.resetFields();
                setSelectedProvider('');
              }}
            >
              重置
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ModelConfigForm;
