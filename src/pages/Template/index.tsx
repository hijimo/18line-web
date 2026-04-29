import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { StaminaLabel, YesNoLabel, StatusEnum, StatusLabel } from '@/enums';
import { get as getTemplateApi } from '@/services/api/行程模板管理/行程模板管理';
import UploadList from '@/components/Upload';
import RegionSelect from '@/components/RegionSelect';
import { parseAttachments, stringifyAttachments } from '@/types/common';

const templateApi = getTemplateApi();

const STAMINA_OPTIONS = Object.entries(StaminaLabel).map(([value, label]) => ({ label, value }));
const YES_NO_OPTIONS = Object.entries(YesNoLabel).map(([value, label]) => ({ label, value }));

const Template: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const request = useTableRequest(templateApi.list12 as any);

  const openDrawer = (record?: any) => {
    setCurrentRecord(record || null);
    if (record) {
      form.setFieldsValue({ ...record, region: { province: record.province, city: record.city, district: record.district }, travelTags: record.travelTags ? record.travelTags.split(',').map((s: string) => s.trim()).filter(Boolean) : [], attachments: parseAttachments(record.attachments).map(a => ({ url: a.url, name: a.name })) });
    } else {
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const { region, attachments: attachmentFiles, ...rest } = values;
    const params = { ...rest, ...region, attachments: stringifyAttachments((attachmentFiles || []).map((f: any, i: number) => ({ purpose: f.purpose || 'other', name: f.name || '', sort: i + 1, url: f.url }))) };
    try {
      if (currentRecord) {
        await templateApi.edit13({ ...params, templateId: currentRecord.templateId } as any);
        message.success('编辑成功');
      } else {
        await templateApi.add1(params as any);
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
      await templateApi.edit13({ templateId: record.templateId, status: newStatus } as any);
      message.success(`${StatusLabel[newStatus]}成功`);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await templateApi.remove1(String(record.templateId));
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    key,
    { title: '名称', dataIndex: 'templateName', ellipsis: true },
    { title: '地点', dataIndex: 'location', search: false },
    { title: '体力等级', dataIndex: 'staminaLevel', valueEnum: StaminaLabel },
    { title: '基准天数', dataIndex: 'baseDays', search: false },
    { title: '天数范围', dataIndex: 'minDays', search: false, render: (_: any, record: any) => `${record.minDays ?? '--'} ~ ${record.maxDays ?? '--'}` },
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
        title={currentRecord ? '编辑行程模板' : '新增行程模板'}
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
          <Form.Item name="templateName" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="templateDesc" label="模板描述">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
          <Form.Item name="region" label="地区">
            <RegionSelect />
          </Form.Item>
          <Form.Item name="baseDays" label="基准天数">
            <InputNumber placeholder="请输入" addonAfter="天" style={{ width: '100%' }} />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="minDays" label="最小天数" style={{ width: '50%' }}>
              <InputNumber placeholder="请输入" addonAfter="天" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="maxDays" label="最大天数" style={{ width: '50%' }}>
              <InputNumber placeholder="请输入" addonAfter="天" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="staminaLevel" label="体力等级">
            <Select placeholder="请选择" options={STAMINA_OPTIONS} />
          </Form.Item>
          <Form.Item name="travelTags" label="旅行标签">
            <Input placeholder="逗号分隔" />
          </Form.Item>
          <Form.Item name="includePhotography" label="含跟拍">
            <Select placeholder="请选择" options={YES_NO_OPTIONS} />
          </Form.Item>
          <Form.Item name="includeCar" label="含包车">
            <Select placeholder="请选择" options={YES_NO_OPTIONS} />
          </Form.Item>
          <Form.Item name="version" label="版本号" initialValue={1}>
            <InputNumber placeholder="请输入" style={{ width: '100%' }} />
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

export default Template;
