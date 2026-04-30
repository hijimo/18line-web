import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Popconfirm, Select, Switch, Checkbox, TimePicker, Space, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { PlusOutlined } from '@ant-design/icons';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { get as getCheckinApi } from '@/services/api/打卡点管理/打卡点管理';
import { get as getAttractionApi } from '@/services/api/景点管理/景点管理';
import { FamilyFriendlyLabel, ClassicRatingOptions, IndoorOutdoorLabel, BadFactorsLabel, BlindStatusLabel, StatusEnum, StatusLabel } from '@/enums';

import UploadList from '@/components/Upload';
import RegionSelect from '@/components/RegionSelect';
import DictSelect from '@/components/DataSelect/DictSelect';
import { useDictMap } from '@/hooks/useDictMap';

const checkinApi = getCheckinApi();
const attractionApi = getAttractionApi();

const indoorOutdoorOptions = Object.entries(IndoorOutdoorLabel).map(([value, label]) => ({ label, value }));
const badFactorsOptions = Object.entries(BadFactorsLabel).map(([value, label]) => ({ label, value }));
const classicRatingValueEnum = Object.fromEntries(ClassicRatingOptions.map(({ value, label }) => [value, { text: label }]));
const blindStatusOptions = Object.entries(BlindStatusLabel).map(([value, label]) => ({ label, value }));

const CheckinPoints: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();
  const [attractionOptions, setAttractionOptions] = useState<any[]>([]);

  const request = useTableRequest(checkinApi.list5 as any);
  const leisureMap = useDictMap('travel_leisure');

  const openDrawer = async (record?: any) => {
    setCurrentRecord(record || null);
    try {
      const res = await attractionApi.list7({ pageNum: 1, pageSize: 1000 } as any);
      setAttractionOptions((res as any).rows || []);
    } catch {}
    if (record) {
      const openTimeValue = record.openTime
        ? record.openTime.split(' - ').map((t: string) => dayjs(t, 'HH:mm'))
        : undefined;
      form.setFieldsValue({ ...record, openTime: openTimeValue, region: { province: record.province, city: record.city, district: record.district }, attachments: record.attachments || [] });
    } else {
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const { region, attachments: attachmentFiles, ...rest } = values;
    const params = { ...rest, ...region, openTime: values.openTime?.map((t: any) => t?.format('HH:mm')).join(' - ') ?? '', attachments: attachmentFiles || [] };
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
    { title: '休闲指数', dataIndex: 'leisureRating', search: false, render: (_: any, r: any) => leisureMap[r.leisureRating] ?? r.leisureRating ?? '--' },
    { title: '游玩时间', dataIndex: 'visitDuration', search: false, render: (v: number) => v ? `${v}分钟` : '--' },
    { title: '地点', dataIndex: 'location', search: false },
    { title: '是否全盲', dataIndex: 'blindStatus', search: false, valueEnum: Object.fromEntries(Object.entries(BlindStatusLabel).map(([k, v]) => [k, { text: v }])) },
    { title: '是否亲子', dataIndex: 'familyFriendly', search: false, render: (v: string) => v === '1' ? <Tag color="blue">{FamilyFriendlyLabel[v]}</Tag> : <Tag>{FamilyFriendlyLabel[v]}</Tag> },
    { title: '经典指数', dataIndex: 'classicRating', search: false, valueEnum: classicRatingValueEnum },
    { title: '门票(成人)', dataIndex: 'ticketPriceA', search: false, render: (v: number) => v ? `${v}元` : '--' },
    { title: '门票(儿童)', dataIndex: 'ticketPriceC', search: false, render: (v: number) => v ? `${v}元` : '--' },
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
          <Form.Item name="region" label="地区">
            <RegionSelect />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="longitude" label="经度" style={{ width: '50%' }}>
              <InputNumber placeholder="请输入" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="latitude" label="纬度" style={{ width: '50%' }}>
              <InputNumber placeholder="请输入" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="blindStatus" label="是否全盲">
            <Select placeholder="请选择" options={blindStatusOptions} />
          </Form.Item>
          <Form.Item name="classicRating" label="经典指数">
            <Select placeholder="请选择" options={ClassicRatingOptions} />
          </Form.Item>
          <Form.Item name="leisureRating" label="休闲指数">
            <DictSelect code="travel_leisure" />
          </Form.Item>
          <Form.Item name="openTime" label="开放时间">
            <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
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
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="ticketPriceA" label="门票价格(成人)" style={{ width: '50%' }}>
              <InputNumber placeholder="请输入" addonAfter="元" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="ticketPriceC" label="门票价格(儿童)" style={{ width: '50%' }}>
              <InputNumber placeholder="请输入" addonAfter="元" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="familyFriendly" label="亲子游" valuePropName="checked" normalize={(v) => v ? '1' : '0'}>
            <Switch />
          </Form.Item>
          <Form.Item name="reservationRequired" label="提前预约">
            <Input placeholder="请输入预约渠道" />
          </Form.Item>
          <Form.Item name="closedDay" label="固定闭馆日期">
            <Input placeholder="如：周一" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序序号">
            <InputNumber placeholder="请输入" min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="checkinNotes" label="注意事项">
            <Input.TextArea placeholder="请输入" rows={3} />
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

export default CheckinPoints;