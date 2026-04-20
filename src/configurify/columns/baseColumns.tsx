import React from 'react'
import type { ProColumns } from '@ant-design/pro-table'
import type { ProCoreActionType } from '@ant-design/pro-utils/es/typing'
import { DatePicker } from 'antd'
import dayjs from 'dayjs'
import { DATE_FORMAT_FULL_TIME } from '@/variables'
import { SwitchDesc } from '@/enums'

// 序号列
export const key: ProColumns<number> = {
  title: '序号',
  dataIndex: 'key',
  fixed: 'left',
  className: 'nowrap',
  hideInForm: true,
  search: false,
  width: 60,
  renderText(text, record, idx, action: ProCoreActionType) {
    if (action && action.pageInfo)
      return `${(action.pageInfo.current - 1) * action.pageInfo.pageSize + idx + 1}`
    return 1
  },
}

// 状态列
export const status: ProColumns<number> = {
  title: '状态',
  dataIndex: 'status',
  className: 'nowrap',
  valueEnum: SwitchDesc,
  search: false,
}

// 创建时间列
export const createTime: ProColumns<string> = {
  title: '创建时间',
  dataIndex: 'created',
  className: 'nowrap',
  hideInForm: true,
  search: false,
  width: 180,
  sorter: true,
  renderText: (_) => (_ ? dayjs(_).format(DATE_FORMAT_FULL_TIME) : '--'),
}

// 创建人列
export const creatorName: ProColumns<string> = {
  title: '创建人',
  dataIndex: 'creatorName',
  className: 'nowrap',
  hideInForm: true,
  width: 160,
  ellipsis: true,
  search: false,
}

// 更新时间列
export const updateTime: ProColumns<string> = {
  title: '更新时间',
  dataIndex: 'modified',
  className: 'nowrap',
  hideInForm: true,
  search: false,
  fixed: 'right',
}

// 创建时间范围搜索列
export const createdRangeTime: ProColumns<string> = {
  title: '创建起止日期',
  dataIndex: 'created',
  className: 'nowrap',
  hideInForm: true,
  hideInTable: true,
  renderFormItem: () => (
    <DatePicker.RangePicker
      showTime
      placeholder={['请选择', '请选择']}
      style={{ width: '100%' }}
    />
  ),
}

// 操作列
export const option: ProColumns<unknown> = {
  title: '操作',
  dataIndex: 'option',
  valueType: 'option',
  className: 'nowrap',
  fixed: 'right',
  width: 160,
}
