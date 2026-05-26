import { PlusOutlined } from '@ant-design/icons';
import { Button, Drawer, Form, Input, InputNumber, message, Popconfirm, Select, Space } from 'antd';
import React, { useRef, useState } from 'react';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { get as getDictDataApi } from '@/services/api/字典数据/字典数据';
import { get as getDictTypeApi } from '@/services/api/字典类型/字典类型';

const dictTypeApi = getDictTypeApi();
const dictDataApi = getDictDataApi();

const STATUS_OPTIONS = [
  { label: '正常', value: '0' },
  { label: '停用', value: '1' },
];
const STATUS_ENUM: Record<string, { text: string; status: string }> = {
  '0': { text: '正常', status: 'Success' },
  '1': { text: '停用', status: 'Error' },
};

const DictType: React.FC = () => {
  const actionRef = useRef<TODO>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<TODO>(null);
  const [form] = Form.useForm();

  // 字典数据相关状态
  const dataActionRef = useRef<TODO>(null);
  const [dataDrawerOpen, setDataDrawerOpen] = useState(false);
  const [currentDictType, setCurrentDictType] = useState<string>('');
  const [currentDataRecord, setCurrentDataRecord] = useState<TODO>(null);
  const [dataForm] = Form.useForm();

  const request = useTableRequest(dictTypeApi.list26 as TODO);

  // ========== 字典类型 CRUD ==========

  const openDrawer = (record?: TODO) => {
    setCurrentRecord(record || null);
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (currentRecord) {
        await dictTypeApi.edit8({ ...values, dictId: currentRecord.dictId } as TODO);
        message.success('编辑成功');
      } else {
        await dictTypeApi.add9(values as TODO);
        message.success('新增成功');
      }
      setDrawerOpen(false);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (record: TODO) => {
    try {
      await dictTypeApi.remove20({ dictIds: record.dictId } as TODO);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  // ========== 字典数据 CRUD ==========

  const openDataDrawer = (dictType: string) => {
    setCurrentDictType(dictType);
    setDataDrawerOpen(true);
    // 延迟刷新，等抽屉渲染
    setTimeout(() => dataActionRef.current?.reload(), 100);
  };

  const dataRequest = useTableRequest(dictDataApi.list27 as TODO, undefined, () => ({
    dictType: currentDictType,
  }));

  const [dataEditOpen, setDataEditOpen] = useState(false);

  const openDataEdit = (record?: TODO) => {
    setCurrentDataRecord(record || null);
    if (record) {
      dataForm.setFieldsValue(record);
    } else {
      dataForm.resetFields();
      dataForm.setFieldsValue({ dictType: currentDictType });
    }
    setDataEditOpen(true);
  };

  const handleDataSubmit = async () => {
    const values = await dataForm.validateFields();
    try {
      if (currentDataRecord) {
        await dictDataApi.edit9({ ...values, dictCode: currentDataRecord.dictCode } as TODO);
        message.success('编辑成功');
      } else {
        await dictDataApi.add10(values as TODO);
        message.success('新增成功');
      }
      setDataEditOpen(false);
      dataActionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDataDelete = async (record: TODO) => {
    try {
      await dictDataApi.remove21({ dictCodes: record.dictCode } as TODO);
      message.success('删除成功');
      dataActionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  // ========== 列定义 ==========

  const columns = [
    key,
    { title: '字典名称', dataIndex: 'dictName', ellipsis: true },
    {
      title: '字典类型',
      dataIndex: 'dictType',
      ellipsis: true,
      render: (v: string) => <a onClick={() => openDataDrawer(v)}>{v}</a>,
    },
    { title: '状态', dataIndex: 'status', search: false, valueEnum: STATUS_ENUM },
    { title: '备注', dataIndex: 'remark', search: false, ellipsis: true },
    {
      ...option,
      render: (_: TODO, record: TODO) => (
        <Space>
          <a onClick={() => openDrawer(record)}>编辑</a>
          <a onClick={() => openDataDrawer(record.dictType)}>字典数据</a>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record)}>
            <a>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const dataColumns = [
    key,
    { title: '字典标签', dataIndex: 'dictLabel', ellipsis: true },
    { title: '字典键值', dataIndex: 'dictValue', search: false },
    { title: '排序', dataIndex: 'dictSort', search: false, width: 80 },
    { title: '状态', dataIndex: 'status', search: false, valueEnum: STATUS_ENUM },
    { title: '备注', dataIndex: 'remark', search: false, ellipsis: true },
    {
      ...option,
      render: (_: TODO, record: TODO) => (
        <Space>
          <a onClick={() => openDataEdit(record)}>编辑</a>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDataDelete(record)}>
            <a>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <CommonTable
        actionRef={actionRef}
        request={request as TODO}
        columns={columns as TODO}
        toolBarRender={() => [
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            +字典类型
          </Button>,
        ]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
      />

      {/* 字典类型编辑抽屉 */}
      <Drawer
        title={currentRecord ? '编辑字典类型' : '新增字典类型'}
        width={480}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>
              确定
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="dictName"
            label="字典名称"
            rules={[{ required: true, message: '请输入字典名称' }]}
          >
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item
            name="dictType"
            label="字典类型"
            rules={[
              { required: true, message: '请输入字典类型' },
              {
                pattern: /^[a-z][a-z0-9_]*$/,
                message: '小写字母开头，仅允许小写字母、数字、下划线',
              },
            ]}
          >
            <Input placeholder="如 sys_normal_disable" disabled={!!currentRecord} />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="0">
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="请输入" rows={3} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* 字典数据列表抽屉 */}
      <Drawer
        title={`字典数据 - ${currentDictType}`}
        width={800}
        open={dataDrawerOpen}
        onClose={() => setDataDrawerOpen(false)}
      >
        <CommonTable
          actionRef={dataActionRef}
          request={dataRequest as TODO}
          columns={dataColumns as TODO}
          toolBarRender={() => [
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openDataEdit()}>
              +字典数据
            </Button>,
          ]}
          search={false}
        />

        {/* 字典数据编辑抽屉 */}
        <Drawer
          title={currentDataRecord ? '编辑字典数据' : '新增字典数据'}
          width={480}
          open={dataEditOpen}
          onClose={() => setDataEditOpen(false)}
          extra={
            <Space>
              <Button onClick={() => setDataEditOpen(false)}>取消</Button>
              <Button type="primary" onClick={handleDataSubmit}>
                确定
              </Button>
            </Space>
          }
        >
          <Form form={dataForm} layout="vertical">
            <Form.Item name="dictType" label="字典类型">
              <Input disabled />
            </Form.Item>
            <Form.Item
              name="dictLabel"
              label="字典标签"
              rules={[{ required: true, message: '请输入字典标签' }]}
            >
              <Input placeholder="请输入" />
            </Form.Item>
            <Form.Item
              name="dictValue"
              label="字典键值"
              rules={[{ required: true, message: '请输入字典键值' }]}
            >
              <Input placeholder="请输入" />
            </Form.Item>
            <Form.Item name="dictSort" label="排序" initialValue={0}>
              <InputNumber placeholder="请输入" min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="cssClass" label="样式属性">
              <Input placeholder="请输入" />
            </Form.Item>
            <Form.Item name="listClass" label="回显样式" initialValue="default">
              <Select
                options={[
                  { label: '默认', value: 'default' },
                  { label: '主要', value: 'primary' },
                  { label: '成功', value: 'success' },
                  { label: '信息', value: 'info' },
                  { label: '警告', value: 'warning' },
                  { label: '危险', value: 'danger' },
                ]}
              />
            </Form.Item>
            <Form.Item name="status" label="状态" initialValue="0">
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item name="remark" label="备注">
              <Input.TextArea placeholder="请输入" rows={3} />
            </Form.Item>
          </Form>
        </Drawer>
      </Drawer>
    </>
  );
};

export default DictType;
