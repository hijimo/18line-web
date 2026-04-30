import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { GenderLabel, PhotographyRecommendRatingOptions, StatusEnum, StatusLabel } from '@/enums';
import type { AttachmentPurpose } from '@/types/common';
import { toAttachments } from '@/types/common';
import { get as getCarApi } from '@/services/api/包车管理/包车管理';
import UploadList from '@/components/Upload';

const carApi = getCarApi();

const genderOptions = Object.entries(GenderLabel).map(([value, label]) => ({ label, value }));
const genderValueEnum = Object.fromEntries(Object.entries(GenderLabel).map(([k, v]) => [k, { text: v }]));
const recommendRatingValueEnum = PhotographyRecommendRatingOptions.reduce((acc, opt) => { acc[opt.value] = { text: opt.label }; return acc; }, {} as Record<number, { text: string }>);

/** 包车服务的上传分类配置 */
const CAR_UPLOAD_FIELDS: { name: string; label: string; purpose: AttachmentPurpose }[] = [
  { name: 'carExteriorFiles', label: '汽车外观', purpose: 'car_exterior' },
  { name: 'carInteriorFiles', label: '汽车内饰', purpose: 'car_interior' },
  { name: 'drivingLicenseFiles', label: '驾照', purpose: 'driving_license' },
  { name: 'vehicleLicenseFiles', label: '行驶证', purpose: 'vehicle_license' },
];

const CharteredCar: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const request = useTableRequest(carApi.list6 as any);

  const openDrawer = (record?: any) => {
    setCurrentRecord(record || null);
    if (record) {
      const allAttachments: any[] = record.attachments || [];
      const fieldValues: Record<string, { url: string; name: string }[]> = {};
      for (const { name, purpose } of CAR_UPLOAD_FIELDS) {
        fieldValues[name] = allAttachments
          .filter(a => a.purpose === purpose)
          .map(a => ({ url: a.url, name: a.name }));
      }
      form.setFieldsValue({ ...record, ...fieldValues });
    } else {
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const rest = { ...values };
    // 从各上传字段收集附件，按 purpose 合并
    const allAttachments = CAR_UPLOAD_FIELDS.flatMap(({ name, purpose }) => {
      const files = rest[name] || [];
      delete rest[name];
      return toAttachments(files, purpose);
    });
    const params = { ...rest, attachments: allAttachments };
    try {
      if (currentRecord) {
        await carApi.editSave6({ ...params, carId: currentRecord.carId } as any);
        message.success('编辑成功');
      } else {
        await carApi.addSave6(params as any);
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
      await carApi.editSave6({ carId: record.carId, status: newStatus } as any);
      message.success(`${StatusLabel[newStatus]}成功`);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await carApi.remove8({ ids: record.carId } as any);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    key,
    { title: '名称', dataIndex: 'nickname', ellipsis: true },
    { title: '性别', dataIndex: 'gender', search: false, valueEnum: genderValueEnum },
    { title: '驾龄', dataIndex: 'drivingYears', search: false, render: (v: number) => v ? `${v}年` : '--' },
    { title: '价格', dataIndex: 'price', search: false, render: (v: number) => v ? `${v}元/天` : '--' },
    { title: '电话', dataIndex: 'contactInfo', search: false },
    { title: '车型', dataIndex: 'carModel', search: false },
    { title: '地点', dataIndex: 'location', search: false },
    { title: '评分', dataIndex: 'recommendRating', search: false, valueEnum: recommendRatingValueEnum },
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
        title={currentRecord ? '编辑包车' : '新增包车'}
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
          <Form.Item name="nickname" label="司机名称" rules={[{ required: true, message: '请输入司机名称' }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Select placeholder="请选择" options={genderOptions} />
          </Form.Item>
          <Form.Item name="seatCount" label="座位数">
            <InputNumber placeholder="请输入" addonAfter="座" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="drivingYears" label="驾龄">
            <InputNumber placeholder="请输入" addonAfter="年" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="price" label="价格">
            <InputNumber placeholder="请输入" addonAfter="元/天" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="contactInfo" label="电话">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="carModel" label="车型">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="introduction" label="描述">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
          <Form.Item name="recommendRating" label="评分">
            <Select placeholder="请选择" options={PhotographyRecommendRatingOptions} />
          </Form.Item>
          {CAR_UPLOAD_FIELDS.map(({ name, label, purpose }) => (
            <Form.Item key={name} name={name} label={label} valuePropName="fileList">
              <UploadList
                purpose={purpose}
                maxLength={9}
                uploadText={`上传${label}`}
                accept="image/png,image/jpeg,image/gif"
              />
            </Form.Item>
          ))}
        </Form>
      </Drawer>
    </>
  );
};

export default CharteredCar;