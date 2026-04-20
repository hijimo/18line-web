# 租户管理设计文档

## 概述

租户管理功能是一个基于 React + TypeScript + Ant Design 的表格管理页面，用于管理平台中的所有租户。该功能采用 CommonTable 组件实现表格展示，使用 Drawer 抽屉组件实现创建和编辑表单，通过 React Query 进行数据管理和状态同步。

## 技术栈

- **UI 框架**: Ant Design 5.25
- **表格组件**: CommonTable（项目自定义组件）
- **状态管理**: React Query (TanStack Query) + Zustand
- **表单管理**: Ant Design Form
- **HTTP 请求**: 基于 orval 生成的 API 客户端
- **样式方案**: TailwindCSS + CSS Modules
- **类型系统**: TypeScript 5.8

## 架构设计

### 目录结构

```
src/pages/tenants/
├── index.tsx                          # 主页面入口
├── components/
│   ├── TenantTable/
│   │   └── index.tsx                  # 租户表格组件
│   └── Drawer/
│       ├── TenantCreateDrawer/
│       │   └── index.tsx              # 创建租户抽屉
│       └── TenantEditDrawer/
│           └── index.tsx              # 编辑租户抽屉
├── hooks/
│   └── useTenantManagement.ts         # 租户管理相关 hooks
└── types.ts                           # 页面相关类型定义
```

### 组件层次结构

```
TenantsPage (pages/tenants/index.tsx)
└── PageContainer
    └── TenantTable
        ├── CommonTable
        │   ├── 表格列定义
        │   ├── 搜索表单
        │   └── 工具栏
        ├── TenantCreateDrawer
        │   └── Form
        └── TenantEditDrawer
            └── Form
```

## 组件和接口设计

### 1. 主页面组件 (pages/tenants/index.tsx)

**职责**:

- 提供页面容器和面包屑导航
- 渲染租户表格组件

**实现要点**:

```tsx
import React from 'react'
import { PageContainer } from '@ant-design/pro-components'
import TenantTable from './components/TenantTable'

const TenantsPage: React.FC = () => {
  return (
    <PageContainer>
      <TenantTable />
    </PageContainer>
  )
}

export default TenantsPage
```

### 2. 租户表格组件 (components/TenantTable/index.tsx)

**职责**:

- 展示租户列表数据
- 提供搜索和筛选功能
- 处理创建、编辑、删除操作
- 管理抽屉组件的打开和关闭

**Props 接口**:

```typescript
interface TenantTableProps {
  // 无需额外 props，所有状态内部管理
}
```

**状态管理**:

- 使用 `useRef<ActionType>` 管理表格刷新
- 使用 `useRef` 管理抽屉组件引用
- 使用 React Query 管理数据请求和缓存

**核心功能**:

1. 表格列定义
2. 数据请求和分页
3. 搜索表单配置
4. 操作菜单（编辑、删除）
5. 抽屉组件调用

### 3. 创建租户抽屉 (components/Drawer/TenantCreateDrawer/index.tsx)

**职责**:

- 提供创建租户的表单界面
- 处理表单验证和提交
- 调用创建租户 API

**Ref 接口**:

```typescript
export type TenantCreateDrawerRef = {
  open: () => void
  close: () => void
}
```

**表单字段**:

- `name` (必填): 租户名称，1-255 字符
- `domain` (可选): 租户域名，最多 255 字符
- `metadata` (可选): 租户元数据，JSON 对象

**验证规则**:

- 租户名称：必填，长度 1-255
- 租户域名：可选，长度最多 255

### 4. 编辑租户抽屉 (components/Drawer/TenantEditDrawer/index.tsx)

**职责**:

- 提供编辑租户的表单界面
- 预填充现有租户数据
- 处理表单验证和提交
- 调用更新租户 API

**Ref 接口**:

```typescript
export type TenantEditDrawerRef = {
  open: (tenant: Tenant) => void
  close: () => void
}
```

**表单字段**:

- `name` (可选): 租户名称，1-255 字符
- `domain` (可选): 租户域名，最多 255 字符
- `status` (可选): 租户状态，布尔值
- `metadata` (可选): 租户元数据，JSON 对象

**验证规则**:

- 租户名称：如果提供，长度 1-255
- 租户域名：如果提供，长度最多 255

## 数据模型

### Tenant 类型

```typescript
interface Tenant {
  id?: string // 租户ID
  name?: string // 租户名称
  domain?: string // 租户域名
  type?: TenantType // 租户类型：system | tenant
  status?: boolean // 租户状态：true=启用，false=禁用
  metadata?: TenantMetadata // 租户元数据
  isDeleted?: boolean // 软删除标记
  createdAt?: string // 创建时间
  createdBy?: string // 创建者用户ID
  updatedAt?: string // 更新时间
}
```

