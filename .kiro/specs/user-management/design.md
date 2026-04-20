# 用户管理设计文档

## 概述

用户管理功能是一个完整的 CRUD 系统，用于管理系统用户的生命周期。该功能基于现有的租户管理实现模式，采用相同的技术栈和架构设计，确保代码风格和用户体验的一致性。

## 技术栈

- **UI 框架**: React 18.3 + TypeScript 5.8
- **UI 组件库**: Ant Design 5.25 + @ant-design/pro-components
- **状态管理**: React Query (TanStack Query) + Zustand
- **样式方案**: TailwindCSS 4.1 + CSS Modules
- **表单处理**: Ant Design Form
- **HTTP 客户端**: Axios (通过 orval-mutator 封装)

## 架构设计

### 目录结构

```
src/pages/users/
├── index.tsx                           # 用户管理主页面
├── index.module.css                    # 页面样式
├── types.ts                            # 类型定义
└── components/
    ├── Drawer/
    │   ├── UserCreateDrawer/
    │   │   ├── index.tsx              # 创建用户抽屉
    │   │   └── index.module.css       # 抽屉样式
    │   └── UserEditDrawer/
    │       ├── index.tsx              # 编辑用户抽屉
    │       └── index.module.css       # 抽屉样式
    └── Table/
        └── UserTable/
            ├── index.tsx              # 用户表格组件
            └── index.module.css       # 表格样式

src/configurify/columns/
└── userColumns.tsx                     # 用户表格列配置
```

### 组件层次结构

```
UsersPage (页面容器)
└── UserTable (表格组件)
    ├── CommonTable (通用表格组件)
    ├── UserCreateDrawer (创建抽屉)
    └── UserEditDrawer (编辑抽屉)
```

## 组件设计

### 1. UsersPage (主页面)

**职责**:

- 作为用户管理功能的入口页面
- 使用 PageContainer 提供统一的页面布局
- 渲染 UserTable 组件

**实现要点**:

- 使用 `@ant-design/pro-components` 的 PageContainer
- 保持简洁，所有业务逻辑在 UserTable 中处理
- 参考租户管理的 `pages/tenants/index.tsx` 实现

### 2. UserTable (用户表格)

**职责**:

- 展示用户列表数据
- 处理分页、搜索、筛选
- 管理创建、编辑、删除、状态切换操作
- 协调 Drawer 组件的打开和关闭

**Props**:

```typescript
export interface UserTableProps {
  // 预留接口以便未来扩展
}
```

**State 管理**:

- 使用 `useRef` 管理 ActionType 和 Drawer 的 ref
- 使用 React Query 的 `useMutation` 处理删除和状态更新
- 使用 `useTableRequest` hook 处理表格数据请求

**核心功能**:

1. **数据获取**: 通过 `useTableRequest` hook 调用 `getUsers` API
2. **创建用户**: 打开 UserCreateDrawer
3. **编辑用户**: 打开 UserEditDrawer 并传入用户数据
4. **删除用户**: 显示确认对话框后调用 `deleteUsersId` API
5. **状态切换**: 显示确认对话框后调用 `patchUsersIdStatus` API
6. **权限控制**: 根据用户角色显示/隐藏租户筛选功能

**实现要点**:

- 参考 `pages/tenants/components/Table/TenantTable/index.tsx`
- 使用 `CommonTable` 组件作为基础表格
- 使用 `OptionMenu` 组件渲染操作列
- 使用 `Popconfirm` 组件确认删除和状态切换操作
- 操作成功后调用 `actionRef.current?.reload()` 刷新表格

### 3. UserCreateDrawer (创建用户抽屉)

**职责**:

- 提供创建用户的表单界面
- 验证表单输入
- 调用创建用户 API
- 处理成功和失败状态

**Ref 接口**:

```typescript
export interface UserCreateDrawerRef {
  open: () => void
  close: () => void
}
```

**Props**:

```typescript
type UserCreateDrawerProps = {
  onSuccess?: () => void
}
```

**表单字段**:

