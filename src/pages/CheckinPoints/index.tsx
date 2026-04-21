import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, Switch, Checkbox, DatePicker, Space, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
// ActionType inferred from ProTable usage
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { get as getCheckinApi } from '@/services/api/打卡点管理/打卡点管理';
import UploadList from '@/components/Upload';

const checkinApi = getCheckinApi();

const RELAX_OPTIONS = [
  { label: '中等', value: '中等' },
  { label: '高', value: '高' },
  { label: '低', value: '低' },
];

const CLASSIC_OPTIONS = [
  { label: '1星', value: 1 },
  { label: '2星', value: 2 },
  { label: '3星', value: 3 },
  { label: '4星', value: 4 },
  { label: '5星', value: 5 },
];

const UNSUITABLE_OPTIONS = ['高温', '暴雨', '冰冻', '心脏病', '高血压', '恐高'];
const INDOOR_OPTIONS = [{ label: '是', value: '是' }, { label: '否', value: '否' }];

type DrawerMode = 'add' | 'edit' | 'detail';

const CheckinPoints: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('add');
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);

  const request = useTableRequest(checkinApi.list5 as any);

  const openDrawer = (mode: DrawerMode, record?: any) => {
    setDrawerMode(mode);
    setCurrentRecord(record || null);
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
      if (drawerMode === 'add') {
        await checkinApi.addSave5(params as any);
        message.success('新增成功');
      } else {
        await checkinApi.editSave5({ ...params, checkinId: currentRecord.checkinId } as any);
        message.success('编辑成功');
      }
      setDrawerOpen(false);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleToggleStatus = async (record: any) => {
    const newStatus = record.status === '上架' ? '下架' : '上架';
    try {
      await checkinApi.editSave5({ checkinId: record.checkinId, status: newStatus } as any);
      message.success(`${newStatus}成功`);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const isReadOnly = drawerMode === 'detail';

  const columns = [
    key,
    { title: '名称', dataIndex: 'name', ellipsis: true },
    { title: '开放时间', dataIndex: 'openTime', search: false, ellipsis: true },
    {
      title: '休闲指数',
      dataIndex: 'relaxIndex',
      search: false,
      valueEnum: RELAX_OPTIONS.reduce((acc, opt) => ({ ...acc, [opt.value]: { text: opt.label } }), {}),
    },
    { title: '游玩时间', dataIndex: 'playDuration', search: false, render: (v: number) => v ? `${v}分钟` : '--' },
    { title: '地点', dataIndex: 'location', search: false },
    {
      title: '是否亲子',
      dataIndex: 'isFamily',
      search: false,
      render: (v: boolean) => v ? <Tag color="blue">是</Tag> : <Tag>否</Tag>,
    },
    {
      title: '经典指数',
      dataIndex: 'classicIndex',
      search: false,
      render: (v: number) => v ? `${v}星` : '--',
    },
    { title: '门票', dataIndex: 'ticketPrice', search: false, render: (v: number) => v ? `${v}元` : '--' },
    {
      ...option,
      render: (_: any, record: any) => (
        <Space>
          <a onClick={() => openDrawer('detail', record)}>详情</a>
          {record.status === '上架' ? (
            <a onClick={() => handleToggleStatus(record)}>下架</a>
          ) : (
            <a onClick={() => handleToggleStatus(record)}>上架</a>
          )}
          <a onClick={() => openDrawer('edit', record)}>编辑</a>
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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer('add')}>
            +打卡点
          </Button>,
        ]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
      />

      <Drawer
        title={drawerMode === 'add' ? '新增打卡点' : drawerMode === 'edit' ? '编辑打卡点' : '打卡点详情'}
        width={640}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={isReadOnly ? null : (
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>确定</Button>
          </Space>
        )}
      >
        <Form form={form} layout="vertical" disabled={isReadOnly}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="shortName" label="简称">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
          <Form.Item name="recommendReason" label="推荐理由">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="openTime" label="开放时间">
            <DatePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="playDuration" label="游玩时间">
            <InputNumber placeholder="请输入" addonAfter="分钟" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="isIndoor" label="室内">
            <Select placeholder="请选择" options={INDOOR_OPTIONS} />
          </Form.Item>
          <Form.Item name="unsuitableFactors" label="不宜出行因素">
            <Checkbox.Group options={UNSUITABLE_OPTIONS} />
          </Form.Item>
          <Form.Item name="avgCost" label="人均消费">
            <InputNumber placeholder="请输入" addonAfter="元" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="ticketPrice" label="门票价格">
            <InputNumber placeholder="请输入" addonAfter="元" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="isFamily" label="亲子游" valuePropName="checked">
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