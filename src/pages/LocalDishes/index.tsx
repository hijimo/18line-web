import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { SpecialStarOptions, StatusEnum, StatusLabel } from '@/enums';

import { get as getDishApi } from '@/services/api/菜品管理/菜品管理';
import UploadList from '@/components/Upload';

const dishApi = getDishApi();

const LocalDishes: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const request = useTableRequest(dishApi.list3 as any);

  const openDrawer = (record?: any) => {
    setCurrentRecord(record || null);
    if (record) {
      form.setFieldsValue({ ...record, attachments: record.attachments || [] });
    } else {
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const { attachments: attachmentFiles, ...rest } = values;
    const params = { ...rest, dishTag: Array.isArray(rest.dishTag) ? rest.dishTag.join(',') : rest.dishTag, attachments: attachmentFiles || [] };
    try {
      if (currentRecord) {
        await dishApi.editSave3({ ...params, dishId: currentRecord.dishId } as any);
        message.success('编辑成功');
      } else {
        await dishApi.addSave3(params as any);
        message.success('新增成功');
      }
      setDrawerOpen(false);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleToggleStatus = async (record: any) => {
    const newStatus = record.status === StatusEnum.NORMAL ? StatusEnum.DISABLED : StatusEnum.NORMAL;
    try {
      await dishApi.editSave3({ dishId: record.dishId, status: newStatus } as any);
      message.success(`${StatusLabel[newStatus]}成功`);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await dishApi.remove5({ ids: record.dishId } as any);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    key,
    { title: '名称', dataIndex: 'dishName', ellipsis: true },
    { title: '价格（元）', dataIndex: 'price', search: false },
    { title: '推荐指数', dataIndex: 'specialStar', search: false, render: (v: number) => SpecialStarOptions.find(o => o.value === v)?.label ?? '--' },
    {
      ...option,
      render: (_: any, record: any) => (
        <Space>
          <a onClick={() => openDrawer(record)}>编辑</a>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record)}>
            <a>删除</a>
          </Popconfirm>
          {record.status === StatusEnum.NORMAL ? (
            <a onClick={() => handleToggleStatus(record)}>下架</a>
          ) : (
            <a onClick={() => handleToggleStatus(record)}>上架</a>
          )}
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
        toolBarRender={() => [
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            +新增
          </Button>,
        ]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
      />

      <Drawer
        title={currentRecord ? '编辑特色菜' : '新增特色菜'}
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
          <Form.Item name="dishName" label="特色菜名称" rules={[{ required: true, message: '请输入特色菜名称' }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="dishDesc" label="描述">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
          <Form.Item name="price" label="价格">
            <InputNumber placeholder="请输入" addonAfter="元" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="specialStar" label="推荐指数" initialValue={4}>
            <Select placeholder="请选择" options={SpecialStarOptions} />
          </Form.Item>
          <Form.Item name="dishTag" label="菜品标签">
            <Input placeholder="菜品" />
          </Form.Item>
          <Form.Item name="attachments" label="附件" valuePropName="fileList">
            <UploadList
              purpose="detail"
              maxLength={9}
              uploadText="上传附件"
              accept="image/png,image/jpeg,image/gif,application/pdf"
            />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
};

export default LocalDishes;