import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { DiningNatureLabel, DiningRecommendRatingOptions, PetFriendlyLabel, ParkingAvailableLabel, StatusEnum, StatusLabel, YesNoLabel } from '@/enums';
import { parseAttachments, stringifyAttachments } from '@/types/common';
import { get as getDiningApi } from '@/services/api/餐饮管理/餐饮管理';
import UploadList from '@/components/Upload';
import RegionSelect from '@/components/RegionSelect';

const diningApi = getDiningApi();

const YES_NO = Object.entries(YesNoLabel).map(([value, label]) => ({ label, value }));
const diningNatureOptions = Object.entries(DiningNatureLabel).map(([value, label]) => ({ label, value }));

const Dining: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const request = useTableRequest(diningApi.list4 as any);

  const openDrawer = (record?: any) => {
    setCurrentRecord(record || null);
    if (record) {
      form.setFieldsValue({ ...record, region: { province: record.province, city: record.city, district: record.district }, images: record.images || [], attachments: parseAttachments(record.attachments).map(a => ({ url: a.url, name: a.name })) });
    } else {
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const { region, images, attachments: attachmentFiles, ...rest } = values;
    const params = { ...rest, ...region, images: (images || []).map((f: any) => f.url), attachments: stringifyAttachments((attachmentFiles || []).map((f: any, i: number) => ({ purpose: f.purpose || 'other', name: f.name || '', sort: i + 1, url: f.url }))) };
    try {
      if (currentRecord) {
        await diningApi.editSave4({ ...params, diningId: currentRecord.diningId } as any);
        message.success('编辑成功');
      } else {
        await diningApi.addSave4(params as any);
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
      await diningApi.editSave4({ diningId: record.diningId, status: newStatus } as any);
      message.success(`${StatusLabel[newStatus]}成功`);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await diningApi.remove6({ ids: record.diningId } as any);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    key,
    { title: '名称', dataIndex: 'diningName', ellipsis: true },
    { title: '性质', dataIndex: 'diningNature', search: false, valueEnum: DiningNatureLabel },
    { title: '人均', dataIndex: 'avgCost', search: false, render: (v: number) => v ? `${v}元/位` : '--' },
    { title: '口碑评分', dataIndex: 'recommendRating', search: false, valueEnum: Object.fromEntries(DiningRecommendRatingOptions.map(({ value, label }) => [value, { text: label }])) },
    { title: '宠物友好', dataIndex: 'petFriendly', search: false, valueEnum: PetFriendlyLabel },
    { title: '停车位', dataIndex: 'parkingAvailable', search: false, valueEnum: ParkingAvailableLabel },
    { title: '地址', dataIndex: 'address', search: false, ellipsis: true },
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
        title={currentRecord ? '编辑餐饮' : '新增餐饮'}
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
          <Form.Item name="diningName" label="餐厅名称" rules={[{ required: true, message: '请输入餐厅名称' }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="region" label="地区">
            <RegionSelect />
          </Form.Item>
          <Form.Item name="diningNature" label="餐饮性质">
            <Select placeholder="请选择" options={diningNatureOptions} />
          </Form.Item>
          <Form.Item name="avgCost" label="人均消费">
            <InputNumber placeholder="请输入" addonAfter="元/位" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input placeholder="请输入" />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="longitude" label="经度" style={{ width: '50%' }}>
              <InputNumber placeholder="请输入" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="latitude" label="纬度" style={{ width: '50%' }}>
              <InputNumber placeholder="请输入" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="petFriendly" label="宠物友好">
            <Select placeholder="请选择" options={YES_NO} />
          </Form.Item>
          <Form.Item name="parkingAvailable" label="停车位">
            <Select placeholder="请选择" options={YES_NO} />
          </Form.Item>
          <Form.Item name="diningDesc" label="描述">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
          <Form.Item name="diningTips" label="Tips">
            <Input placeholder="如每周三休息" />
          </Form.Item>
          <Form.Item name="recommendRating" label="口碑评分">
            <Select placeholder="请选择" options={DiningRecommendRatingOptions} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="images" label="上传图片" valuePropName="fileList">
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

export default Dining;