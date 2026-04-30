import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, Popconfirm, Select, Space, Tag, Badge, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { StatusEnum, StatusLabel, GenderLabel } from '@/enums';
import { get as getUserApi } from '@/services/api/用户管理/用户管理';

const userApi = getUserApi();

/** 用户性别：0男 1女 2未知 */
const SEX_OPTIONS = Object.entries(GenderLabel).map(([value, label]) => ({ label, value }));
const STATUS_OPTIONS = [
  { label: '正常', value: '0' },
  { label: '停用', value: '1' },
];

const Users: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const request = useTableRequest(userApi.list15 as any);

  const openDrawer = (record?: any) => {
    setCurrentRecord(record || null);
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (currentRecord) {
        await userApi.edit3({ ...values, userId: currentRecord?.userId } as any);
        message.success('编辑成功');
      } else {
        await userApi.add4(values as any);
        message.success('新增成功');
      }
      setDrawerOpen(false);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await userApi.remove14({ userIds: [record.userId] });
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const handleChangeStatus = async (record: any) => {
    const newStatus = record.status === StatusEnum.NORMAL ? StatusEnum.DISABLED : StatusEnum.NORMAL;
    try {
      await userApi.changeStatus({ userId: record.userId, status: newStatus } as any);
      message.success('状态修改成功');
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleResetPwd = async (record: any) => {
    try {
      await userApi.resetPwd({ userId: record.userId, password: '123456' } as any);
      message.success('密码已重置为 123456');
    } catch {
      message.error('重置失败');
    }
  };

  const columns = [
    key,
    { title: '用户名', dataIndex: 'userName', ellipsis: true },
    { title: '昵称', dataIndex: 'nickName', search: false, ellipsis: true },
    { title: '手机号', dataIndex: 'phonenumber', search: false },
    { title: '邮箱', dataIndex: 'email', search: false, ellipsis: true },
    {
      title: '性别',
      dataIndex: 'sex',
      search: false,
      render: (v: string) => {
        const label = GenderLabel[v as keyof typeof GenderLabel];
        return label ?? '--';
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      fieldProps: { options: STATUS_OPTIONS },
      render: (_: any, record: any) =>
        record.status === StatusEnum.NORMAL
          ? <Badge status="success" text="正常" />
          : <Badge status="error" text="停用" />,
    },
    { title: '部门', dataIndex: ['dept', 'deptName'], search: false },
    { title: '创建时间', dataIndex: 'createTime', search: false, width: 180 },
    {
      ...option,
      width: 240,
      render: (_: any, record: any) => (
        <Space>
          <a onClick={() => openDrawer(record)}>编辑</a>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record)}>
            <a>删除</a>
          </Popconfirm>
          {record.status === StatusEnum.NORMAL ? (
            <a onClick={() => handleChangeStatus(record)}>停用</a>
          ) : (
            <a onClick={() => handleChangeStatus(record)}>启用</a>
          )}
          <Popconfirm title="确定重置密码为123456吗？" onConfirm={() => handleResetPwd(record)}>
            <a>重置密码</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <CommonTable
      rowKey='userId'
        actionRef={actionRef}
        request={request as any}
        columns={columns as any}
        toolBarRender={() => [
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            +新增
          </Button>,
        ]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
      />

      <Drawer
        title={currentRecord ? '编辑用户' : '新增用户'}
        width={640}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>确定</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="userName" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="请输入" disabled={!!currentRecord} />
          </Form.Item>
          <Form.Item name="nickName" label="昵称" rules={[{ required: true, message: '请输入昵称' }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          {!currentRecord && (
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password placeholder="请输入" />
            </Form.Item>
          )}
          <Form.Item name="phonenumber" label="手机号">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="sex" label="性别">
            <Select placeholder="请选择" options={SEX_OPTIONS} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择" options={STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
};

export default Users;
