import React, { useRef, useState } from 'react';
import { Button, Drawer, Descriptions, Form, Input, InputNumber, Popconfirm, Select, Space, Tag, message } from 'antd';
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { TouristGenderLabel } from '@/enums';
import { get as getPreferenceApi } from '@/services/api/游客喜好管理/游客喜好管理';
import DictSelect from '@/components/DataSelect/DictSelect';
import { useDictMap } from '@/hooks/useDictMap';

const preferenceApi = getPreferenceApi();

const GENDER_OPTIONS = Object.entries(TouristGenderLabel).map(([value, label]) => ({ label, value }));

const TouristPreferences: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const request = useTableRequest(preferenceApi.list13 as any);
  const staminaMap = useDictMap('travel_stamina');
  const travelLikeMap = useDictMap('travel_tourist_like');
  const foodLikeMap = useDictMap('travel_food_like');
  const stayPrefMap = useDictMap('travel_stay_pref');
  const healthTagMap = useDictMap('travel_health_tag');

  const openEdit = (record: any) => {
    setCurrentRecord(record);
    const splitField = (v: any) => v ? String(v).split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    form.setFieldsValue({ ...record, travelLikes: splitField(record.travelLikes), foodLikes: splitField(record.foodLikes), stayPref: splitField(record.stayPref), healthTags: splitField(record.healthTags) });
    setDrawerOpen(true);
  };

  const openDetail = (record: any) => {
    setCurrentRecord(record);
    setDetailOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const joinField = (v: unknown) => Array.isArray(v) ? v.join(',') : v;
    const params = { ...values, travelLikes: joinField(values.travelLikes), foodLikes: joinField(values.foodLikes), stayPref: joinField(values.stayPref), healthTags: joinField(values.healthTags) };
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
    { title: '体力', dataIndex: 'stamina', search: false, render: (_: any, r: any) => staminaMap[r.stamina] ?? r.stamina ?? '--' },
    { title: '旅游喜好', dataIndex: 'travelLikes', search: false, ellipsis: true, render: (_: any, r: any) => r.travelLikes ? String(r.travelLikes).split(',').map(s => travelLikeMap[s.trim()] ?? s.trim()).join(', ') : '--' },
    { title: '美食喜好', dataIndex: 'foodLikes', search: false, ellipsis: true, render: (_: any, r: any) => r.foodLikes ? String(r.foodLikes).split(',').map(s => foodLikeMap[s.trim()] ?? s.trim()).join(', ') : '--' },
    { title: '住宿偏好', dataIndex: 'stayPref', search: false, ellipsis: true, render: (_: any, r: any) => r.stayPref ? String(r.stayPref).split(',').map(s => stayPrefMap[s.trim()] ?? s.trim()).join(', ') : '--' },
    { title: '健康标签', dataIndex: 'healthTags', search: false, ellipsis: true, render: (_: any, r: any) => r.healthTags ? String(r.healthTags).split(',').map(s => healthTagMap[s.trim()] ?? s.trim()).join(', ') : '--' },
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
            <DictSelect code="travel_stamina" />
          </Form.Item>
          <Form.Item name="travelLikes" label="旅游喜好">
            <DictSelect code="travel_tourist_like" mode="multiple" />
          </Form.Item>
          <Form.Item name="foodLikes" label="美食喜好">
            <DictSelect code="travel_food_like" mode="multiple" />
          </Form.Item>
          <Form.Item name="stayPref" label="住宿偏好">
            <DictSelect code="travel_stay_pref" mode="multiple" />
          </Form.Item>
          <Form.Item name="healthTags" label="健康标签">
            <DictSelect code="travel_health_tag" mode="multiple" />
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
            <Descriptions.Item label="体力等级">{staminaMap[currentRecord.stamina] ?? currentRecord.stamina ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="旅游喜好" span={2}>{currentRecord.travelLikes ? String(currentRecord.travelLikes).split(',').map(s => travelLikeMap[s.trim()] ?? s.trim()).join(', ') : '--'}</Descriptions.Item>
            <Descriptions.Item label="美食喜好" span={2}>{currentRecord.foodLikes ? String(currentRecord.foodLikes).split(',').map(s => foodLikeMap[s.trim()] ?? s.trim()).join(', ') : '--'}</Descriptions.Item>
            <Descriptions.Item label="住宿偏好" span={2}>{currentRecord.stayPref ? String(currentRecord.stayPref).split(',').map(s => stayPrefMap[s.trim()] ?? s.trim()).join(', ') : '--'}</Descriptions.Item>
            <Descriptions.Item label="健康标签" span={2}>{currentRecord.healthTags ? String(currentRecord.healthTags).split(',').map(s => healthTagMap[s.trim()] ?? s.trim()).join(', ') : '--'}</Descriptions.Item>
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