1. **邮箱** (email) - 必填，邮箱格式验证
2. **密码** (password) - 必填，最少 8 个字符
3. **显示名称** (displayName) - 可选
4. **手机号** (phone) - 可选
5. **租户** (tenantId) - 平台管理员必填，租户管理员自动填充
6. **是否管理员** (isAdmin) - 可选，Radio 组件
7. **角色** (roles) - 可选，Select 多选组件
8. **元数据** (meta) - 可选，TextArea，JSON 格式

**实现要点**:

- 参考 `pages/tenants/components/Drawer/TenantCreateDrawer/index.tsx`
- 使用 `forwardRef` 和 `useImperativeHandle` 暴露 open/close 方法
- 使用 `Form.useForm()` 管理表单状态
- 使用 `useMutation` 处理 API 请求
- 元数据字段需要 JSON 格式验证
- 根据用户角色显示/隐藏租户选择字段
- 表单提交时处理元数据的 JSON 解析

### 4. UserEditDrawer (编辑用户抽屉)

**职责**:

- 提供编辑用户的表单界面
- 预填充现有用户数据
- 验证表单输入
- 调用更新用户 API
- 处理成功和失败状态

**Ref 接口**:

```typescript
export interface UserEditDrawerRef {
  open: (user: User) => void
  close: () => void
}
```

**Props**:

```typescript
type UserEditDrawerProps = {
  onSuccess?: () => void
}
```

**表单字段**:

1. **租户信息** - 只读显示
2. **邮箱** (email) - 可选，邮箱格式验证
3. **显示名称** (displayName) - 可选
4. **手机号** (phone) - 可选
5. **用户状态** (isActive) - 可选，Radio 组件
6. **是否管理员** (isAdmin) - 可选，Radio 组件
7. **角色** (roles) - 可选，Select 多选组件
8. **元数据** (meta) - 可选，TextArea，JSON 格式

**实现要点**:

- 参考 `pages/tenants/components/Drawer/TenantEditDrawer/index.tsx`
- 使用 `forwardRef` 和 `useImperativeHandle` 暴露 open/close 方法
- 使用 `useState` 保存当前编辑的用户信息
- 打开抽屉时预填充表单数据
- 元数据字段需要将对象转换为 JSON 字符串显示
- 提交时需要将 JSON 字符串解析为对象
- 租户信息只读显示，使用 Badge 组件

## 数据模型

### User (用户实体)

```typescript
interface User {
  id?: string                      // 用户 ID
  email?: string                   // 用户邮箱
  displayName?: string             // 显示名称
  phone?: string                   // 手机号码
  isActive?: boolean               // 是否启用
  isAdmin?: boolean                // 是否为管理员
  roles?: string[]                 // 用户角色列表
  tenantId?: string                // 所属租户 ID
  meta?: UserMeta                  // 用户元数据
  emailVerified?: boolean          // 邮箱是否已验证
  failedLoginAttempts?: number     // 登录失败次数
  lastLoginAt?: string             // 最后登录时间
  lockedUntil?: string             // 账户锁定时间
  isDeleted?: boolean              // 软删除标记
  createdAt?: string               // 创建时间
  createdBy?: string               // 创建者用户 ID
  createdByName?: string           // 创建者显示名称
  updatedAt?: string               // 更新时间
}
```

### CreateUserRequest (创建用户请求)

```typescript
interface CreateUserRequest {
  email: string                    // 必填
  password: string                 // 必填，最少 8 个字符
  displayName?: string             // 可选
  phone?: string                   // 可选
  tenantId?: string                // 可选（租户管理员自动填充）
  isAdmin?: boolean                // 可选
  roles?: string[]                 // 可选
  meta?: UserMeta                  // 可选
}
```

### UpdateUserRequest (更新用户请求)

```typescript
interface UpdateUserRequest {
  email?: string                   // 可选
  displayName?: string             // 可选
  phone?: string                   // 可选
  isActive?: boolean               // 可选
  isAdmin?: boolean                // 可选
  roles?: string[]                 // 可选
  meta?: UserMeta                  // 可选
}
```

### UpdateUserStatusRequest (更新用户状态请求)

```typescript
interface UpdateUserStatusRequest {
  isActive: boolean                // 必填
}
```

## 表格列配置

### 列定义 (userColumns.tsx)

参考 `configurify/columns/tenantColumns.tsx` 和 `configurify/columns/baseColumns.tsx`，定义以下列：