### TenantType 枚举

```typescript
type TenantType = 'system' | 'tenant'
```

### API 请求参数

**获取租户列表**:

```typescript
interface GetTenantsParams {
  pageNo?: number // 页码
  pageSize?: number // 每页大小
  name?: string // 租户名称搜索
  type?: TenantType // 租户类型筛选
  status?: boolean // 状态筛选
}
```

**创建租户**:

```typescript
interface CreateTenantRequest {
  name: string // 必填
  domain?: string // 可选
  metadata?: CreateTenantRequestMetadata // 可选
  createdBy?: string // 可选
}
```

**更新租户**:

```typescript
interface UpdateTenantRequest {
  name?: string // 可选
  domain?: string // 可选
  status?: boolean // 可选
  metadata?: UpdateTenantRequestMetadata // 可选
}
```

## 表格列定义

### 列定义文件结构

列定义应该放在 `src/configurify/columns/` 目录下，采用模块化的方式组织：

```
src/configurify/columns/
├── baseColumns.tsx          # 基础通用列定义
└── tenantColumns.tsx        # 租户相关列定义
```

### 基础列定义 (baseColumns.tsx)

基础列定义包含项目中常用的通用列，如序号、状态、创建时间等：

```typescript
import React from 'react';
import type { ProColumns } from '@ant-design/pro-table';
import type { ProCoreActionType } from '@ant-design/pro-utils/es/typing';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { DATE_FORMAT_FULL_TIME } from '@/variables';
import { SwitchDesc } from '@/enums';

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
      return `${(action.pageInfo.current - 1) * action.pageInfo.pageSize + idx + 1}`;
    return 1;
  },
};

// 状态列
export const status: ProColumns<number> = {
  title: '状态',
  dataIndex: 'status',
  className: 'nowrap',
  valueEnum: SwitchDesc,
  search: false,
};

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
};

// 创建人列
export const creatorName: ProColumns<string> = {
  title: '创建人',
  dataIndex: 'creatorName',
  className: 'nowrap',
  hideInForm: true,
  width: 160,
  ellipsis: true,
  search: false,
};

// 更新时间列
export const updateTime: ProColumns<string> = {
  title: '更新时间',
  dataIndex: 'modified',
  className: 'nowrap',
  hideInForm: true,
  search: false,
  fixed: 'right',
};

// 创建时间范围搜索列
export const createdRangeTime: ProColumns<string> = {
  title: '创建起止日期',
  dataIndex: 'created',
  className: 'nowrap',
  hideInForm: true,
  hideInTable: true,
  renderFormItem: () => (
    <DatePicker.RangePicker showTime placeholder={['请选择', '请选择']} style={{ width: '100%' }} />
  ),
};

// 操作列
export const option: ProColumns<unknown> = {
  title: '操作',
  dataIndex: 'option',
  valueType: 'option',
  className: 'nowrap',
  fixed: 'right',
  width: 160,
};
```

### 租户列定义 (tenantColumns.tsx)

租户相关的列定义，包含租户特有的字段和业务逻辑：

