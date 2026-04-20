import React, { useCallback, useRef } from 'react'
import { Button, Card, Space, Table, Tag, message } from 'antd'
import type { TableProps } from 'antd'
import { EyeOutlined, PlusOutlined } from '@ant-design/icons'
import { useRequest } from 'ahooks'
import clsx from 'clsx'

import styles from './index.module.css'

// 角色数据类型定义
interface RoleData {
  id: string
  name: string
  description: string
  createdAt: string
}

// 角色管理页面
const RoleManagement: React.FC = () => {
  // 获取角色列表数据
  const { data, loading, refresh } = useRequest(
    async () => {
      // TODO: 替换为实际的 API 调用
      // return await api.getRoles();

      // 模拟数据
      return {
        data: [
          {
            id: '1',
            name: '超级管理员',
            description: '拥有系统所有权限',
            createdAt: '2024-01-15 10:30:00',
          },
          {
            id: '2',
            name: '普通管理员',
            description: '拥有部分管理权限',
            createdAt: '2024-01-16 14:20:00',
          },
          {
            id: '3',
            name: '普通用户',
            description: '基础用户权限',
            createdAt: '2024-01-17 09:15:00',
          },
        ],
        total: 3,
      }
    },
    {
      onError: (error) => {
        message.error('获取角色列表失败')
        console.error(error)
      },
    },
  )

  // 查看权限详情
  const handleViewPermissions = useCallback((record: RoleData) => {
    message.info(`查看角色"${record.name}"的权限详情`)
    // TODO: 实现权限详情查看逻辑
    console.log('查看权限详情:', record)
  }, [])

  // 编辑角色
  const handleEdit = useCallback((record: RoleData) => {
    message.info(`编辑角色"${record.name}"`)
    // TODO: 实现编辑逻辑
    console.log('编辑角色:', record)
  }, [])

  // 删除角色
  const handleDelete = useCallback((record: RoleData) => {
    message.info(`删除角色"${record.name}"`)
    // TODO: 实现删除逻辑
    console.log('删除角色:', record)
  }, [])

  // 创建新角色
  const handleCreate = useCallback(() => {
    message.info('创建新角色')
    // TODO: 实现创建逻辑
    console.log('创建新角色')
  }, [])

  // 表格列定义
  const columns: TableProps<RoleData>['columns'] = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '角色描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewPermissions(record)}
          >
            查看权限详情
          </Button>
          <Button type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleDelete(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className={clsx(styles.page, 'min-h-screen bg-gray-50 p-6')}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">角色管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          创建角色
        </Button>
      </div>

      <Card>
        <Table<RoleData>
          columns={columns}
          dataSource={data?.data}
          loading={loading}
          rowKey="id"
          pagination={{
            total: data?.total,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>
    </div>
  )
}

export default RoleManagement
