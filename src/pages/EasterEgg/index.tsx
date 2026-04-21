import React, { useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, Space, Tag, Popconfirm, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
// ActionType inferred from ProTable usage
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { get as getEasterEggApi } from '@/services/api/彩蛋管理/彩蛋管理';
import UploadList from '@/components/Upload';

const easterEggApi = getEasterEggApi();

const STAR_OPTIONS = [
  { label: '1星', value: 1 },
  { label: '2星', value: 2 },
  { label: '3星', value: 3 },
  { label: '4星', value: 4 },
  { label: '5星', value: 5 },
];

const TAG_OPTIONS = ['室内寻宝', '老街寻人', '自然探索', '文化体验'];

type DrawerMode = 'add' | 'edit' | 'detail';

const EasterEgg: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('add');
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [prizeFileList, setPrizeFileList] = useState<any[]>([]);

  const request = useTableRequest(easterEggApi.list as any);

  const openDrawer = (mode: DrawerMode, record?: any) => {
    setDrawerMode(mode);
    setCurrentRecord(record || null);
    if (record) {
      form.setFieldsValue(record);
      setFileList(record.images || []);
      setPrizeFileList(record.prizeImage ? [record.prizeImage] : []);
    } else {
      form.resetFields();
      setFileList([]);
      setPrizeFileList([]);
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const params = {
      ...values,
      images: fileList.map((f) => f.url),
      prizeImage: prizeFileList.length > 0 ? prizeFileList[0].url : '',
    };
    try {
      if (drawerMode === 'add') {
        await easterEggApi.add(params as any);
        message.success('新增成功');
      } else {
        await easterEggApi.edit({ ...params, easterEggId: currentRecord.easterEggId } as any);
        message.success('编辑成功');
      }
      setDrawerOpen(false);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await easterEggApi.remove({ easterEggId: record.easterEggId } as any);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const isReadOnly = drawerMode === 'detail';

  const columns = [
    key,
    { title: '彩蛋主题', dataIndex: 'theme', ellipsis: true },
    { title: '难度', dataIndex: 'difficulty', search: false, render: (v: number) => v ? `${v}星` : '--' },
    { title: '类型标签', dataIndex: 'typeTags', search: false, render: (v: string[]) => v?.map((t) => <Tag key={t}>{t}</Tag>) || '--' },
    { title: '剧本说明', dataIndex: 'description', search: false, ellipsis: true },
    { title: '奖品名称', dataIndex: 'prizeName', search: false },
    { title: '剩余数量', dataIndex: 'remainingCount', search: false },
    {
      ...option,
      width: 200,
      render: (_: any, record: any) => (
        <Space>
          <a onClick={() => openDrawer('detail', record)}>详情</a>
          <a onClick={() => openDrawer('edit', record)}>编辑</a>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record)}>
            <a style={{ color: '#ff4d4f' }}>删除</a>
          </Popconfirm>
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
            +彩蛋
          </Button>,
        ]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
      />

      <Drawer
        title={drawerMode === 'add' ? '新增彩蛋' : drawerMode === 'edit' ? '编辑彩蛋' : '彩蛋详情'}
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
          <Form.Item name="theme" label="彩蛋主题" rules={[{ required: true, message: '请输入彩蛋主题' }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="description" label="彩蛋说明">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
          <Form.Item name="difficulty" label="难度">
            <Select placeholder="请选择" options={STAR_OPTIONS} />
          </Form.Item>
          <Form.Item name="typeTags" label="类型标签">
            <Select placeholder="请选择" options={TAG_OPTIONS.map((t) => ({ label: t, value: t }))} mode="multiple" />
          </Form.Item>
          <Form.Item name="clue" label="线索">
            <Input.TextArea placeholder="请输入" rows={2} />
          </Form.Item>
          <Form.Item name="answer" label="答案">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="prizeName" label="奖品名称">
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="remainingCount" label="剩余数量">
            <InputNumber placeholder="请输入" addonAfter="份" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="奖品图">
            <UploadList
              fileList={prizeFileList}
              onChange={setPrizeFileList as any}
              maxLength={1}
              uploadText="上传"
              accept="image/png,image/jpeg,image/gif"
            />
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

export default EasterEgg;