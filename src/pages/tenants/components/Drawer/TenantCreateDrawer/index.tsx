import { useMutation } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, message } from 'antd';
import { forwardRef, useImperativeHandle, useState } from 'react';
import type { TenantCreateDrawerRef } from '@/pages/tenants/types';
import { handleError, handleFormError } from '@/utils/errorHandler';
import { getTenantManagement } from '@/services/api/tenant-management/tenant-management';
import type { CreateTenantRequest } from '@/types/api';
import styles from './index.module.css';

type TenantCreateDrawerProps = {
  onSuccess?: () => void;
};

const TenantCreateDrawer = forwardRef<TenantCreateDrawerRef, TenantCreateDrawerProps>(
  (props, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [form] = Form.useForm();

    const { postTenants } = getTenantManagement();

    // 创建租户的 mutation
    const { mutate: createTenantMutate, isPending: isCreating } = useMutation({
      mutationFn: async (params: CreateTenantRequest) => postTenants(params),
      onSuccess: (response) => {
        if (response.code === 200) {
          message.success('创建租户成功');
          props.onSuccess?.();
          setIsOpen(false);
          form.resetFields();
        } else {
          const errorMsg = response.message || '创建租户失败';
          message.error(errorMsg);
          console.error('创建租户失败 - API 响应错误:', {
            code: response.code,
            message: response.message,
          });
        }
      },
      onError: (error: unknown) => {
        const errorMessage = handleError(error, '创建租户');
        message.error(errorMessage);
      },
    });

    useImperativeHandle(ref, () => ({
      open: () => {
        setIsOpen(true);
        // 延迟重置表单，确保抽屉已打开
        setTimeout(() => {
          form.resetFields();
        }, 100);
      },
      close: () => {
        setIsOpen(false);
        form.resetFields();
      },
    }));

    const handleSubmit = (values: CreateTenantRequest) => {
      createTenantMutate(values);
    };

    return (
      <Drawer
        className={styles.createDrawer}
        title={<span className="text-lg font-semibold">创建租户</span>}
        open={isOpen}
        onClose={() => {
          setIsOpen(false);
          form.resetFields();
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
          requiredMark
          preserve={false}
          onFinish={handleSubmit}
          onFinishFailed={(errorInfo) => {
            const errorMsg = handleFormError(errorInfo.errorFields);
            message.error(errorMsg);
            console.error('表单验证失败:', errorInfo);
          }}
        >
          <Form.Item
            label={<span className="font-medium">租户名称</span>}
            name="name"
            rules={[
              { required: true, message: '请输入租户名称' },
              { min: 1, max: 255, message: '租户名称长度应在 1-255 个字符之间' },
            ]}
          >
            <Input placeholder="请输入租户名称" maxLength={255} size="large" autoFocus />
          </Form.Item>

          <Form.Item
            label={<span className="font-medium">租户域名</span>}
            name="domain"
            rules={[{ max: 255, message: '租户域名长度不能超过 255 个字符' }]}
          >
            <Input placeholder="请输入租户域名（可选）" maxLength={255} size="large" />
          </Form.Item>

          <Form.Item
            label={<span className="font-medium">元数据</span>}
            name="metadata"
            tooltip="租户的自定义元数据信息（JSON 格式）"
          >
            <Input.TextArea
              rows={4}
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
              loading={isCreating}
            >
              {isCreating ? '创建中...' : '创建租户'}
            </Button>
          </Form.Item>
        </Form>
      </Drawer>
    );
  },
);

TenantCreateDrawer.displayName = 'TenantCreateDrawer';

export default TenantCreateDrawer;
export type { TenantCreateDrawerRef };
