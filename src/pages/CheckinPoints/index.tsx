import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Popconfirm, Select, Switch, Checkbox, DatePicker, Space, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { get as getCheckinApi } from '@/services/api/打卡点管理/打卡点管理';
import { get as getAttractionApi } from '@/services/api/景点管理/景点管理';
import { FamilyFriendlyLabel, LeisureRatingLabel, ClassicRatingOptions, IndoorOutdoorLabel, BadFactorsLabel, StatusEnum, StatusLabel } from '@/enums';
import UploadList from '@/components/Upload';

const checkinApi = getCheckinApi();
const attractionApi = getAttractionApi();

const leisureRatingValueEnum = Object.fromEntries(Object.entries(LeisureRatingLabel).map(([k, v]) => [k, { text: v }]));
const indoorOutdoorOptions = Object.entries(IndoorOutdoorLabel).map(([value, label]) => ({ label, value }));
const badFactorsOptions = Object.entries(BadFactorsLabel).map(([value, label]) => ({ label, value }));
const classicRatingValueEnum = Object.fromEntries(ClassicRatingOptions.map(({ value, label }) => [value, { text: label }]));

const CheckinPoints: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [attractionOptions, setAttractionOptions] = useState<any[]>([]);

  const request = useTableRequest(checkinApi.list5 as any);

  const openDrawer = async (record?: any) => {
    setCurrentRecord(record || null);
    try {
      const res = await attractionApi.list7({ pageNum: 1, pageSize: 1000 } as any);
      setAttractionOptions((res as any).rows || []);
    } catch {}
    if (record) {
      form.setFieldsValue(record);
      setFileList(record.images || []);
    } else {
      form.resetFields();
      setFileList([]);
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const params = { ...values, images: fileList.map((f) => f.url) };
    try {
      if (currentRecord) {
        await checkinApi.editSave5({ ...params, checkinId: currentRecord.checkinId } as any);
        message.success('编辑成功');
      } else {
        await checkinApi.addSave5(params as any);
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
      await checkinApi.editSave5({ checkinId: record.checkinId, status: newStatus } as any);
      message.success(`${StatusLabel[newStatus]}成功`);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await checkinApi.remove7({ ids: record.checkinId } as any);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    key,
    { title: '名称', dataIndex: 'checkinName', ellipsis: true },
    { title: '开放时间', dataIndex: 'openTime', search: false, ellipsis: true },
    { title: '休闲指数', dataIndex: 'leisureRating', search: false, valueEnum: leisureRatingValueEnum },
    { title: '游玩时间', dataIndex: 'visitDuration', search: false, render: (v: number) => v ? `${v}分钟` : '--' },
    { title: '地点', dataIndex: 'location', search: false },
    { title: '是否亲子', dataIndex: 'familyFriendly', search: false, render: (v: string) => v === '1' ? <Tag color="blue">{FamilyFriendlyLabel[v]}</Tag> : <Tag>{FamilyFriendlyLabel[v]}</Tag> },
    { title: '经典指数', dataIndex: 'classicRating', search: false, valueEnum: classicRatingValueEnum },
    { title: '门票', dataIndex: 'ticketPriceA', search: false, render: (v: number) => v ? `${v}元` : '--' },
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
            +打卡点
          </Button>,
        ]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
      />

      <Drawer
        title={currentRecord ? '编辑打卡点' : '新增打卡点'}
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
          <Form.Item name="checkinName" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="attractionId" label="关联景点" rules={[{ required: true, message: '请选择关联景点' }]}>
            <Select placeholder="请选择" options={attractionOptions.map(a => ({ label: a.attractionName, value: a.attractionId }))} />
          </Form.Item>
          <Form.Item name="checkinShortName" label="简称">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="checkinDescription" label="描述">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
          <Form.Item name="checkinBlurb" label="推荐理由">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="visitDuration" label="游玩时间">
            <InputNumber placeholder="请输入" addonAfter="分钟" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="indoorOutdoor" label="室内/室外">
            <Select placeholder="请选择" options={indoorOutdoorOptions} />
          </Form.Item>
          <Form.Item name="badFactors" label="不宜出行因素">
            <Checkbox.Group options={badFactorsOptions} />
          </Form.Item>
          <Form.Item name="perCost" label="人均消费">
            <InputNumber placeholder="请输入" addonAfter="元" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="ticketPriceA" label="门票价格">
            <InputNumber placeholder="请输入" addonAfter="元" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="familyFriendly" label="亲子游" valuePropName="checked" normalize={(v) => v ? '1' : '0'}>
            <Switch />
          </Form.Item>
          <Form.Item label="上传图片">
            <UploadList
              fileList={fileList}
              onChange={setFileList as any}
              maxLength={9}
              uploadText="上传"
              accept="image/png,image/jpeg,image/gif"
            />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
};

export default CheckinPoints;