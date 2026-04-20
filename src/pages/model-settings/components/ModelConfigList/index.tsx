/**
 * 模型配置列表组件
 */
import { CheckCircleOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Card, Popconfirm, Space, Switch, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React from 'react';
import {
  useDeleteModelConfiguration,
  useModelConfigurations,
  useUpdateModelConfigurationStatus,
  useValidateModelConfiguration,
} from '@/hooks/useModelConfigurations';
import type { ModelConfiguration } from '@/types/api';

const ModelConfigList: React.FC = () => {
  const { data, isLoading } = useModelConfigurations({ pageNo: 1, pageSize: 100 });
  const updateStatus = useUpdateModelConfigurationStatus();
  const deleteConfig = useDeleteModelConfiguration();
  const validateConfig = useValidateModelConfiguration();

  const handleStatusChange = (id: string, enabled: boolean) => {
    updateStatus.mutate({
      id,
      status: { status: enabled ? 'enabled' : 'disabled' },
    });
  };

  const handleDelete = (id: string) => {
    deleteConfig.mutate(id);
  };

  const handleValidate = (id: string) => {
    debugger;
    validateConfig.mutate(id);
  };

  const columns: ColumnsType<ModelConfiguration> = [
    {
      title: '配置名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '模型提供商',
      dataIndex: 'modelProvider',
      key: 'modelProvider',
      width: 150,
      render: (provider: string) => {
        const providerMap: Record<string, { text: string; color: string }> = {
          openai: { text: 'OpenAI', color: 'green' },
          anthropic: { text: 'Anthropic', color: 'blue' },
          googlegenai: { text: 'Google AI', color: 'red' },
          azureopenai: { text: 'Azure OpenAI', color: 'cyan' },
          bianlian: { text: '变脸', color: 'purple' },
          custom_openai: { text: 'Custom OpenAI', color: 'orange' },
        };
        const config = providerMap[provider] || { text: provider, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '模型',
      dataIndex: 'model',
      key: 'model',
      width: 200,
    },
    {
      title: 'Base URL',
      dataIndex: 'baseUrl',
      key: 'baseUrl',
      ellipsis: true,
      render: (url: string) => url || '-',
    },
    {
      title: '状态',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 100,
      render: (enabled: boolean, record: ModelConfiguration) => (
        <Switch
          checked={enabled}
          loading={updateStatus.isPending}
          onChange={(checked) => handleStatusChange(record.id!, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_: unknown, record: ModelConfiguration) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<CheckCircleOutlined />}
            loading={validateConfig.isPending}
            onClick={() => handleValidate(record.id!)}
          >
            验证
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个模型配置吗？"
            onConfirm={() => handleDelete(record.id!)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleteConfig.isPending}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="已配置的模型" className="mb-6">
      <Table
        columns={columns}
        dataSource={data?.data?.data || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          total: data?.data?.totalCount || 0,
          pageSize: data?.data?.pageSize || 20,
          current: data?.data?.pageNo || 1,
          showSizeChanger: true,
          showTotal: (total: number) => `共 ${total} 条`,
        }}
        scroll={{ x: 1200 }}
      />
    </Card>
  );
};

export default ModelConfigList;
