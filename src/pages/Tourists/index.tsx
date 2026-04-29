import React, { useRef, useState } from 'react';
import { Button, Drawer, Descriptions, Form, Input, Popconfirm, Select, Space, Tag, message } from 'antd';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { TouristGenderLabel, StatusEnum, StatusLabel } from '@/enums';
import { get as getTouristApi } from '@/services/api/游客管理/游客管理';

const touristApi = getTouristApi();

const GENDER_OPTIONS = Object.entries(TouristGenderLabel).map(([value, label]) => ({ label, value }));

const Tourists: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const request = useTableRequest(touristApi.list11 as any);

  const openEdit = (record: any) => {
    setCurrentRecord(record);
    form.setFieldsValue(record);
    setDrawerOpen(true);
  };

  const openDetail = (record: any) => {
    setCurrentRecord(record);
    setDetailOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      await touristApi.edit1({ ...values, touristId: currentRecord.touristId } as any);
      message.success('编辑成功');
      setDrawerOpen(false);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await touristApi.remove12({ touristIds: String(record.touristId) });
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    key,
    { title: '游客ID', dataIndex: 'touristId', search: false, width: 80 },
    { title: '昵称', dataIndex: 'nickname', ellipsis: true },
    { title: '手机号', dataIndex: 'phone', search: false },
    {
      title: '性别',
      dataIndex: 'gender',
      search: false,
      render: (v: string) => {
        const label = TouristGenderLabel[v as keyof typeof TouristGenderLabel];
        return <Tag color={v === '2' ? 'pink' : v === '1' ? 'blue' : undefined}>{label ?? '--'}</Tag>;
      },
    },
    { title: '真实姓名', dataIndex: 'realName', search: false },
    { title: '状态', dataIndex: 'status', search: false, render: (v: string) => <Tag color={v === StatusEnum.NORMAL ? 'green' : 'red'}>{StatusLabel[v as keyof typeof StatusLabel] ?? '--'}</Tag> },
    { title: '创建时间', dataIndex: 'createTime', search: false, width: 180 },
    { title: '备注', dataIndex: 'remark', search: false, ellipsis: true },
    {
      ...option,
      render: (_: any, record: any) => (
        <Space>
          <a onClick={() => openDetail(record)}>详情</a>
          <a onClick={() => openEdit(record)}>编辑</a>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record)}>
            <a>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <CommonTable
        actionRef={actionRef}
        request={request as any}
        columns={columns as any}
        toolBarRender={false}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
      />

      {/* 编辑抽屉 */}
      <Drawer
        title="编辑游客"
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
          <Form.Item name="nickname" label="昵称">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Select placeholder="请选择" options={GENDER_OPTIONS} />
          </Form.Item>
          <Form.Item name="realName" label="真实姓名">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择" options={[{ label: '正常', value: '0' }, { label: '停用', value: '1' }]} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* 详情抽屉 */}
      <Drawer
        title="游客详情"
        width={640}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        {currentRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="游客ID">{currentRecord.touristId}</Descriptions.Item>
            <Descriptions.Item label="昵称">{currentRecord.nickname}</Descriptions.Item>
            <Descriptions.Item label="手机号">{currentRecord.phone}</Descriptions.Item>
            <Descriptions.Item label="性别">{TouristGenderLabel[currentRecord.gender as keyof typeof TouristGenderLabel] ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="真实姓名">{currentRecord.realName ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="状态">{StatusLabel[currentRecord.status as keyof typeof StatusLabel] ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="OpenID" span={2}>{currentRecord.openid ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="登录IP">{currentRecord.loginIp ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="登录时间">{currentRecord.loginDate ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{currentRecord.createTime ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{currentRecord.updateTime ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>{currentRecord.remark ?? '--'}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </>
  );
};

export default Tourists;
