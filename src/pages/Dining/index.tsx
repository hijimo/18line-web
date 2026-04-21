import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, Switch, Space, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
// ActionType inferred from ProTable usage
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { get as getDiningApi } from '@/services/api/餐饮管理/餐饮管理';
import UploadList from '@/components/Upload';

const diningApi = getDiningApi();

type DrawerMode = 'add' | 'edit' | 'detail';

const Dining: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('add');
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);

  const request = useTableRequest(diningApi.list4 as any);

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
        await diningApi.addSave4(params as any);
        message.success('新增成功');
      } else {
        await diningApi.editSave4({ ...params, diningId: currentRecord.diningId } as any);
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
      await diningApi.editSave4({ diningId: record.diningId, status: newStatus } as any);
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
    { title: '必点菜', dataIndex: 'mustOrderDishes', search: false, ellipsis: true },
    { title: '人均', dataIndex: 'avgCostPerPerson', search: false, render: (v: number) => v ? `${v}元/位` : '--' },
    { title: '电话', dataIndex: 'phone', search: false },
    { title: '地址', dataIndex: 'address', search: false, ellipsis: true },
    { title: '地点', dataIndex: 'location', search: false },
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
        title={drawerMode === 'add' ? '新增餐饮' : drawerMode === 'edit' ? '编辑餐饮' : '餐饮详情'}
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
          <Form.Item name="name" label="餐厅名称" rules={[{ required: true, message: '请输入餐厅名称' }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="avgCost" label="人均消费">
            <InputNumber placeholder="请输入" addonAfter="元/位" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="advanceBooking" label="建议提前预约" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
          <Form.Item name="reputationScore" label="口碑评分">
            <InputNumber placeholder="请输入" min={0} max={5} addonAfter="分" style={{ width: '100%' }} />
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

export default Dining;