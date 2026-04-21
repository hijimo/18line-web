import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, Space, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
// ActionType inferred from ProTable usage
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { get as getStayApi } from '@/services/api/住宿管理/住宿管理';
import UploadList from '@/components/Upload';

const stayApi = getStayApi();

const TYPE_OPTIONS = [
  { label: '酒店', value: '酒店' },
  { label: '民宿', value: '民宿' },
  { label: '客栈', value: '客栈' },
];

const YES_NO = [
  { label: '是', value: '是' },
  { label: '否', value: '否' },
];

type DrawerMode = 'add' | 'edit' | 'detail';

const Accommodation: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('add');
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);

  const request = useTableRequest(stayApi.list8 as any);

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
        await stayApi.addSave8(params as any);
        message.success('新增成功');
      } else {
        await stayApi.editSave8({ ...params, accommodationId: currentRecord.accommodationId } as any);
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
      await stayApi.editSave8({ accommodationId: record.accommodationId, status: newStatus } as any);
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
    { title: '地址', dataIndex: 'address', search: false, ellipsis: true },
    {
      title: '类型',
      dataIndex: 'type',
      valueEnum: TYPE_OPTIONS.reduce((acc, opt) => ({ ...acc, [opt.value]: { text: opt.label } }), {}),
    },
    { title: '早餐', dataIndex: 'hasBreakfast', search: false, render: (v: boolean) => v ? <Tag color="blue">含</Tag> : <Tag>不含</Tag> },
    { title: '联系电话', dataIndex: 'phone', search: false },
    { title: '地点', dataIndex: 'location', search: false },
    { title: '宠物', dataIndex: 'petFriendly', search: false, render: (v: boolean) => v ? <Tag color="green">可</Tag> : <Tag>不可</Tag> },
    { title: '价格区间', dataIndex: 'priceRange', search: false },
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
            +新增
          </Button>,
        ]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
      />

      <Drawer
        title={drawerMode === 'add' ? '新增住宿' : drawerMode === 'edit' ? '编辑住宿' : '住宿详情'}
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
          <Form.Item name="name" label="酒店名称" rules={[{ required: true, message: '请输入酒店名称' }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Select placeholder="请选择" options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="hasBreakfast" label="是否含早餐">
            <Select placeholder="请选择" options={YES_NO} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
          <Form.Item name="petFriendly" label="可否带宠物">
            <Select placeholder="请选择" options={[{ label: '否', value: '否' }, { label: '是', value: '是' }]} />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="priceMin" label="最低价格" style={{ width: '50%' }}>
              <InputNumber placeholder="请输入" addonAfter="元" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="priceMax" label="最高价格" style={{ width: '50%' }}>
              <InputNumber placeholder="请输入" addonAfter="元" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
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

export default Accommodation;