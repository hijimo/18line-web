import React, { useRef, useState } from 'react';
import { Button, Drawer, Descriptions, Space, Tag } from 'antd';
// ActionType inferred from ProTable usage
import CommonTable from '@/components/CommonTable';
import { useTableRequest } from '@/hooks/useTableRequest';
import { key, option } from '@/configurify/columns/baseColumns';
import { get as getTouristApi } from '@/services/api/游客管理/游客管理';

const touristApi = getTouristApi();

const STRENGTH_OPTIONS = ['弱', '一般', '强', '运动员级'];
const MODE_OPTIONS = ['全明', '半盲', '全盲'];

const Users: React.FC = () => {
  const actionRef = useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);

  const request = useTableRequest(touristApi.list11 as any);

  const openDetail = (record: any) => {
    setCurrentRecord(record);
    setDrawerOpen(true);
  };

  const columns = [
    key,
    { title: '会员ID', dataIndex: 'touristId', search: false },
    { title: '昵称', dataIndex: 'nickname', ellipsis: true },
    { title: '手机号', dataIndex: 'phone', search: false },
    {
      title: '性别',
      dataIndex: 'gender',
      search: false,
      render: (v: string) => <Tag color={v === '女' ? 'pink' : 'blue'}>{v || '--'}</Tag>,
    },
    { title: '出生年', dataIndex: 'birthYear', search: false },
    { title: '注册时间', dataIndex: 'registerTime', search: false, width: 180 },
    {
      title: '体力值',
      dataIndex: 'physicalStrength',
      search: false,
      render: (v: string) => v || '--',
    },
    { title: '最近游玩路线', dataIndex: 'recentRoute', search: false, ellipsis: true },
    { title: '游玩日期', dataIndex: 'travelDate', search: false, width: 180 },
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
          <a onClick={() => openDetail(record)}>详情</a>
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

      <Drawer
        title="用户详情"
        width={640}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {currentRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="会员ID">{currentRecord.touristId}</Descriptions.Item>
            <Descriptions.Item label="昵称">{currentRecord.nickname}</Descriptions.Item>
            <Descriptions.Item label="手机号">{currentRecord.phone}</Descriptions.Item>
            <Descriptions.Item label="性别">{currentRecord.gender}</Descriptions.Item>
            <Descriptions.Item label="出生年">{currentRecord.birthYear}</Descriptions.Item>
            <Descriptions.Item label="注册时间">{currentRecord.registerTime}</Descriptions.Item>
            <Descriptions.Item label="体力值">{currentRecord.physicalStrength}</Descriptions.Item>
            <Descriptions.Item label="最近游玩路线">{currentRecord.recentRoute}</Descriptions.Item>
            <Descriptions.Item label="游玩日期">{currentRecord.travelDate}</Descriptions.Item>
            <Descriptions.Item label="旅游模式">{currentRecord.travelMode}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </>
  );
};

export default Users;