```typescript
import React from 'react';
import type { ProColumns } from '@ant-design/pro-table';
import { Badge, Popconfirm, Select, Tag } from 'antd';
import ColumnEllipsisWrap from '@/components/CommonTable/ColumnEllipsisWrap';
import type { Tenant, TenantType } from '@/types';
import { createTime, creatorName, option } from './baseColumns';

// 租户名称列
export const tenantName: ProColumns<Tenant> = {
  title: '租户名称',
  dataIndex: 'name',
  className: 'nowrap',
  ellipsis: true,
  width: 200,
  search: true,
  fieldProps: {
    placeholder: '请输入租户名称',
  },
};

// 租户域名列
export const tenantDomain: ProColumns<Tenant> = {
  title: '租户域名',
  dataIndex: 'domain',
  className: 'nowrap',
  ellipsis: true,
  width: 200,
  search: false,
  render: (_, record) => {
    if (!record.domain) return <span>--</span>;
    return (
      <ColumnEllipsisWrap width={200}>
        <span>{record.domain}</span>
      </ColumnEllipsisWrap>
    );
  },
};

// 租户类型列（表格显示）
export const tenantType: ProColumns<Tenant> = {
  title: '租户类型',
  dataIndex: 'type',
  className: 'nowrap',
  width: 120,
  search: false,
  render: (_, record) => {
    const typeMap: Record<TenantType, { text: string; color: string }> = {
      system: { text: '平台租户', color: 'blue' },
      tenant: { text: '业务租户', color: 'green' },
    };
    const config = typeMap[record.type as TenantType] || { text: record.type, color: 'default' };
    return <Tag color={config.color}>{config.text}</Tag>;
  },
};

// 租户类型搜索列
export const tenantTypeSearch: ProColumns<Tenant> = {
  title: '租户类型',
  dataIndex: 'type',
  className: 'nowrap',
  hideInTable: true,
  renderFormItem: () => (
    <Select placeholder="请选择租户类型" allowClear>
      <Select.Option value="system">平台租户</Select.Option>
      <Select.Option value="tenant">业务租户</Select.Option>
    </Select>
  ),
};

// 租户状态列
export const tenantStatus: ProColumns<Tenant> = {
  title: '状态',
  dataIndex: 'status',
  className: 'nowrap',
  width: 100,
  valueType: 'select',
  fieldProps: {
    options: [
      { label: '启用', value: true },
      { label: '禁用', value: false },
    ],
  },
  render: (_, record) =>
    record.status ? (
      <Badge status="success" text="启用" />
    ) : (
      <Badge status="error" text="禁用" />
    ),
};

// 租户创建时间列（使用基础列定义并覆盖 dataIndex）
export const tenantCreateTime: ProColumns<Tenant> = {
  ...createTime,
  dataIndex: 'createdAt',
};

// 租户创建人列（使用基础列定义并覆盖 dataIndex）
export const tenantCreatorName: ProColumns<Tenant> = {
  ...creatorName,
  dataIndex: 'createdBy',
};

// 导出租户表格列配置
export const tenantColumns: Record<string, ProColumns<Tenant>> = {
  tenantName,
  tenantDomain,
  tenantType,
  tenantTypeSearch,
  tenantStatus,
  tenantCreateTime,
  tenantCreatorName,
  option,
};
```

### 列定义使用方式

在表格组件中使用列定义：

```typescript
import { tenantColumns } from '@/configurify/columns/tenantColumns';

// 在表格组件中使用
const columns = [
  tenantColumns.tenantName,
  tenantColumns.tenantDomain,
  tenantColumns.tenantType,
  tenantColumns.tenantStatus,
  tenantColumns.tenantCreateTime,
  tenantColumns.tenantCreatorName,
  {
    ...tenantColumns.option,
    render: (_, record: Tenant) => (
      <Space>
        <a onClick={() => handleEdit(record)}>编辑</a>
        <Popconfirm
          title="确认删除"
          description="删除后该租户将无法恢复，确认删除吗？"
          onConfirm={() => handleDelete(record.id)}
        >
          <a className="text-red-500">删除</a>
        </Popconfirm>
      </Space>
    ),
  },
];
```

### 列定义规范

1. **命名规范**:
   - 使用驼峰命名法
   - 列定义变量名应该清晰表达列的含义
   - 搜索专用列添加 `Search` 后缀

2. **类型安全**:
   - 使用 `ProColumns<T>` 泛型指定数据类型
   - 避免使用 `any` 类型

3. **复用性**:
   - 通用列定义放在 `baseColumns.tsx`
   - 业务特定列定义放在对应的业务列文件中
   - 使用展开运算符复用基础列定义

4. **配置项**:
   - `className: 'nowrap'`: 防止文本换行
   - `ellipsis: true`: 文本溢出显示省略号
   - `search: false`: 不在搜索表单中显示
   - `hideInTable: true`: 不在表格中显示（仅用于搜索）
   - `hideInForm: true`: 不在表单中显示
   - `fixed`: 固定列位置（'left' | 'right'）
   - `width`: 列宽度

5. **渲染优化**:
   - 使用 `renderText` 进行简单文本转换
   - 使用 `render` 进行复杂组件渲染
   - 使用 `ColumnEllipsisWrap` 组件处理长文本

6. **搜索表单**:
   - 搜索列使用 `renderFormItem` 自定义表单项
   - 表格显示列和搜索列分离定义
   - 使用 `fieldProps` 传递表单组件属性

## API 集成

### 使用 orval 生成的 API 客户端

```typescript
import { getTenantManagement } from '@/services/api/tenant-management/tenant-management'

const {
  getTenants, // 获取租户列表
  postTenants, // 创建租户
  getTenantsId, // 获取租户详情
  putTenantsId, // 更新租户
  deleteTenantsId, // 删除租户
} = getTenantManagement()
```

### React Query 集成

**查询租户列表**:

```typescript
const { data, isLoading, refetch } = useQuery({
  queryKey: ['tenants', params],
  queryFn: () => getTenants(params),
})
```

