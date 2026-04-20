/**
 * API 配置卡片组件
 */
import { CheckCircleOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Space, Tag } from 'antd';
import React from 'react';

interface ApiConfigCardProps {
  /** 提供商名称 */
  provider: string;
  /** 提供商显示名称 */
  providerLabel: string;
  /** 标签颜色 */
  tagColor?: string;
  /** 是否已配置 */
  configured?: boolean;
  /** API Key（脱敏显示） */
  apiKey?: string;
  /** Base URL */
  baseUrl?: string;
  /** 其他配置信息 */
  extraConfig?: Record<string, string>;
  /** 编辑回调 */
  onEdit?: () => void;
  /** 验证回调 */
  onValidate?: () => void;
  /** 是否正在验证 */
  validating?: boolean;
}

export const ApiConfigCard: React.FC<ApiConfigCardProps> = ({
  provider,
  providerLabel,
  tagColor = 'default',
  configured = false,
  apiKey,
  baseUrl,
  extraConfig,
  onEdit,
  onValidate,
  validating = false,
}) => {
  // 脱敏显示 API Key
  const maskApiKey = (key?: string) => {
    if (!key) return '-';
    if (key.length <= 8) return '***';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  return (
    <Card
      title={
        <Space>
          <span>{providerLabel}</span>
          <Tag color={tagColor}>{provider}</Tag>
          {configured && <Tag color="success">已配置</Tag>}
        </Space>
      }
      extra={
        <Space>
          {configured && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              loading={validating}
              onClick={onValidate}
            >
              验证
            </Button>
          )}
          <Button type="link" size="small" icon={<EditOutlined />} onClick={onEdit}>
            {configured ? '编辑' : '配置'}
          </Button>
        </Space>
      }
      className="mb-4"
    >
      {configured ? (
        <Descriptions column={1} size="small">
          <Descriptions.Item label="API Key">{maskApiKey(apiKey)}</Descriptions.Item>
          {baseUrl && <Descriptions.Item label="Base URL">{baseUrl}</Descriptions.Item>}
          {extraConfig &&
            Object.entries(extraConfig).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {value}
              </Descriptions.Item>
            ))}
        </Descriptions>
      ) : (
        <div className="text-gray-400">暂未配置</div>
      )}
    </Card>
  );
};

export default ApiConfigCard;
