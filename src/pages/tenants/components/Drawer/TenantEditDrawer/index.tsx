import { useMutation } from '@tanstack/react-query';
import { Badge, Button, Drawer, Form, Input, message, Radio } from 'antd';
import { forwardRef, useImperativeHandle, useState } from 'react';
import type { TenantEditDrawerRef } from '@/pages/tenants/types';
import { handleError, handleFormError } from '@/utils/errorHandler';
import { getTenantManagement } from '@/services/api/tenant-management/tenant-management';
import type { Tenant, UpdateTenantRequest } from '@/types/api';
import styles from './index.module.css';

type TenantEditDrawerProps = {
  onSuccess?: () => void;
};

const TenantEditDrawer = forwardRef<TenantEditDrawerRef, TenantEditDrawerProps>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form] = Form.useForm();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);

  const { putTenantsId } = getTenantManagement();

  // 更新租户的 mutation
  const { mutate: updateTenantMutate, isPending: isUpdating } = useMutation({
    mutationFn: async (params: { id: string; data: UpdateTenantRequest }) =>
      putTenantsId({ id: params.id }, params.data),
    onSuccess: (response) => {
      if (response.code === 200) {
        message.success('更新租户成功');
        props.onSuccess?.();
        setIsOpen(false);
        form.resetFields();
        setCurrentTenant(null);
      } else {
        const errorMsg = response.message || '更新租户失败';
        message.error(errorMsg);
        console.error('更新租户失败 - API 响应错误:', {
          code: response.code,
          message: response.message,
        });
      }
    },
    onError: (error: unknown) => {
      const errorMessage = handleError(error, '更新租户');
      message.error(errorMessage);
    },
  });

  useImperativeHandle(ref, () => ({
    open: (tenant: Tenant) => {
      setCurrentTenant(tenant);
      setIsOpen(true);
      // 延迟设置表单值，确保抽屉已打开
      setTimeout(() => {
        form.setFieldsValue({
          name: tenant.name,
          domain: tenant.domain,
          status: tenant.status,
          metadata: tenant.metadata ? JSON.stringify(tenant.metadata, null, 2) : undefined,
        });
      }, 100);
    },
    close: () => {
      setIsOpen(false);
      form.resetFields();
      setCurrentTenant(null);
    },
  }));

  const handleSubmit = (values: UpdateTenantRequest & { metadata?: string }) => {
    if (!currentTenant?.id) {
      message.error('租户信息不完整');
      console.error('更新租户失败 - 租户 ID 缺失:', currentTenant);
      return;
    }

    // 处理元数据：如果提供了元数据字符串，尝试解析为 JSON
    let parsedMetadata: UpdateTenantRequest['metadata'] = undefined;
    if (values.metadata) {
      try {
        parsedMetadata = JSON.parse(values.metadata);
      } catch (error) {
        message.error('元数据格式不正确，请输入有效的 JSON 格式');
        console.error('元数据解析失败:', {
          metadata: values.metadata,
          error,
        });
        return;
      }
    }

    const updateData: UpdateTenantRequest = {
      name: values.name,
      domain: values.domain,
      status: values.status,
      metadata: parsedMetadata,
    };

    updateTenantMutate({
      id: currentTenant.id,
      data: updateData,
    });
  };

  return (
    <Drawer
      className={styles.editDrawer}
      title={<span className="text-lg font-semibold">编辑租户</span>}
      open={isOpen}
      onClose={() => {
        setIsOpen(false);
        form.resetFields();
        setCurrentTenant(null);
      }}
      width={600}
      styles={{
        body: {
          padding: '24px',
          paddingTop: '16px',
        },
      }}
      destroyOnClose
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        preserve={false}
        onFinish={handleSubmit}
        onFinishFailed={(errorInfo) => {
          const errorMsg = handleFormError(errorInfo.errorFields);
          message.error(errorMsg);
          console.error('表单验证失败:', errorInfo);
        }}
      >
        {/* 租户类型显示（只读） */}
        {currentTenant && (
          <Form.Item label={<span className="font-medium">租户类型</span>}>
            <div className="py-1">
              {currentTenant.type === 'system' ? (
                <Badge status="processing" text="平台租户" className="text-base" />
              ) : (
                <Badge status="success" text="业务租户" className="text-base" />
              )}
            </div>
          </Form.Item>
        )}

        <Form.Item
          label={<span className="font-medium">租户名称</span>}
          name="name"
          rules={[
            {
              min: 1,
              max: 255,
              message: '租户名称长度应在 1-255 个字符之间',
            },
          ]}
        >
          <Input placeholder="请输入租户名称" maxLength={255} size="large" autoFocus />
        </Form.Item>

        <Form.Item
          label={<span className="font-medium">租户域名</span>}
          name="domain"
          rules={[{ max: 255, message: '租户域名长度不能超过 255 个字符' }]}
        >
          <Input placeholder="请输入租户域名" maxLength={255} size="large" />
        </Form.Item>

        <Form.Item label={<span className="font-medium">租户状态</span>} name="status">
          <Radio.Group size="large">
            <Radio value={true}>启用</Radio>
            <Radio value={false}>禁用</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label={<span className="font-medium">元数据</span>}
          name="metadata"
          tooltip="租户的自定义元数据信息（JSON 格式）"
        >
          <Input.TextArea
            rows={6}
            placeholder='请输入元数据信息（可选），例如：{"key": "value"}'
            className="font-mono text-sm"
          />
        </Form.Item>

        <Form.Item className="mb-0 mt-6">
          <Button
            size="large"
            type="primary"
            htmlType="submit"
            className="w-full"
            loading={isUpdating}
          >
            {isUpdating ? '更新中...' : '保存修改'}
          </Button>
        </Form.Item>
      </Form>
    </Drawer>
  );
});

TenantEditDrawer.displayName = 'TenantEditDrawer';

export default TenantEditDrawer;
export type { TenantEditDrawerRef };
