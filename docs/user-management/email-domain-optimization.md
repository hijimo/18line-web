# 用户邮箱域名优化

## 概述

为了方便创建租户用户，对用户创建和编辑功能进行了优化，实现了基于租户域名的邮箱输入体验。

## 功能特性

### 1. 邮箱域名后缀显示

- 在创建和编辑用户时，系统会自动获取租户的域名信息
- 邮箱输入框会显示租户域名作为后缀（例如：`@example.com`）
- 用户只需输入邮箱前缀部分，系统会自动拼接完整邮箱地址

### 2. 邮箱输入规则优化

- 邮箱前缀输入框禁止输入 `.` 和 `@` 字符
- 使用正则表达式验证：`/^[^.@]+$/`
- 提供清晰的错误提示："邮箱前缀不能包含 '.' 或 '@' 字符"

### 3. 用户角色单选

- 用户角色改为单选模式（使用 Select 下拉选择，去掉 `mode="multiple"` 属性）
- 表单的输入和输出依然保持数组格式，确保与后端 API 兼容
- 使用 Form.Item 的 `normalize`、`getValueFromEvent` 和 `getValueProps` 实现单选到数组的转换
- 支持清空选择（`allowClear` 属性）

## 技术实现

### 租户域名获取

使用 React Query 获取租户详情：

```typescript
const { data: tenantData } = useQuery({
  queryKey: ['tenant', currentTenantId],
  queryFn: () => getTenantsId({ id: currentTenantId! }),
  enabled: !!currentTenantId,
});

const tenantDomain = tenantData?.data?.domain;
```

### 邮箱输入组件

```tsx
<Form.Item
  label={<span className="font-medium">用户邮箱</span>}
  name="emailPrefix"
  rules={[
    { required: true, message: '请输入用户邮箱' },
    {
      pattern: /^[^.@]+$/,
      message: '邮箱前缀不能包含 "." 或 "@" 字符',
    },
  ]}
>
  <Input
    placeholder="请输入邮箱前缀"
    maxLength={255}
    size="large"
    autoFocus
    addonAfter={tenantDomain ? `@${tenantDomain}` : undefined}
  />
</Form.Item>
```

### 角色单选转数组

```tsx
<Form.Item
  label={<span className="font-medium">用户角色</span>}
  name="roles"
  tooltip="为用户分配角色"
  normalize={(value) => (value ? [value] : [])}
  getValueFromEvent={(value) => (Array.isArray(value) ? value[0] : value)}
  getValueProps={(value) => ({ value: Array.isArray(value) ? value[0] : value })}
>
  <Select
    placeholder="请选择用户角色（可选）"
    size="large"
    allowClear
    options={[
      { label: '普通用户', value: 'user' },
      { label: '租户管理员', value: 'tenant_admin' },
      { label: '平台管理员', value: 'system_admin' },
    ]}
  />
</Form.Item>
```

### 邮箱拼接逻辑

```typescript
const handleSubmit = (
  values: CreateUserRequest & { metaJson?: string; emailPrefix?: string },
) => {
  const { metaJson, emailPrefix, ...restValues } = values;

  // 拼接完整的邮箱地址
  const fullEmail =
    tenantDomain && emailPrefix ? `${emailPrefix}@${tenantDomain}` : emailPrefix || '';

  const submitData: CreateUserRequest = {
    ...restValues,
    email: fullEmail,
    meta: parsedMeta,
  };

  createUserMutate(submitData);
};
```

## 用户体验改进

### 创建用户场景

1. 打开创建用户抽屉时，传入 `tenantId`
2. 系统自动获取租户域名并显示在邮箱输入框后缀
3. 用户只需输入邮箱前缀（如 `zhangsan`）
4. 系统自动拼接为完整邮箱（如 `zhangsan@example.com`）

### 编辑用户场景

1. 打开编辑用户抽屉时，传入用户信息
2. 系统从用户的 `tenantId` 获取租户域名
3. 从完整邮箱中提取前缀部分显示在输入框
4. 用户可以修改邮箱前缀，系统自动拼接新的完整邮箱

## 相关文件

- `src/pages/users/components/Drawer/UserCreateDrawer/index.tsx` - 创建用户抽屉
- `src/pages/users/components/Drawer/UserEditDrawer/index.tsx` - 编辑用户抽屉
- `src/services/api/tenant-management/tenant-management.ts` - 租户管理 API
- `src/types/api/tenant.ts` - 租户类型定义

## 注意事项

1. 确保在打开创建用户抽屉时传入正确的 `tenantId`
2. 租户必须配置有效的 `domain` 字段才能显示邮箱后缀
3. 如果租户没有配置域名，邮箱输入框将不显示后缀
4. 用户角色虽然是单选，但提交给后端的数据格式仍为数组

## 后续优化建议

1. 可以考虑在租户域名加载失败时显示友好的提示信息
2. 可以添加邮箱前缀的更多验证规则（如长度、特殊字符等）
3. 可以考虑支持自定义域名后缀的场景
