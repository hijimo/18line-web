import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, message, Radio, Select } from 'antd';
import { forwardRef, useImperativeHandle, useState } from 'react';
import type { UserCreateDrawerRef } from '@/pages/users/types';
import { handleError, handleFormError } from '@/utils/errorHandler';
import { getTenantManagement } from '@/services/api/tenant-management/tenant-management';
import { getUserManagement } from '@/services/api/user-management/user-management';
import type { CreateUserRequest } from '@/types/api';
import styles from './index.module.css';

type UserCreateDrawerProps = {
  onSuccess?: () => void;
};

const UserCreateDrawer = forwardRef<UserCreateDrawerRef, UserCreateDrawerProps>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTenantId, setCurrentTenantId] = useState<string | undefined>();
  const [form] = Form.useForm();

  const { postUsers } = getUserManagement();
  const { getTenantsId } = getTenantManagement();

  // 获取租户详情以获取域名
  const { data: tenantData } = useQuery({
    queryKey: ['tenant', currentTenantId],
    queryFn: () => getTenantsId({ id: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const tenantDomain = tenantData?.data?.domain;

  // 创建用户的 mutation
  const { mutate: createUserMutate, isPending: isCreating } = useMutation({
    mutationFn: async (params: CreateUserRequest) => postUsers(params),
    onSuccess: (response) => {
      if (response.code === 200) {
        message.success('创建用户成功');
        props.onSuccess?.();
        setIsOpen(false);
        form.resetFields();
      } else {
        const errorMsg = response.message || '创建用户失败';
        message.error(errorMsg);
        console.error('创建用户失败 - API 响应错误:', {
          code: response.code,
          message: response.message,
        });
      }
    },
    onError: (error: unknown) => {
      const errorMessage = handleError(error, '创建用户');
      message.error(errorMessage);
    },
  });

  useImperativeHandle(ref, () => ({
    open: (tenantId?: string) => {
      setIsOpen(true);
      setCurrentTenantId(tenantId);
      // 延迟重置表单，确保抽屉已打开
      setTimeout(() => {
        form.resetFields();
        // 如果传入了 tenantId，设置为默认值
        if (tenantId) {
          form.setFieldsValue({ tenantId });
        }
      }, 100);
    },
    close: () => {
      setIsOpen(false);
      setCurrentTenantId(undefined);
      form.resetFields();
    },
  }));

  const handleSubmit = (
    values: CreateUserRequest & { metaJson?: string; emailPrefix?: string },
  ) => {
    const { metaJson, emailPrefix, ...restValues } = values;

    // 处理元数据 JSON 解析
    let parsedMeta;
    if (metaJson && metaJson.trim()) {
      try {
        parsedMeta = JSON.parse(metaJson);
      } catch (error) {
        message.error('元数据格式不正确，请输入有效的 JSON 格式');
        console.error('元数据 JSON 解析失败:', error);
        return;
      }
    }

    // 拼接完整的邮箱地址
    const fullEmail =
      tenantDomain && emailPrefix ? `${emailPrefix}@${tenantDomain}` : emailPrefix || '';

    const submitData: CreateUserRequest = {
      ...restValues,
      email: fullEmail,
      meta: parsedMeta,
    };

    createUserMutate(submitData);
  };

  return (
    <Drawer
      className={styles.createDrawer}
      title={<span className="text-lg font-semibold">创建用户</span>}
      open={isOpen}
      onClose={() => {
        setIsOpen(false);
        setCurrentTenantId(undefined);
        form.resetFields();
      }}
      width={600}
      styles={{
        body: {
          padding: '24px',
          paddingTop: '16px',
        },
      }}
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
          label={<span className="font-medium">用户邮箱</span>}
          name="emailPrefix"
          rules={[
            { required: true, message: '请输入用户邮箱' },
            {
              pattern: /^[^.@]+$/,
              message: '邮箱前缀不能包含 "." 或 "@" 字符',
            },
          ]}
        >
          <Input
            placeholder="请输入邮箱前缀"
            maxLength={255}
            size="large"
            autoFocus
            addonAfter={tenantDomain ? `@${tenantDomain}` : undefined}
          />
        </Form.Item>

        <Form.Item
          label={<span className="font-medium">登录密码</span>}
          name="password"
          rules={[
            { required: true, message: '请输入登录密码' },
            { min: 8, message: '密码长度不能少于 8 个字符' },
          ]}
        >
          <Input.Password placeholder="请输入登录密码（至少 8 个字符）" size="large" />
        </Form.Item>

        <Form.Item
          label={<span className="font-medium">显示名称</span>}
          name="displayName"
          rules={[{ max: 255, message: '显示名称长度不能超过 255 个字符' }]}
        >
          <Input placeholder="请输入显示名称（可选）" maxLength={255} size="large" />
        </Form.Item>

        <Form.Item
          label={<span className="font-medium">手机号</span>}
          name="phone"
          rules={[{ max: 50, message: '手机号长度不能超过 50 个字符' }]}
        >
          <Input placeholder="请输入手机号（可选）" maxLength={50} size="large" />
        </Form.Item>

        <Form.Item
          hidden
          label={<span className="font-medium">所属租户</span>}
          name="tenantId"
          rules={[{ required: true, message: '请选择所属租户' }]}
          tooltip="平台管理员必须为新用户指定所属租户"
        >
          <Input placeholder="请输入租户 ID" size="large" />
        </Form.Item>

        <Form.Item
          label={<span className="font-medium">是否管理员</span>}
          name="isAdmin"
          initialValue={false}
        >
          <Radio.Group size="large">
            <Radio value={false}>否</Radio>
            <Radio value={true}>是</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label={<span className="font-medium">用户角色</span>}
          name="roles"
          tooltip="为用户分配角色"
          normalize={(value) => (value ? [value] : [])}
          getValueFromEvent={(value) => (Array.isArray(value) ? value[0] : value)}
          getValueProps={(value) => ({ value: Array.isArray(value) ? value[0] : value })}
        >
          <Select
            placeholder="请选择用户角色（可选）"
            size="large"
            allowClear
            options={[
              { label: '普通用户', value: 'user' },
              { label: '租户管理员', value: 'tenant_admin' },
              { label: '平台管理员', value: 'system_admin' },
            ]}
          />
        </Form.Item>

        <Form.Item
          label={<span className="font-medium">元数据</span>}
          name="metaJson"
          tooltip="用户的自定义元数据信息（JSON 格式）"
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
            {isCreating ? '创建中...' : '创建用户'}
          </Button>
        </Form.Item>
      </Form>
    </Drawer>
  );
});

UserCreateDrawer.displayName = 'UserCreateDrawer';

export default UserCreateDrawer;
export type { UserCreateDrawerRef };