**创建租户**:

```typescript
const createMutation = useMutation({
  mutationFn: (data: CreateTenantRequest) => postTenants(data),
  onSuccess: () => {
    message.success('创建成功')
    refetch()
  },
  onError: (error) => {
    message.error('创建失败')
  },
})
```

**更新租户**:

```typescript
const updateMutation = useMutation({
  mutationFn: ({ id, data }: { id: string; data: UpdateTenantRequest }) =>
    putTenantsId({ id }, data),
  onSuccess: () => {
    message.success('更新成功')
    refetch()
  },
  onError: (error) => {
    message.error('更新失败')
  },
})
```

**删除租户**:

```typescript
const deleteMutation = useMutation({
  mutationFn: (id: string) => deleteTenantsId({ id }),
  onSuccess: () => {
    message.success('删除成功')
    refetch()
  },
  onError: (error) => {
    message.error('删除失败')
  },
})
```

## 错误处理

### 错误类型

1. **网络错误**: 请求失败、超时
2. **业务错误**: API 返回错误码
3. **验证错误**: 表单验证失败
4. **权限错误**: 无权限访问

### 错误处理策略

```typescript
const handleError = (error: unknown) => {
  if (error instanceof Error) {
    // 网络错误
    if (error.message.includes('Network')) {
      message.error('网络连接失败，请检查网络')
      return
    }

    // 权限错误
    if (error.message.includes('403')) {
      message.error('无权限执行此操作')
      return
    }

    // 其他错误
    message.error(error.message || '操作失败')
  } else {
    message.error('未知错误')
  }

  // 记录错误日志
  console.error('Tenant management error:', error)
}
```

## 测试策略

### 单元测试

1. **组件测试**:
   - 租户表格渲染测试
   - 搜索表单交互测试
   - 抽屉组件打开关闭测试

2. **Hook 测试**:
   - API 调用测试
   - 状态管理测试

3. **工具函数测试**:
   - 数据转换函数测试
   - 验证函数测试

### 集成测试

1. **端到端流程**:
   - 创建租户流程
   - 编辑租户流程
   - 删除租户流程
   - 搜索筛选流程

2. **错误场景**:
   - API 错误处理
   - 表单验证错误
   - 网络错误处理

## 性能优化

### 优化策略

1. **数据缓存**: 使用 React Query 缓存租户列表数据
2. **虚拟滚动**: 大数据量时使用虚拟滚动
3. **防抖搜索**: 搜索输入使用防抖处理
4. **懒加载**: 抽屉组件按需加载
5. **Memo 优化**: 使用 React.memo 优化组件渲染

### 代码分割

```typescript
// 懒加载抽屉组件
const TenantCreateDrawer = lazy(
  () => import('./components/Drawer/TenantCreateDrawer'),
)
const TenantEditDrawer = lazy(
  () => import('./components/Drawer/TenantEditDrawer'),
)
```

## 样式设计

### 主题配置

使用 Ant Design 主题系统和 TailwindCSS 工具类：

```typescript
// 表格样式
<CommonTable
  className="tenant-table"
  scroll={{ x: 'max-content' }}
  rowKey="id"
/>

// 抽屉样式
<Drawer
  width={600}
  bodyStyle={{ padding: '24px 0' }}
  destroyOnClose
/>
```

### 响应式设计

```typescript
// 移动端适配
const isMobile = useMediaQuery('(max-width: 768px)');

<Drawer
  width={isMobile ? '100%' : 600}
  placement={isMobile ? 'bottom' : 'right'}
/>
```

## 安全考虑

1. **权限验证**: 所有 API 请求需要管理员权限
2. **输入验证**: 前端表单验证 + 后端验证
3. **XSS 防护**: 使用 React 自动转义
4. **CSRF 防护**: 使用 token 验证
5. **敏感数据**: 不在前端存储敏感信息

## 可访问性

1. **键盘导航**: 支持 Tab 键导航
2. **屏幕阅读器**: 使用语义化 HTML 和 ARIA 属性
3. **焦点管理**: 抽屉打开时自动聚焦第一个输入框
4. **错误提示**: 清晰的错误信息和视觉反馈

## 国际化

虽然当前版本使用中文，但预留国际化支持：

```typescript
// 预留 i18n 支持
const t = (key: string) => {
  // 未来可以替换为 i18n 函数
  return key
}
```

## 部署注意事项

1. **环境变量**: 配置 API 基础 URL
2. **构建优化**: 启用代码压缩和 Tree Shaking
3. **CDN 部署**: 静态资源使用 CDN
4. **监控**: 集成错误监控和性能监控