1. **userEmail** - 用户邮箱（固定左侧，支持搜索）
2. **userDisplayName** - 显示名称
3. **userPhone** - 手机号码
4. **userRoles** - 用户角色（Tag 显示）
5. **userStatus** - 用户状态（Badge 显示）
6. **userTenant** - 所属租户（仅平台管理员可见）
7. **userIsAdmin** - 是否管理员（Tag 显示）
8. **userCreateTime** - 创建时间
9. **userCreatorName** - 创建人
10. **option** - 操作列（编辑、启用/禁用、删除）

**列配置示例**:

```typescript
export const userEmail: ProColumns<User> = {
  title: '用户邮箱',
  dataIndex: 'email',
  className: 'nowrap',
  ellipsis: true,
  width: 200,
  fixed: 'left',
  fieldProps: {
    placeholder: '请输入用户邮箱',
  },
  render: (_, record) => {
    if (!record.email) return <span>--</span>
    return (
      <ColumnEllipsisWrap width={180}>
        <span className="font-medium">{record.email}</span>
      </ColumnEllipsisWrap>
    )
  },
}
```

## API 集成

### API 服务

使用 `services/api/user-management/user-management.ts` 中的 API 方法：

```typescript
const { 
  getUsers,              // 获取用户列表
  postUsers,             // 创建用户
  getUsersId,            // 获取用户详情
  putUsersId,            // 更新用户
  deleteUsersId,         // 删除用户
  patchUsersIdStatus     // 更新用户状态
} = getUserManagement()
```

### 请求处理

**列表查询**:

```typescript
const fetchData = useTableRequest(
  getUsers as unknown as (params: Record<string, unknown>) => Promise<ResponsePaginationData>
)
```

**创建用户**:

```typescript
const { mutate: createUserMutate, isPending: isCreating } = useMutation({
  mutationFn: async (params: CreateUserRequest) => postUsers(params),
  onSuccess: (response) => {
    if (response.code === 200) {
      message.success('创建用户成功')
      props.onSuccess?.()
      setIsOpen(false)
      form.resetFields()
    } else {
      message.error(response.message || '创建用户失败')
    }
  },
  onError: (error: unknown) => {
    const errorMessage = handleError(error, '创建用户')
    message.error(errorMessage)
  },
})
```

**更新用户**:

```typescript
const { mutate: updateUserMutate, isPending: isUpdating } = useMutation({
  mutationFn: async (params: { id: string; data: UpdateUserRequest }) =>
    putUsersId({ id: params.id }, params.data),
  onSuccess: (response) => {
    if (response.code === 200) {
      message.success('更新用户成功')
      props.onSuccess?.()
      setIsOpen(false)
      form.resetFields()
    } else {
      message.error(response.message || '更新用户失败')
    }
  },
  onError: (error: unknown) => {
    const errorMessage = handleError(error, '更新用户')
    message.error(errorMessage)
  },
})
```

**删除用户**:

```typescript
const { mutate: deleteUserMutate } = useMutation({
  mutationFn: async (id: string) => deleteUsersId({ id }),
  onSuccess: (response) => {
    if (response.code === 200) {
      message.success('删除用户成功')
      actionRef.current?.reload()
    } else {
      message.error(response.message || '删除用户失败')
    }
  },
  onError: (error: unknown) => {
    const errorMessage = handleError(error, '删除用户')
    message.error(errorMessage)
  },
})
```

**更新用户状态**:

```typescript
const { mutate: updateStatusMutate } = useMutation({
  mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
    patchUsersIdStatus({ id }, { isActive }),
  onSuccess: (response, variables) => {
    if (response.code === 200) {
      message.success(`${variables.isActive ? '启用' : '禁用'}用户成功`)
      actionRef.current?.reload()
    } else {
      message.error(response.message || '更新用户状态失败')
    }
  },
  onError: (error: unknown) => {
    const errorMessage = handleError(error, '更新用户状态')
    message.error(errorMessage)
  },
})
```

## 错误处理

### 错误处理策略

使用 `utils/errorHandler.ts` 中的工具函数：

1. **handleError**: 处理 API 请求错误
2. **handleFormError**: 处理表单验证错误

**示例**:

