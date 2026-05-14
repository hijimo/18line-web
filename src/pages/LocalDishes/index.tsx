import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { SpecialStarOptions, StatusEnum, StatusLabel } from '@/enums';

import { get as getSpecialtyApi } from '@/services/api/地方特色菜管理/地方特色菜管理';
import UploadList from '@/components/Upload';
import RegionFormItem from '@/components/RegionFormItem';

const specialtyApi = getSpecialtyApi();

const LocalDishes: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const request = useTableRequest(specialtyApi.list2 as any);

  const openDrawer = (record?: any) => {
    setCurrentRecord(record || null);
    if (record) {
      form.setFieldsValue({ ...record, region: { province: record.province, city: record.city, district: record.district }, attachments: record.attachments || [] });
    } else {
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const { attachments: attachmentFiles, region, ...rest } = values;
    const params = { ...rest, ...region, attachments: attachmentFiles || [] };
    try {
      if (currentRecord) {
        await specialtyApi.editSave2({ ...params, specialtyId: currentRecord.specialtyId } as any);
        message.success('编辑成功');
      } else {
        await specialtyApi.addSave3(params as any);
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
      await specialtyApi.editSave2({ specialtyId: record.specialtyId, status: newStatus } as any);
      message.success(`${StatusLabel[newStatus]}成功`);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await specialtyApi.remove4({ ids: record.specialtyId } as any);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    key,
    { title: '名称', dataIndex: 'specialtyName', ellipsis: true },
    { title: '省份', dataIndex: 'province', ellipsis: true, search: false },
    { title: '城市', dataIndex: 'city', ellipsis: true, search: false },
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
            添加特色菜
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
          <Form.Item name="specialtyName" label="特色菜名称" rules={[{ required: true, message: '请输入特色菜名称' }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="specialtyDesc" label="描述">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
          <RegionFormItem />
          <Form.Item name="price" label="价格">
            <InputNumber placeholder="请输入" addonAfter="元" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="specialStar" label="推荐指数" initialValue={4}>
            <Select placeholder="请选择" options={SpecialStarOptions} />
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
