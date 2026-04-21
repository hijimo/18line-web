import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, Select, Switch, DatePicker, Descriptions, Space, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
// ActionType inferred from ProTable usage
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { get as getRouteApi } from '@/services/api/线路管理/线路管理';
import UploadList from '@/components/Upload';

const routeApi = getRouteApi();

const MODE_OPTIONS = ['全明', '半盲', '全盲'];

type DrawerMode = 'add' | 'edit' | 'detail';

const Routes: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('add');
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);

  const request = useTableRequest(routeApi.list2 as any);

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
        await routeApi.addSave2(params as any);
        message.success('新增成功');
      } else {
        await routeApi.editSave2({ ...params, lineId: currentRecord.lineId } as any);
        message.success('编辑成功');
      }
      setDrawerOpen(false);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const isReadOnly = drawerMode === 'detail';

  const columns = [
    key,
    { title: '昵称', dataIndex: 'nickname', ellipsis: true },
    { title: '手机号', dataIndex: 'phone', search: false },
    {
      title: '性别',
      dataIndex: 'gender',
      search: false,
      render: (v: string) => <Tag color={v === '女' ? 'pink' : 'blue'}>{v || '--'}</Tag>,
    },
    { title: '地点', dataIndex: 'location' },
    { title: '游玩时间', dataIndex: 'travelTime', search: false, width: 180 },
    {
      title: '是否亲子',
      dataIndex: 'isFamily',
      search: false,
      render: (v: boolean) => v ? <Tag color="blue">是</Tag> : <Tag>否</Tag>,
    },
    {
      title: '旅游模式',
      dataIndex: 'travelMode',
      search: false,
      render: (v: string) => v ? <Tag color={v === '全盲' ? 'red' : v === '半盲' ? 'orange' : 'green'}>{v}</Tag> : '--',
    },
    {
      ...option,
      render: (_: any, record: any) => (
        <Space>
          <a onClick={() => openDrawer('detail', record)}>详情</a>
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
            +线路
          </Button>,
        ]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
      />

      <Drawer
        title={drawerMode === 'add' ? '新增线路' : drawerMode === 'edit' ? '编辑线路' : '线路详情'}
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
        {isReadOnly && currentRecord ? (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="昵称">{currentRecord.nickname}</Descriptions.Item>
            <Descriptions.Item label="手机号">{currentRecord.phone}</Descriptions.Item>
            <Descriptions.Item label="性别">{currentRecord.gender}</Descriptions.Item>
            <Descriptions.Item label="地点">{currentRecord.location}</Descriptions.Item>
            <Descriptions.Item label="游玩时间">{currentRecord.travelTime}</Descriptions.Item>
            <Descriptions.Item label="是否亲子">{currentRecord.isFamily ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="旅游模式">{currentRecord.travelMode}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item name="name" label="线路名称" rules={[{ required: true, message: '请输入线路名称' }]}>
              <Input placeholder="请输入" />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea placeholder="请输入" rows={3} />
            </Form.Item>
            <Form.Item name="location" label="地点">
              <Select placeholder="请选择" />
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
        )}
      </Drawer>
    </>
  );
};

export default Routes;