```typescript
import { handleError, handleFormError } from '@/utils/errorHandler'

// API 错误处理
onError: (error: unknown) => {
  const errorMessage = handleError(error, '创建用户')
  message.error(errorMessage)
}

// 表单验证错误处理
onFinishFailed: (errorInfo) => {
  const errorMsg = handleFormError(errorInfo.errorFields)
  message.error(errorMsg)
  console.error('表单验证失败:', errorInfo)
}
```

### 错误类型

1. **网络错误**: 显示"网络错误，请检查网络连接"
2. **401 未授权**: 显示"未授权，请重新登录"
3. **403 权限不足**: 显示"没有权限访问"
4. **404 资源不存在**: 显示"请求的资源不存在"
5. **500 服务器错误**: 显示"服务器错误"
6. **表单验证错误**: 显示具体的字段错误信息
7. **JSON 解析错误**: 显示"元数据格式不正确，请输入有效的 JSON 格式"

## 表单验证

### 验证规则

**创建用户表单**:

```typescript
// 邮箱验证
{
  required: true,
  message: '请输入用户邮箱',
  type: 'email',
}

// 密码验证
{
  required: true,
  message: '请输入密码',
  min: 8,
  message: '密码长度不能少于 8 个字符',
}

// 租户验证（平台管理员）
{
  required: true,
  message: '请选择租户',
}
```

**编辑用户表单**:

```typescript
// 邮箱验证（可选）
{
  type: 'email',
  message: '请输入有效的邮箱地址',
}
```

**元数据验证**:

```typescript
// 在表单提交时验证
if (values.meta) {
  try {
    parsedMeta = JSON.parse(values.meta)
  } catch (error) {
    message.error('元数据格式不正确，请输入有效的 JSON 格式')
    return
  }
}
```

## 权限控制

### 角色定义

1. **Platform_Admin (平台管理员)**:
   - 可以查看所有租户的用户
   - 可以创建、编辑、删除任意租户的用户
   - 创建用户时必须选择租户
   - 可以使用租户筛选功能

2. **Tenant_Admin (租户管理员)**:
   - 只能查看自己租户下的用户
   - 只能创建、编辑、删除自己租户下的用户
   - 创建用户时自动使用当前租户 ID
   - 不显示租户筛选功能

### 权限实现

**租户筛选显示控制**:

```typescript
// 在表格列配置中
WHERE 用户是 Platform_Admin，THE userTenant 列 SHALL 显示
WHERE 用户是 Tenant_Admin，THE userTenant 列 SHALL 隐藏
```

**租户选择显示控制**:

```typescript
// 在创建用户抽屉中
WHERE 用户是 Platform_Admin，THE 租户选择字段 SHALL 显示且必填
WHERE 用户是 Tenant_Admin，THE 租户选择字段 SHALL 隐藏
```

**API 权限控制**:

- 后端 API 会自动验证用户权限
- 租户管理员的 tenantId 参数会被后端忽略并自动使用当前用户的租户 ID
- 如果权限不足，API 返回 403 错误

## 用户体验优化

### 加载状态

1. **表格加载**: CommonTable 自动处理加载状态
2. **按钮加载**: 使用 `isPending` 状态控制按钮的 loading 属性
3. **抽屉加载**: 提交按钮显示"创建中..."或"更新中..."文本

### 动画过渡

1. **抽屉打开/关闭**: Ant Design Drawer 自动处理动画
2. **表单重置**: 使用 `setTimeout` 延迟 100ms 确保抽屉已打开

### 用户反馈

1. **成功消息**: 使用 `message.success()` 显示操作成功
2. **错误消息**: 使用 `message.error()` 显示错误信息
3. **确认对话框**: 使用 `Popconfirm` 组件确认删除和状态切换操作
4. **表单验证**: 实时显示字段错误信息

### 响应式设计

1. **表格滚动**: 设置 `scroll={{ x: 1400, y: 'calc(100vh - 380px)' }}`
2. **列宽度**: 合理设置每列的宽度，确保内容完整显示
3. **文本省略**: 使用 `ColumnEllipsisWrap` 组件处理长文本

## 测试策略

### 单元测试

