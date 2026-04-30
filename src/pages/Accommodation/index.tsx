import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { AccommodationTypeLabel, BreakfastIncludedLabel, PetFriendlyLabel, StatusEnum, StatusLabel, YesNoLabel } from '@/enums';
import type { AttachmentPurpose } from '@/types/common';
import { toAttachments } from '@/types/common';
import { get as getStayApi } from '@/services/api/住宿管理/住宿管理';
import UploadList from '@/components/Upload';

const stayApi = getStayApi();

const TYPE_OPTIONS = Object.entries(AccommodationTypeLabel).map(([value, label]) => ({ label, value }));
const YES_NO = Object.entries(YesNoLabel).map(([value, label]) => ({ label, value }));

/** 住宿管理的上传分类配置 */
const ACCOMMODATION_UPLOAD_FIELDS: { name: string; label: string; purpose: AttachmentPurpose }[] = [
  { name: 'roomFiles', label: '房间', purpose: 'room' },
  { name: 'lobbyFiles', label: '大厅', purpose: 'lobby' },
  { name: 'bathroomFiles', label: '卫生间', purpose: 'bathroom' },
  { name: 'publicAreaFiles', label: '公共区域', purpose: 'public_area' },
];

const Accommodation: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const request = useTableRequest(stayApi.list8 as any);

  const openDrawer = (record?: any) => {
    setCurrentRecord(record || null);
    if (record) {
      const allAttachments: any[] = record.attachments || [];
      const fieldValues: Record<string, { url: string; name: string }[]> = {};
      for (const { name, purpose } of ACCOMMODATION_UPLOAD_FIELDS) {
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
    const allAttachments = ACCOMMODATION_UPLOAD_FIELDS.flatMap(({ name, purpose }) => {
      const files = rest[name] || [];
      delete rest[name];
      return toAttachments(files, purpose);
    });
    const params = { ...rest, attachments: allAttachments };
    try {
      if (currentRecord) {
        await stayApi.editSave8({ ...params, accommodationId: currentRecord.accommodationId } as any);
        message.success('编辑成功');
      } else {
        await stayApi.addSave8(params as any);
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
      await stayApi.editSave8({ accommodationId: record.accommodationId, status: newStatus } as any);
      message.success(`${StatusLabel[newStatus]}成功`);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await stayApi.remove11({ ids: record.accommodationId } as any);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    key,
    { title: '名称', dataIndex: 'accommodationName', ellipsis: true },
    { title: '地址', dataIndex: 'address', search: false, ellipsis: true },
    { title: '类型', dataIndex: 'accommodationType', valueEnum: AccommodationTypeLabel },
    { title: '早餐', dataIndex: 'breakfastIncluded', search: false, render: (v: string) => <Tag color={v === '1' ? 'blue' : undefined}>{BreakfastIncludedLabel[v] ?? '--'}</Tag> },
    { title: '联系电话', dataIndex: 'contactPhone', search: false },
    { title: '地点', dataIndex: 'location', search: false },
    { title: '宠物', dataIndex: 'petFriendly', search: false, render: (v: string) => <Tag color={v === '1' ? 'green' : undefined}>{PetFriendlyLabel[v] ?? '--'}</Tag> },
    { title: '价格区间', dataIndex: 'priceRange', search: false },
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
        title={currentRecord ? '编辑住宿' : '新增住宿'}
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
          <Form.Item name="accommodationName" label="酒店名称" rules={[{ required: true, message: '请输入酒店名称' }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="accommodationType" label="类型">
            <Select placeholder="请选择" options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="breakfastIncluded" label="是否含早餐">
            <Select placeholder="请选择" options={YES_NO} />
          </Form.Item>
          <Form.Item name="contactPhone" label="联系电话">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="accommodationDesc" label="描述">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
          <Form.Item name="petFriendly" label="可否带宠物">
            <Select placeholder="请选择" options={YES_NO} />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="priceMin" label="最低价格" style={{ width: '50%' }}>
              <InputNumber placeholder="请输入" addonAfter="元" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="priceMax" label="最高价格" style={{ width: '50%' }}>
              <InputNumber placeholder="请输入" addonAfter="元" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          {ACCOMMODATION_UPLOAD_FIELDS.map(({ name, label, purpose }) => (
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

export default Accommodation;