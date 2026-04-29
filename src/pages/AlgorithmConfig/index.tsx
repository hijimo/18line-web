import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { RegionLevelLabel, StatusEnum, StatusLabel } from '@/enums';
import { get as getAlgoApi } from '@/services/api/算法配置管理/算法配置管理';
import UploadList from '@/components/Upload';
import { parseAttachments, stringifyAttachments } from '@/types/common';

const algoApi = getAlgoApi();

const REGION_LEVEL_OPTIONS = Object.entries(RegionLevelLabel).map(([value, label]) => ({ label, value }));

const AlgorithmConfig: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const request = useTableRequest(algoApi.list14 as any);

  const openDrawer = (record?: any) => {
    setCurrentRecord(record || null);
    if (record) {
      form.setFieldsValue({ ...record, attachments: parseAttachments(record.attachments).map(a => ({ url: a.url, name: a.name })) });
    } else {
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const { attachments: attachmentFiles, ...rest } = values;
    const params = { ...rest, attachments: stringifyAttachments((attachmentFiles || []).map((f: any, i: number) => ({ purpose: f.purpose || 'other', name: f.name || '', sort: i + 1, url: f.url }))) };
    try {
      if (currentRecord) {
        await algoApi.edit14({ ...params, configId: currentRecord.configId } as any);
        message.success('编辑成功');
      } else {
        await algoApi.add2(params as any);
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
      await algoApi.edit14({ configId: record.configId, status: newStatus } as any);
      message.success(`${StatusLabel[newStatus]}成功`);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await algoApi.remove10({ ids: record.configId } as any);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    key,
    { title: '名称', dataIndex: 'regionName', ellipsis: true },
    { title: '级别', dataIndex: 'regionLevel', valueEnum: RegionLevelLabel },
    { title: '体耗系数', dataIndex: 'staminaFormulaCoefficient', search: false },
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
        title={currentRecord ? '编辑算法配置' : '新增算法配置'}
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
          <Form.Item name="regionCode" label="行政区划代码">
            <Input placeholder="行政区划代码" />
          </Form.Item>
          <Form.Item name="regionName" label="行政区划名称">
            <Input placeholder="行政区划名称" />
          </Form.Item>
          <Form.Item name="regionLevel" label="级别">
            <Select placeholder="请选择" options={REGION_LEVEL_OPTIONS} />
          </Form.Item>
          <Form.Item name="staminaLimit0" label="体力上限-弱" initialValue={150}>
            <InputNumber placeholder="请输入" addonAfter="分钟" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="staminaLimit1" label="体力上限-一般" initialValue={240}>
            <InputNumber placeholder="请输入" addonAfter="分钟" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="staminaLimit2" label="体力上限-充沛" initialValue={360}>
            <InputNumber placeholder="请输入" addonAfter="分钟" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="staminaLimit3" label="体力上限-运动员" initialValue={-1}>
            <InputNumber placeholder="请输入" addonAfter="分钟" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="recoveryStartDay" label="恢复起始天数" initialValue={3}>
            <InputNumber placeholder="请输入" addonAfter="天" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="recoveryThreshold" label="恢复阈值" initialValue={480}>
            <InputNumber placeholder="请输入" addonAfter="分钟" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="recoveryLimit2635" label="恢复上限(26-35岁)" initialValue={240}>
            <InputNumber placeholder="请输入" addonAfter="分钟" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="recoveryLimit3650" label="恢复上限(36-50岁)" initialValue={180}>
            <InputNumber placeholder="请输入" addonAfter="分钟" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="recoveryLimit51Plus" label="恢复上限(51+岁)" initialValue={150}>
            <InputNumber placeholder="请输入" addonAfter="分钟" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="singleAttractionThreshold" label="单景点阈值" initialValue={240}>
            <InputNumber placeholder="请输入" addonAfter="分钟" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="staminaFormulaCoefficient" label="体耗系数" initialValue={1.00}>
            <InputNumber placeholder="请输入" precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="periodLimitMorning" label="上午时段上限" initialValue={180}>
            <InputNumber placeholder="请输入" addonAfter="分钟" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="periodLimitAfternoon" label="下午时段上限" initialValue={180}>
            <InputNumber placeholder="请输入" addonAfter="分钟" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="periodLimitEvening" label="晚上时段上限" initialValue={180}>
            <InputNumber placeholder="请输入" addonAfter="分钟" style={{ width: '100%' }} />
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

export default AlgorithmConfig;