1. **组件渲染测试**: 验证组件正确渲染
2. **表单验证测试**: 验证表单验证规则
3. **API 调用测试**: 验证 API 调用参数和响应处理
4. **权限控制测试**: 验证不同角色的权限控制

### 集成测试

1. **创建用户流程**: 测试完整的创建用户流程
2. **编辑用户流程**: 测试完整的编辑用户流程
3. **删除用户流程**: 测试完整的删除用户流程
4. **状态切换流程**: 测试完整的状态切换流程

### E2E 测试

1. **用户管理完整流程**: 测试从列表查看到创建、编辑、删除的完整流程
2. **权限控制验证**: 测试不同角色的权限控制
3. **错误处理验证**: 测试各种错误场景的处理

## 性能优化

### 代码优化

1. **使用 useCallback**: 缓存事件处理函数
2. **使用 useMemo**: 缓存表格列配置
3. **使用 React.memo**: 优化子组件渲染（如需要）

### 数据优化

1. **分页加载**: 使用分页减少单次数据量
2. **React Query 缓存**: 利用 React Query 的缓存机制
3. **防抖搜索**: 搜索输入使用防抖优化

### 渲染优化

1. **虚拟滚动**: 表格自动支持虚拟滚动
2. **按需加载**: 抽屉使用 `destroyOnClose` 属性
3. **懒加载**: 使用 React.lazy() 延迟加载组件（如需要）

## 安全考虑

### 数据安全

1. **密码处理**: 密码字段使用 `Input.Password` 组件
2. **XSS 防护**: React 自动转义用户输入
3. **CSRF 防护**: 使用 token 验证

### 权限安全

1. **前端权限控制**: 根据用户角色显示/隐藏功能
2. **后端权限验证**: 所有 API 请求都需要后端验证权限
3. **敏感信息保护**: 不在前端存储敏感信息

## 可访问性

### ARIA 支持

1. **语义化 HTML**: 使用正确的 HTML 标签
2. **ARIA 属性**: Ant Design 组件自动提供 ARIA 支持
3. **键盘导航**: 支持 Tab 键导航

### 视觉辅助

1. **颜色对比**: 确保文本和背景有足够的对比度
2. **焦点指示**: 显示清晰的焦点指示器
3. **错误提示**: 提供清晰的错误提示信息

## 国际化

### 文本管理

1. **中文优先**: 所有用户可见文本使用中文
2. **代码注释**: 使用中文注释
3. **错误消息**: 使用中文错误消息

### 未来扩展

1. **i18n 支持**: 预留国际化扩展能力
2. **语言切换**: 支持多语言切换（如需要）

## 设计决策

### 为什么选择 Drawer 而不是 Modal？

1. **更好的用户体验**: Drawer 从侧边滑出，不会遮挡整个页面
2. **更多的空间**: Drawer 可以提供更宽的表单空间
3. **一致性**: 与租户管理保持一致

### 为什么使用 CommonTable？

1. **代码复用**: 避免重复实现表格功能
2. **统一体验**: 保持所有表格的一致性
3. **易于维护**: 集中管理表格通用功能

### 为什么使用 React Query？

1. **自动缓存**: 减少不必要的 API 请求
2. **状态管理**: 简化服务端状态管理
3. **错误处理**: 统一的错误处理机制
4. **加载状态**: 自动管理加载状态

### 为什么使用 forwardRef？

1. **父组件控制**: 允许父组件控制 Drawer 的打开和关闭
2. **解耦**: 保持组件的独立性和可复用性
3. **类型安全**: TypeScript 提供完整的类型支持

## 实现注意事项

1. **参考租户管理**: 严格参考租户管理的实现模式，确保代码风格一致
2. **类型安全**: 使用 TypeScript 类型，避免使用 `any`
3. **错误处理**: 使用统一的错误处理工具函数
4. **代码注释**: 使用中文注释说明关键逻辑
5. **表单重置**: 确保抽屉关闭时重置表单状态
6. **元数据处理**: 正确处理 JSON 格式的元数据字段
7. **权限控制**: 根据用户角色显示/隐藏相关功能
8. **加载状态**: 在所有异步操作中显示加载状态
9. **用户反馈**: 提供清晰的成功和错误消息
10. **响应式设计**: 确保在不同屏幕尺寸下都能正常使用
