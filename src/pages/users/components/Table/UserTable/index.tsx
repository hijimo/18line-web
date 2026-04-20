import type { ActionType } from '@ant-design/pro-components';
import { useMutation } from '@tanstack/react-query';
import { Button, message, Popconfirm } from 'antd';
import { produce } from 'immer';
import { values as _values } from 'lodash-es';
import React, { useCallback, useMemo, useRef } from 'react';
import CommonTable from '@/components/CommonTable';
import OptionMenu from '@/components/CommonTable/OptionMenu';
import { useTableRequest } from '@/hooks/useTableRequest';
import { useAuthStore } from '@/stores/authStore';
import type { UserCreateDrawerRef, UserEditDrawerRef, UserTableProps } from '@/pages/users/types';
import { userColumns } from '@/configurify/columns/userColumns';
import { handleError } from '@/utils/errorHandler';
import { getUserManagement } from '@/services/api/user-management/user-management';
import type { User } from '@/types/api';
import type { ResponsePaginationData } from '@/types';
import UserCreateDrawer from '../../Drawer/UserCreateDrawer';
import UserEditDrawer from '../../Drawer/UserEditDrawer';
import styles from './index.module.css';

const UserTable: React.FC<UserTableProps> = ({ tenantId }) => {
  const actionRef = useRef<ActionType>(null);
  const createDrawerRef = useRef<UserCreateDrawerRef>(null);
  const editDrawerRef = useRef<UserEditDrawerRef>(null);

  // 获取当前用户信息，用于权限控制
  const user = useAuthStore((state) => state.user);

  // 判断当前用户是否为平台管理员
  const isPlatformAdmin = user?.roles?.includes('system_admin') ?? false;

  const { getUsers, deleteUsersId, patchUsersIdStatus } = getUserManagement();

  // 删除用户的 mutation
  const { mutate: deleteUserMutate, isPending: isDeleting } = useMutation({
    mutationFn: async (id: string) => deleteUsersId({ id }),
    onSuccess: (response) => {
      if (response.code === 200) {
        message.success('删除用户成功');
        // 刷新表格
        actionRef.current?.reload();
      } else {
        const errorMsg = String(response.message || '删除用户失败');
        message.error(errorMsg);
        console.error('删除用户失败 - API 响应错误:', {
          code: response.code,
          message: response.message,
        });
      }
    },
    onError: (error: unknown) => {
      const errorMessage = handleError(error, '删除用户');
      message.error(errorMessage);
    },
  });

  // 更新用户状态的 mutation
  const { mutate: updateStatusMutate, isPending: isUpdatingStatus } = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      patchUsersIdStatus({ id }, { isActive }),
    onSuccess: (response, variables) => {
      if (response.code === 200) {
        message.success(`${variables.isActive ? '启用' : '禁用'}用户成功`);
        // 刷新表格
        actionRef.current?.reload();
      } else {
        const errorMsg = String(response.message || '更新用户状态失败');
        message.error(errorMsg);
        console.error('更新用户状态失败 - API 响应错误:', {
          code: response.code,
          message: response.message,
        });
      }
    },
    onError: (error: unknown) => {
      const errorMessage = handleError(error, '更新用户状态');
      message.error(errorMessage);
    },
  });

  // 处理编辑操作
  const handleEdit = useCallback((record: User) => {
    editDrawerRef.current?.open(record);
  }, []);

  // 处理删除操作
  const handleDelete = useCallback(
    (id: string | undefined) => {
      if (!id) {
        message.error('用户 ID 不存在');
        return;
      }
      deleteUserMutate(id);
    },
    [deleteUserMutate],
  );

  // 处理启用/禁用操作
  const handleToggleStatus = useCallback(
    (id: string | undefined, currentStatus: boolean | undefined) => {
      if (!id) {
        message.error('用户 ID 不存在');
        return;
      }
      // 切换状态：当前启用则禁用，当前禁用则启用
      const newStatus = !currentStatus;
      updateStatusMutate({ id, isActive: newStatus });
    },
    [updateStatusMutate],
  );

  // 处理创建操作
  const handleCreate = useCallback(() => {
    createDrawerRef.current?.open(tenantId);
  }, [tenantId]);

  // 处理操作成功后的刷新
  const handleSuccess = useCallback(() => {
    actionRef.current?.reload();
  }, []);

  // 表格数据请求函数
  const fetchData = useTableRequest(
    getUsers as unknown as (params: Record<string, unknown>) => Promise<ResponsePaginationData>,
    // 如果传入了 tenantId，则作为默认搜索条件
    tenantId ? { tenantId } : undefined,
    undefined, // getParams
    undefined, // transform
  );

  // 配置表格列
  const columns = useMemo(() => {
    return _values(
      produce(userColumns, (draft) => {
        // 根据用户角色控制租户列的显示
        // 租户管理员不显示租户列和租户筛选
        if (!isPlatformAdmin) {
          delete draft.userTenant;
        }

        // 配置操作列
        draft.userOption!.render = (_, record: User) => {
          const isEnabled = record.isActive;
          return (
            <OptionMenu>
              <a key="edit" onClick={() => handleEdit(record)}>
                编辑
              </a>
              <Popconfirm
                key="toggle-status"
                title={isEnabled ? '确认禁用' : '确认启用'}
                description={
                  isEnabled ? '禁用后该用户将无法登录系统，确认禁用吗？' : '确认启用该用户吗？'
                }
                onConfirm={() => handleToggleStatus(record.id, record.isActive)}
                okText="确认"
                cancelText="取消"
                okButtonProps={{ loading: isUpdatingStatus }}
              >
                <a className={isEnabled ? 'text-orange-500' : 'text-green-500'}>
                  {isEnabled ? '禁用' : '启用'}
                </a>
              </Popconfirm>
              <Popconfirm
                key="delete"
                title="确认删除"
                description="删除后该用户将无法恢复，确认删除吗？"
                onConfirm={() => handleDelete(record.id)}
                okText="确认"
                cancelText="取消"
                okButtonProps={{ loading: isDeleting }}
              >
                <a className="text-red-500">删除</a>
              </Popconfirm>
            </OptionMenu>
          );
        };
      }),
    );
  }, [handleEdit, handleDelete, handleToggleStatus, isPlatformAdmin, isDeleting, isUpdatingStatus]);

  return (
    <div className={styles.userTable}>
      <CommonTable
        headerTitle="用户列表"
        scroll={{ x: 1400, y: 'calc(100vh - 380px)' }}
        rowKey="id"
        actionRef={actionRef}
        request={fetchData as any}
        columns={columns as any}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        toolBarRender={() => [
          <Button key="create" type="primary" onClick={handleCreate}>
            创建用户
          </Button>,
        ]}
      />
      <UserCreateDrawer ref={createDrawerRef} onSuccess={handleSuccess} />
      <UserEditDrawer ref={editDrawerRef} onSuccess={handleSuccess} />
    </div>
  );
};

export default UserTable;
