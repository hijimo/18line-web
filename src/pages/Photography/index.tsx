import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { GenderLabel, PhotographyRecommendRatingOptions, StatusEnum, StatusLabel } from '@/enums';
import { parseAttachments, stringifyAttachments } from '@/types/common';
import { get as getPhotographyApi } from '@/services/api/跟拍管理/跟拍管理';
import UploadList from '@/components/Upload';

const photographyApi = getPhotographyApi();

const genderOptions = Object.entries(GenderLabel).map(([value, label]) => ({ label, value }));
const recommendRatingValueEnum = PhotographyRecommendRatingOptions.reduce((acc, opt) => { acc[opt.value] = { text: opt.label }; return acc; }, {} as Record<number, string>);

const Photography: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const request = useTableRequest(photographyApi.list1 as any);

  const openDrawer = (record?: any) => {
    setCurrentRecord(record || null);
    if (record) {
      form.setFieldsValue({ ...record, images: record.images || [], attachments: parseAttachments(record.attachments).map(a => ({ url: a.url, name: a.name })) });
    } else {
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const { images, attachments: attachmentFiles, ...rest } = values;
    const params = { ...rest, images: (images || []).map((f: any) => f.url), attachments: stringifyAttachments((attachmentFiles || []).map((f: any, i: number) => ({ purpose: f.purpose || 'other', name: f.name || '', sort: i + 1, url: f.url }))) };
    try {
      if (currentRecord) {
        await photographyApi.editSave1({ ...params, photographyId: currentRecord.photographyId } as any);
        message.success('编辑成功');
      } else {
        await photographyApi.addSave1(params as any);
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
      await photographyApi.editSave1({ photographyId: record.photographyId, status: newStatus } as any);
      message.success(`${StatusLabel[newStatus]}成功`);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await photographyApi.remove3({ ids: record.photographyId } as any);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    key,
    { title: '名称', dataIndex: 'nickname', ellipsis: true },
    { title: '性别', dataIndex: 'gender', search: false, valueEnum: Object.fromEntries(Object.entries(GenderLabel).map(([k, v]) => [k, { text: v }])) },
    { title: '专长', dataIndex: 'equipment', search: false, ellipsis: true },
    { title: '价格', dataIndex: 'price', search: false, render: (v: number) => v ? `${v}元/天` : '--' },
    { title: '电话', dataIndex: 'contactInfo', search: false },
    { title: '地点', dataIndex: 'location', search: false },
    { title: '专业评分', dataIndex: 'recommendRating', search: false, valueEnum: recommendRatingValueEnum },
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
        title={currentRecord ? '编辑跟拍' : '新增跟拍'}
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
          <Form.Item name="nickname" label="跟拍师名称" rules={[{ required: true, message: '请输入跟拍师名称' }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Select placeholder="请选择" options={genderOptions} />
          </Form.Item>
          <Form.Item name="equipment" label="专长">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="price" label="价格">
            <InputNumber placeholder="请输入" addonAfter="元/天" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="contactInfo" label="电话">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="introduction" label="描述">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
          <Form.Item name="recommendRating" label="专业评分">
            <Select placeholder="请选择" options={PhotographyRecommendRatingOptions} />
          </Form.Item>
          <Form.Item name="images" label="作品集" valuePropName="fileList">
            <UploadList
              purpose="cover"
              maxLength={9}
              uploadText="上传"
              accept="image/png,image/jpeg,image/gif"
            />
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

export default Photography;