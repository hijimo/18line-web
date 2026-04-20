import type { ProColumns } from '@ant-design/pro-table';
import { Badge, Tag } from 'antd';
import dayjs from 'dayjs';
import ColumnEllipsisWrap from '@/components/CommonTable/ColumnEllipsisWrap';
import { DATE_FORMAT_FULL_TIME } from '@/variables';
import type { User } from '@/types/api';

// 用户邮箱列
export const userEmail: ProColumns<User> = {
  title: '用户邮箱',
  dataIndex: 'email',
  className: 'nowrap',
  ellipsis: true,
  width: 200,
  search: false,
  fixed: 'left',
  fieldProps: {
    placeholder: '请输入用户邮箱',
  },
  render: (_, record) => {
    if (!record.email) return <span>--</span>;
    return (
      <ColumnEllipsisWrap width={180}>
        <span className="font-medium">{record.email}</span>
      </ColumnEllipsisWrap>
    );
  },
};

// 显示名称列
export const userDisplayName: ProColumns<User> = {
  title: '显示名称',
  dataIndex: 'displayName',
  className: 'nowrap',
  ellipsis: true,
  width: 140,
  search: false,
  render: (_, record) => {
    if (!record.displayName) return <span className="text-gray-400">--</span>;
    return (
      <ColumnEllipsisWrap width={120}>
        <span>{record.displayName}</span>
      </ColumnEllipsisWrap>
    );
  },
};

// 手机号列
export const userPhone: ProColumns<User> = {
  title: '手机号',
  dataIndex: 'phone',
  className: 'nowrap',
  width: 140,
  search: false,
  render: (_, record) => {
    if (!record.phone) return <span className="text-gray-400">--</span>;
    return <span>{record.phone}</span>;
  },
};

// 用户角色列
export const userRoles: ProColumns<User> = {
  title: '角色',
  dataIndex: 'roles',
  className: 'nowrap',
  width: 180,
  search: false,
  render: (_, record) => {
    if (!record.roles || record.roles.length === 0) {
      return <span className="text-gray-400">--</span>;
    }

    const roleMap: Record<string, { text: string; color: string }> = {
      system_admin: { text: '平台管理员', color: 'red' },
      tenant_admin: { text: '租户管理员', color: 'blue' },
      user: { text: '普通用户', color: 'default' },
    };

    return (
      <div className="flex flex-wrap gap-1">
        {record.roles.map((role, index) => {
          const config = roleMap[role] || { text: role, color: 'default' };
          return (
            <Tag key={index} color={config.color}>
              {config.text}
            </Tag>
          );
        })}
      </div>
    );
  },
};

// 用户状态列
export const userStatus: ProColumns<User> = {
  title: '状态',
  dataIndex: 'isActive',
  className: 'nowrap',
  width: 100,
  valueType: 'select',
  fieldProps: {
    options: [
      // { label: '全部', value: undefined },
      { label: '启用', value: true },
      { label: '禁用', value: false },
    ],
  },
  render: (_, record) =>
    record.isActive ? <Badge status="success" text="启用" /> : <Badge status="error" text="禁用" />,
};

// 所属租户列（仅平台管理员可见）
export const userTenant: ProColumns<User> = {
  title: '所属租户',
  dataIndex: 'tenantId',
  className: 'nowrap',
  ellipsis: true,
  width: 160,
  valueType: 'select',
  search: false,
  fieldProps: {
    placeholder: '请选择租户',
  },
  render: (_, record) => {
    if (!record.tenantId) return <span className="text-gray-400">--</span>;
    return (
      <ColumnEllipsisWrap width={140}>
        <span>{record.tenantId}</span>
      </ColumnEllipsisWrap>
    );
  },
};

// 是否管理员列
export const userIsAdmin: ProColumns<User> = {
  title: '管理员',
  dataIndex: 'isAdmin',
  className: 'nowrap',
  width: 100,
  search: false,
  render: (_, record) => {
    if (record.isAdmin) {
      return <Tag color="orange">是</Tag>;
    }
    return <Tag>否</Tag>;
  },
};

// 创建时间列
export const userCreateTime: ProColumns<User> = {
  title: '创建时间',
  dataIndex: 'createdAt',
  className: 'nowrap',
  hideInForm: true,
  search: false,
  width: 180,
  sorter: true,
  renderText: (_) => (_ ? dayjs(_).format(DATE_FORMAT_FULL_TIME) : '--'),
};

// 创建人列
export const userCreatorName: ProColumns<User> = {
  title: '创建人',
  dataIndex: 'createdByName',
  className: 'nowrap',
  hideInForm: true,
  width: 140,
  ellipsis: true,
  search: false,
  render: (_, record) => {
    if (!record.createdByName) return <span className="text-gray-400">--</span>;
    return (
      <ColumnEllipsisWrap width={120}>
        <span>{record.createdByName}</span>
      </ColumnEllipsisWrap>
    );
  },
};

// 操作列
export const userOption: ProColumns<User> = {
  title: '操作',
  dataIndex: 'option',
  valueType: 'option',
  className: 'nowrap',
  fixed: 'right',
  width: 160,
};

const keyword: ProColumns<User> = {
  title: '关键词搜索',
  dataIndex: 'search',
  hideInTable: true,
  className: 'nowrap',

  fieldProps: {
    placeholder: '支持邮箱/手机/用户名称',
    allowClear: true,
  },
  width: 160,
};

// 导出用户表格列配置
export const userColumns: Record<string, ProColumns<User>> = {
  keyword,
  userEmail,
  userDisplayName,
  userPhone,
  userRoles,
  userStatus,
  userTenant,
  userIsAdmin,
  userCreateTime,
  userCreatorName,
  userOption,
};
