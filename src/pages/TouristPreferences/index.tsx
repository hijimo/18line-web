import React, { useRef, useState } from 'react';
import { Button, Drawer, Descriptions, Form, Input, InputNumber, Popconfirm, Select, Space, Tag, message } from 'antd';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { TouristGenderLabel, StaminaLabel } from '@/enums';
import { get as getPreferenceApi } from '@/services/api/游客喜好管理/游客喜好管理';

const preferenceApi = getPreferenceApi();

const GENDER_OPTIONS = Object.entries(TouristGenderLabel).map(([value, label]) => ({ label, value }));
const STAMINA_OPTIONS = Object.entries(StaminaLabel).map(([value, label]) => ({ label, value }));

const TouristPreferences: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const request = useTableRequest(preferenceApi.list13 as any);

  const openEdit = (record: any) => {
    setCurrentRecord(record);
    form.setFieldsValue({ ...record, healthTags: record.healthTags ? record.healthTags.split(',').map((s: string) => s.trim()).filter(Boolean) : [] });
    setDrawerOpen(true);
  };

  const openDetail = (record: any) => {
    setCurrentRecord(record);
    setDetailOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const params = { ...values, healthTags: Array.isArray(values.healthTags) ? values.healthTags.join(',') : values.healthTags };
    try {
      await preferenceApi.edit2({ ...params, preferenceId: currentRecord.preferenceId } as any);
      message.success('编辑成功');
      setDrawerOpen(false);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await preferenceApi.remove13({ preferenceIds: String(record.preferenceId) });
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    key,
    { title: '喜好ID', dataIndex: 'preferenceId', search: false, width: 80 },
    { title: '游客ID', dataIndex: 'touristId', width: 80 },
    {
      title: '性别',
      dataIndex: 'gender',
      search: false,
      render: (v: string) => {
        const label = TouristGenderLabel[v as keyof typeof TouristGenderLabel];
        return <Tag color={v === '2' ? 'pink' : v === '1' ? 'blue' : undefined}>{label ?? '--'}</Tag>;
      },
    },
    { title: '出生年', dataIndex: 'birthYear', search: false },
    {
      title: '体力',
      dataIndex: 'stamina',
      search: false,
      render: (v: string) => StaminaLabel[v as keyof typeof StaminaLabel] ?? '--',
    },
    { title: '旅游喜好', dataIndex: 'travelLikes', search: false, ellipsis: true },
    { title: '美食喜好', dataIndex: 'foodLikes', search: false, ellipsis: true },
    { title: '住宿偏好', dataIndex: 'stayPref', search: false, ellipsis: true },
    { title: '健康标签', dataIndex: 'healthTags', search: false, ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', search: false, width: 180 },
    {
      ...option,
      render: (_: any, record: any) => (
        <Space>
          <a onClick={() => openDetail(record)}>详情</a>
          <a onClick={() => openEdit(record)}>编辑</a>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record)}>
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
        request={request as any}
        columns={columns as any}
        toolBarRender={false}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
      />

      {/* 编辑抽屉 */}
      <Drawer
        title="编辑游客喜好"
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
          <Form.Item name="gender" label="性别">
            <Select placeholder="请选择" options={GENDER_OPTIONS} />
          </Form.Item>
          <Form.Item name="birthYear" label="出生年">
            <InputNumber placeholder="请输入" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="stamina" label="体力等级">
            <Select placeholder="请选择" options={STAMINA_OPTIONS} />
          </Form.Item>
          <Form.Item name="travelLikes" label="旅游喜好">
            <Input.TextArea placeholder="请输入" rows={2} />
          </Form.Item>
          <Form.Item name="foodLikes" label="美食喜好">
            <Input.TextArea placeholder="请输入" rows={2} />
          </Form.Item>
          <Form.Item name="stayPref" label="住宿偏好">
            <Input.TextArea placeholder="请输入" rows={2} />
          </Form.Item>
          <Form.Item name="healthTags" label="健康标签">
            <Select mode="tags" placeholder="请输入标签后回车" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="请输入" rows={2} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* 详情抽屉 */}
      <Drawer
        title="游客喜好详情"
        width={640}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        {currentRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="喜好ID">{currentRecord.preferenceId}</Descriptions.Item>
            <Descriptions.Item label="游客ID">{currentRecord.touristId}</Descriptions.Item>
            <Descriptions.Item label="行程ID">{currentRecord.tripId ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="性别">{TouristGenderLabel[currentRecord.gender as keyof typeof TouristGenderLabel] ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="出生年">{currentRecord.birthYear ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="体力等级">{StaminaLabel[currentRecord.stamina as keyof typeof StaminaLabel] ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="旅游喜好" span={2}>{currentRecord.travelLikes ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="美食喜好" span={2}>{currentRecord.foodLikes ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="住宿偏好" span={2}>{currentRecord.stayPref ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="健康标签" span={2}>{currentRecord.healthTags ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{currentRecord.createTime ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{currentRecord.updateTime ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>{currentRecord.remark ?? '--'}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </>
  );
};

export default TouristPreferences;
