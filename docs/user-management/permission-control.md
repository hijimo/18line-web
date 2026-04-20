# 用户管理权限控制实现说明

## 概述

用户管理功能实现了基于角色的权限控制，区分平台管理员（system_admin）和租户管理员（tenant_admin）的访问权限。

## 实现的权限控制功能

### 1. 表格列显示控制

**位置**: `src/pages/users/components/Table/UserTable/index.tsx`

**实现逻辑**:

- 获取当前登录用户的角色信息
- 判断是否为平台管理员：`user?.roles?.includes('system_admin')`
- 根据角色动态控制租户列的显示：
  - 平台管理员：显示租户列和租户筛选功能
  - 租户管理员：隐藏租户列和租户筛选功能

**代码示例**:

```typescript
// 获取当前用户信息
const user = useAuthStore((state) => state.user);
const isPlatformAdmin = user?.roles?.includes('system_admin') ?? false;

// 在列配置中根据角色控制租户列显示
const columns = useMemo(() => {
  return _values(
    produce(userColumns, (draft) => {
      // 租户管理员不显示租户列和租户筛选
      if (!isPlatformAdmin) {
        delete draft.userTenant;
      }
      // ... 其他列配置
    }),
  );
}, [handleEdit, handleDelete, handleToggleStatus, isPlatformAdmin]);
```

### 2. 创建用户抽屉权限控制

**位置**: `src/pages/users/components/Drawer/UserCreateDrawer/index.tsx`

**实现逻辑**:

- 获取当前登录用户的角色信息
- 根据角色控制租户选择字段的显示：
  - 平台管理员：显示租户选择字段（必填）
  - 租户管理员：隐藏租户选择字段
- 租户管理员创建用户时，不传递 tenantId 参数，后端会自动使用当前用户的租户 ID

**代码示例**:

```typescript
// 判断当前用户是否为平台管理员
const isPlatformAdmin = user?.roles?.includes('system_admin') ?? false;

// 在表单中条件渲染租户选择字段
{isPlatformAdmin && (
  <Form.Item
    label={<span className="font-medium">所属租户</span>}
    name="tenantId"
    rules={[{ required: true, message: '请选择所属租户' }]}
    tooltip="平台管理员必须为新用户指定所属租户"
  >
    <Input placeholder="请输入租户 ID" size="large" />
  </Form.Item>
)}

// 提交时处理租户 ID
const submitData: CreateUserRequest = {
  ...restValues,
  meta: parsedMeta,
};

// 如果是租户管理员，不传递 tenantId（后端会自动使用当前用户的租户 ID）
if (!isPlatformAdmin) {
  delete submitData.tenantId;
}
```

### 3. 表格列配置

**位置**: `src/configurify/columns/userColumns.tsx`

**实现逻辑**:

- 租户列配置支持筛选功能（valueType: 'select'）
- 租户列的显示由 UserTable 组件根据用户角色动态控制

**代码示例**:

```typescript
export const userTenant: ProColumns<User> = {
  title: '所属租户',
  dataIndex: 'tenantId',
  className: 'nowrap',
  ellipsis: true,
  width: 160,
  valueType: 'select',  // 支持筛选
  fieldProps: {
    placeholder: '请选择租户',
  },
  render: (_, record) => {
    if (!record.tenantId) return <span className="text-gray-400">--</span>;
    return (
      <ColumnEllipsisWrap width={140}>
        <span>{record.tenantId}</span>
      </ColumnEllipsisWrap>
    );
  },
};
```

### 4. 编辑用户抽屉

**位置**: `src/pages/users/components/Drawer/UserEditDrawer/index.tsx`

**实现逻辑**:

- 租户信息以只读方式显示（使用 Badge 组件）
- 不允许修改用户的租户归属

**代码示例**:

```typescript
{/* 租户信息显示（只读） */}
{currentUser && (
  <Form.Item label={<span className="font-medium">所属租户</span>}>
    <div className="py-1">
      <Badge
        status="processing"
        text={currentUser.tenantId || '未分配租户'}
        className="text-base"
      />
    </div>
  </Form.Item>
)}
```

## 权限控制流程

### 平台管理员（system_admin）

1. **查看用户列表**:
   - 可以看到所有租户的用户
   - 表格显示租户列
   - 可以使用租户筛选功能

2. **创建用户**:
   - 必须选择目标租户
   - 租户选择字段为必填项
   - 可以为任意租户创建用户

3. **编辑用户**:
   - 可以编辑任意租户的用户
   - 租户信息只读显示

### 租户管理员（tenant_admin）

1. **查看用户列表**:
   - 只能看到自己租户下的用户
   - 表格不显示租户列
   - 没有租户筛选功能

2. **创建用户**:
   - 不显示租户选择字段
   - 自动使用当前用户的租户 ID
   - 只能为自己的租户创建用户

3. **编辑用户**:
   - 只能编辑自己租户下的用户
   - 租户信息只读显示

## 后端权限验证

所有权限控制在后端也有相应的验证：

- 租户管理员的 API 请求会被后端自动限制在其所属租户范围内
- 租户管理员尝试访问其他租户的数据会收到 403 权限不足错误
- 租户管理员创建用户时，后端会忽略前端传递的 tenantId，自动使用当前用户的租户 ID

## 安全考虑

1. **前后端双重验证**: 前端控制 UI 显示，后端验证实际权限
2. **最小权限原则**: 租户管理员只能访问自己租户的数据
3. **数据隔离**: 不同租户的数据完全隔离
4. **自动租户绑定**: 租户管理员创建的用户自动绑定到其租户

## 测试建议

1. 使用平台管理员账号登录，验证可以看到租户列和筛选功能
2. 使用租户管理员账号登录，验证租户列和筛选功能被隐藏
3. 使用租户管理员创建用户，验证不需要选择租户
4. 使用平台管理员创建用户，验证必须选择租户
5. 验证租户管理员只能看到自己租户的用户
6. 验证平台管理员可以看到所有租户的用户
