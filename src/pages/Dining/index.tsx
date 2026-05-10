import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { DiningRecommendRatingOptions, PetFriendlyLabel, ParkingAvailableLabel, StatusEnum, StatusLabel, YesNoLabel, SpecialStarOptions, SeasonalLabel, ReservationLabel } from '@/enums';

import { get as getDiningApi } from '@/services/api/餐饮管理/餐饮管理';
import { get as getDishApi } from '@/services/api/菜品管理/菜品管理';
import UploadList from '@/components/Upload';
import RegionSelect from '@/components/RegionSelect';
import DictSelect from '@/components/DataSelect/DictSelect';
import { useDictMap } from '@/hooks/useDictMap';

const diningApi = getDiningApi();
const dishApi = getDishApi();

const YES_NO = Object.entries(YesNoLabel).map(([value, label]) => ({ label, value }));
const YES_NO_OPTIONS = Object.entries(SeasonalLabel).map(([value, label]) => ({ label, value }));
const specialStarValueEnum = Object.fromEntries(SpecialStarOptions.map(o => [o.value, { text: o.label }]));
const seasonalValueEnum = Object.fromEntries(Object.entries(SeasonalLabel).map(([k, v]) => [k, { text: v }]));
const reservationValueEnum = Object.fromEntries(Object.entries(ReservationLabel).map(([k, v]) => [k, { text: v }]));

const DishesPanel: React.FC<{ diningId: number }> = ({ diningId }) => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentDish, setCurrentDish] = useState<any>(null);
  const [form] = Form.useForm();
  const darkLevelMap = useDictMap('travel_dark_level');

  const request = useTableRequest(dishApi.list3 as any, { diningId });

  const openDrawer = (record?: any) => {
    setCurrentDish(record || null);
    if (record) {
      form.setFieldsValue({ ...record, attachments: record.attachments || [] });
    } else {
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const { attachments: attachmentFiles, ...rest } = values;
    const params = { ...rest, diningId, attachments: attachmentFiles || [] };
    try {
      if (currentDish) {
        await dishApi.editSave3({ ...params, dishId: currentDish.dishId } as any);
        message.success('编辑成功');
      } else {
        await dishApi.addSave4(params as any);
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
      await dishApi.editSave3({ dishId: record.dishId, status: newStatus } as any);
      message.success(`${StatusLabel[newStatus]}成功`);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await dishApi.remove5({ ids: record.dishId } as any);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    key,
    { title: '菜品名称', dataIndex: 'dishName', ellipsis: true },
    { title: '黑暗程度', dataIndex: 'darkLevel', search: false, render: (_: any, r: any) => darkLevelMap[r.darkLevel] ?? r.darkLevel ?? '--' },
    { title: '特色星级', dataIndex: 'specialStar', search: false, valueEnum: specialStarValueEnum },
    { title: '价格', dataIndex: 'price', search: false, render: (v: number) => v ? `${v}元` : '--' },
    { title: '是否时令菜', dataIndex: 'seasonal', search: false, valueEnum: seasonalValueEnum },
    { title: '提前预约', dataIndex: 'reservation', search: false, valueEnum: reservationValueEnum },
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
            添加菜品
          </Button>,
        ]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
      />
      <Drawer
        title={currentDish ? '编辑菜品' : '新增菜品'}
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
          <Form.Item name="dishName" label="菜品名称" rules={[{ required: true, message: '请输入菜品名称' }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="dishDesc" label="描述">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
          <Form.Item name="darkLevel" label="黑暗程度">
            <DictSelect code="travel_dark_level" />
          </Form.Item>
          <Form.Item name="price" label="价格">
            <InputNumber placeholder="请输入" addonAfter="元" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="specialStar" label="特色星级">
            <Select placeholder="请选择" options={SpecialStarOptions} />
          </Form.Item>
          <Form.Item name="seasonal" label="时令菜">
            <Select placeholder="请选择" options={YES_NO_OPTIONS} />
          </Form.Item>
          <Form.Item name="reservation" label="提前预约">
            <Select placeholder="请选择" options={YES_NO_OPTIONS} />
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

const Dining: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const [dishesDrawerOpen, setDishesDrawerOpen] = useState(false);
  const [currentDiningId, setCurrentDiningId] = useState<number | null>(null);
  const [currentDiningName, setCurrentDiningName] = useState('');

  const request = useTableRequest(diningApi.list4 as any);
  const diningNatureMap = useDictMap('travel_dining_nature');

  const openDrawer = (record?: any) => {
    setCurrentRecord(record || null);
    if (record) {
      form.setFieldsValue({ ...record, region: { province: record.province, city: record.city, district: record.district }, attachments: record.attachments || [] });
    } else {
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const { region, attachments: attachmentFiles, ...rest } = values;
    const params = { ...rest, ...region, attachments: attachmentFiles || [] };
    try {
      if (currentRecord) {
        await diningApi.editSave4({ ...params, diningId: currentRecord.diningId } as any);
        message.success('编辑成功');
      } else {
        await diningApi.addSave5(params as any);
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

  const openDishesDrawer = (record: any) => {
    setCurrentDiningId(record.diningId);
    setCurrentDiningName(record.diningName);
    setDishesDrawerOpen(true);
  };

  const columns = [
    key,
    { title: '名称', dataIndex: 'diningName', ellipsis: true },
    { title: '性质', dataIndex: 'diningNature', search: false, render: (_: any, r: any) => diningNatureMap[r.diningNature] ?? r.diningNature ?? '--' },
    { title: '人均', dataIndex: 'avgCost', search: false, render: (v: number) => v ? `${v}元/位` : '--' },
    { title: '口碑评分', dataIndex: 'recommendRating', search: false, valueEnum: Object.fromEntries(DiningRecommendRatingOptions.map(({ value, label }) => [value, { text: label }])) },
    { title: '宠物友好', dataIndex: 'petFriendly', search: false, valueEnum: PetFriendlyLabel },
    { title: '停车位', dataIndex: 'parkingAvailable', search: false, valueEnum: ParkingAvailableLabel },
    { title: '地址', dataIndex: 'address', search: false, ellipsis: true },
    {
      ...option,
      width:200,
      render: (_: any, record: any) => (
        <Space>
          <a onClick={() => openDishesDrawer(record)}>菜品</a>
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
            添加餐饮
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
            <DictSelect code="travel_dining_nature" />
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

      <Drawer
        title={`${currentDiningName} - 菜品管理`}
        width="80vw"
        open={dishesDrawerOpen}
        onClose={() => setDishesDrawerOpen(false)}
        destroyOnClose
      >
        {currentDiningId && <DishesPanel diningId={currentDiningId} />}
      </Drawer>
    </>
  );
};

export default Dining;
