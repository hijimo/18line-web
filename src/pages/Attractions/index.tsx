import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Popconfirm, Select, Switch, Checkbox, DatePicker, Space, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { get as getAttractionApi } from '@/services/api/景点管理/景点管理';
import UploadList from '@/components/Upload';
import RegionSelect from '@/components/RegionSelect';
import LineSelect from '@/components/DataSelect/LineSelect';
import DictSelect from '@/components/DataSelect/DictSelect';
import { useDictMap } from '@/hooks/useDictMap';
import { BlindStatusLabel, FamilyFriendlyLabel, ClassicRatingOptions, BadFactorsLabel, StatusEnum, StatusLabel } from '@/enums';


const attractionApi = getAttractionApi();

const badFactorsOptions = Object.entries(BadFactorsLabel).map(([value, label]) => ({ label, value }));
const blindStatusOptions = Object.entries(BlindStatusLabel).map(([value, label]) => ({ label, value }));

const Attractions: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const request = useTableRequest(attractionApi.list7 as any);
  const leisureMap = useDictMap('travel_leisure');

  const openDrawer = (record?: any) => {
    setCurrentRecord(record || null);
    if (record) {
      form.setFieldsValue({
        ...record,
        region: { province: record.province, city: record.city, district: record.district },
        lineIds: record.lineIds || record.lines?.map((l: any) => l.lineId) || [],
        badFactors: record.badFactors ? record.badFactors.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        attachments: record.attachments || [],
      });
    } else {
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const { region, attachments: attachmentFiles, ...rest } = values;
    const params = {
      ...rest,
      ...region,
      badFactors: Array.isArray(rest.badFactors) ? rest.badFactors.join(',') : rest.badFactors,
      attachments: attachmentFiles || [],
    };
    try {
      if (currentRecord) {
        await attractionApi.editSave7({ ...params, attractionId: currentRecord.attractionId } as any);
        message.success('编辑成功');
      } else {
        await attractionApi.addSave7(params as any);
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
      await attractionApi.editSave7({ attractionId: record.attractionId, status: newStatus } as any);
      message.success(`${StatusLabel[newStatus]}成功`);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await attractionApi.remove9({ ids: record.attractionId } as any);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    key,
    { title: '名称', dataIndex: 'attractionName', ellipsis: true },
    { title: '开放时间', dataIndex: 'openTime', search: false, ellipsis: true },
    { title: '休闲指数', dataIndex: 'leisureRating', search: false, render: (_: any, r: any) => leisureMap[r.leisureRating] ?? r.leisureRating ?? '--' },
    { title: '游玩时间', dataIndex: 'visitDuration', search: false, render: (v: number) => v ? `${v}小时` : '--' },
    { title: '地点', dataIndex: 'location', search: false },
    { title: '是否亲子', dataIndex: 'familyFriendly', search: false, render: (v: string) => <Tag color={v === '1' ? 'blue' : undefined}>{FamilyFriendlyLabel[v]}</Tag> },
    { title: '经典指数', dataIndex: 'classicRating', search: false, render: (v: number) => v ? `${v}星` : '--' },
    { title: '门票', dataIndex: 'ticketPriceA', search: false, render: (v: number) => v ? `${v}元` : '--' },
    { title: '打卡点', dataIndex: 'checkinCount', search: false },
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
            +景点
          </Button>,
        ]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        columnsState={{ persistenceKey: 'attractions', persistenceType: 'localStorage' }}
      />

      <Drawer
        title={currentRecord ? '编辑景点' : '新增景点'}
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
          <Form.Item name="attractionName" label="景点名称" rules={[{ required: true, message: '请输入景点名称' }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="attractionShortName" label="简称">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="region" label="地区">
            <RegionSelect />
          </Form.Item>
          <Form.Item name="lineIds" label="所属线路">
            <LineSelect mode="multiple" placeholder="请选择线路" />
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
          <Form.Item name="attractionDescription" label="描述">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
          <Form.Item name="attractionBlurb" label="模糊说明">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="classicRating" label="经典指数">
            <Select placeholder="请选择" options={ClassicRatingOptions} />
          </Form.Item>
          <Form.Item name="leisureRating" label="休闲指数">
            <DictSelect code="travel_leisure" />
          </Form.Item>
          <Form.Item name="visitDuration" label="游玩时间">
            <InputNumber placeholder="请输入" addonAfter="小时" style={{ width: '100%' }} />
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
          <Form.Item name="attractionNotes" label="注意事项">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
          <Form.Item name="reservationRequired" label="提前预约">
            <Input placeholder="请输入预约渠道" />
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

export default Attractions;