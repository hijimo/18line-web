import { useMutation, useQuery } from '@tanstack/react-query';
import { Badge, Button, Drawer, Form, Input, message, Radio, Select } from 'antd';
import { forwardRef, useImperativeHandle, useState } from 'react';
import type { UserEditDrawerRef } from '@/pages/users/types';
import { handleError, handleFormError } from '@/utils/errorHandler';
import { getTenantManagement } from '@/services/api/tenant-management/tenant-management';
import { getUserManagement } from '@/services/api/user-management/user-management';
import type { UpdateUserRequest, User } from '@/types/api';
import styles from './index.module.css';

type UserEditDrawerProps = {
  onSuccess?: () => void;
};

const UserEditDrawer = forwardRef<UserEditDrawerRef, UserEditDrawerProps>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form] = Form.useForm();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const { putUsersId } = getUserManagement();
  const { getTenantsId } = getTenantManagement();

  // 获取租户详情以获取域名
  const { data: tenantData } = useQuery({
    queryKey: ['tenant', currentUser?.tenantId],
    queryFn: () => getTenantsId({ id: currentUser!.tenantId! }),
    enabled: !!currentUser?.tenantId,
  });

  const tenantDomain = tenantData?.data?.domain;

  // 更新用户的 mutation
  const { mutate: updateUserMutate, isPending: isUpdating } = useMutation({
    mutationFn: async (params: { id: string; data: UpdateUserRequest }) =>
      putUsersId({ id: params.id }, params.data),
    onSuccess: (response) => {
      if (response.code === 200) {
        message.success('更新用户成功');
        props.onSuccess?.();
        setIsOpen(false);
        form.resetFields();
        setCurrentUser(null);
      } else {
        const errorMsg = response.message || '更新用户失败';
        message.error(errorMsg);
        console.error('更新用户失败 - API 响应错误:', {
          code: response.code,
          message: response.message,
        });
      }
    },
    onError: (error: unknown) => {
      const errorMessage = handleError(error, '更新用户');
      message.error(errorMessage);
    },
  });

  useImperativeHandle(ref, () => ({
    open: (user: User) => {
      setCurrentUser(user);
      setIsOpen(true);
      // 延迟设置表单值，确保抽屉已打开
      setTimeout(() => {
        // 从完整邮箱中提取前缀
        const emailPrefix = user.email?.split('@')[0] || '';

        form.setFieldsValue({
          emailPrefix,
          displayName: user.displayName,
          phone: user.phone,
          isActive: user.isActive,
          isAdmin: user.isAdmin,
          roles: user.roles,
          metaJson: user.meta ? JSON.stringify(user.meta, null, 2) : undefined,
        });
      }, 100);
    },
    close: () => {
      setIsOpen(false);
      form.resetFields();
      setCurrentUser(null);
    },
  }));

  const handleSubmit = (
    values: UpdateUserRequest & { metaJson?: string; emailPrefix?: string },
  ) => {
    if (!currentUser?.id) {
      message.error('用户信息不完整');
      console.error('更新用户失败 - 用户 ID 缺失:', currentUser);
      return;
    }

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
    const fullEmail = tenantDomain && emailPrefix ? `${emailPrefix}@${tenantDomain}` : emailPrefix;

    const updateData: UpdateUserRequest = {
      ...restValues,
      email: fullEmail,
      meta: parsedMeta,
    };

    updateUserMutate({
      id: currentUser.id,
      data: updateData,
    });
  };

  return (
    <Drawer
      className={styles.editDrawer}
      title={<span className="text-lg font-semibold">编辑用户</span>}
      open={isOpen}
      onClose={() => {
        setIsOpen(false);
        form.resetFields();
        setCurrentUser(null);
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
        requiredMark={false}
        preserve={false}
        onFinish={handleSubmit}
        onFinishFailed={(errorInfo) => {
          const errorMsg = handleFormError(errorInfo.errorFields);
          message.error(errorMsg);
          console.error('表单验证失败:', errorInfo);
        }}
      >
        {/* 租户信息显示（只读） */}
        {currentUser && (
          <Form.Item label={<span className="font-medium">所属租户</span>}>
            <div className="py-1">
              <Badge
                status="processing"
                text={currentUser.tenantId || '未分配租户'}
                className="text-base"
              />
            </div>
          </Form.Item>
        )}

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
          label={<span className="font-medium">显示名称</span>}
          name="displayName"
          rules={[{ max: 255, message: '显示名称长度不能超过 255 个字符' }]}
        >
          <Input placeholder="请输入显示名称" maxLength={255} size="large" />
        </Form.Item>

        <Form.Item
          label={<span className="font-medium">手机号</span>}
          name="phone"
          rules={[{ max: 50, message: '手机号长度不能超过 50 个字符' }]}
        >
          <Input placeholder="请输入手机号" maxLength={50} size="large" />
        </Form.Item>

        <Form.Item label={<span className="font-medium">用户状态</span>} name="isActive">
          <Radio.Group size="large">
            <Radio value={true}>启用</Radio>
            <Radio value={false}>禁用</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item label={<span className="font-medium">是否管理员</span>} name="isAdmin">
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

UserEditDrawer.displayName = 'UserEditDrawer';

export default UserEditDrawer;
export type { UserEditDrawerRef };
