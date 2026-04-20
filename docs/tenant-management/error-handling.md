# 租户管理错误处理文档

## 概述

租户管理功能实现了全面的错误处理机制，包括 API 错误、网络错误、权限错误和表单验证错误的处理。所有错误都会显示用户友好的提示信息，并在控制台记录详细的错误日志以便调试。

## 错误类型

### 1. 网络错误

**触发场景**:

- 网络连接失败
- 请求超时
- 服务器无响应

**用户提示**:

- "网络连接失败，请检查网络连接后重试"
- "请求超时，请检查网络连接后重试"

**控制台日志**:

```
[NETWORK] 获取租户列表: 网络连接失败，请检查网络连接后重试
```

### 2. API 错误

**触发场景**:

- API 返回非 0 状态码
- 服务器内部错误（500+）
- 资源不存在（404）

**用户提示**:

- "服务器错误，请稍后重试"（500+）
- "请求的资源不存在"（404）
- API 返回的具体错误消息

**控制台日志**:

```
获取租户列表失败 - API 响应错误: {
  code: 500,
  message: "Internal Server Error",
  params: {...}
}
```

### 3. 权限错误

**触发场景**:

- 未登录或 token 过期（401）
- 无权限执行操作（403）

**用户提示**:

- "无权限执行此操作，请联系管理员"
- "身份验证失败，请重新登录"

**控制台日志**:

```
[AUTH] 删除租户: 无权限执行此操作，请联系管理员
```

### 4. 表单验证错误

**触发场景**:

- 必填字段未填写
- 字段长度超出限制
- 格式不正确（如 JSON 格式错误）

**用户提示**:

- "请输入租户名称"
- "租户名称长度应在 1-255 个字符之间"
- "元数据格式不正确，请输入有效的 JSON 格式"

**控制台日志**:

```
表单验证失败: {
  errorFields: [...],
  values: {...}
}
```

## 错误处理工具函数

### parseError(error: unknown): ErrorInfo

解析错误对象，返回结构化的错误信息。

**返回值**:

```typescript
interface ErrorInfo {
  message: string // 用户友好的错误消息
  type: 'network' | 'api' | 'auth' | 'microapp' | 'unknown' // 错误类型
  code?: string | number // 错误码（如果有）
  details?: string // 详细错误信息（用于日志）
}
```

### handleError(error: unknown, context?: string): string

处理错误并返回用户友好的错误消息，同时记录详细日志。

**参数**:

- `error`: 错误对象
- `context`: 错误上下文（如 "获取租户列表"、"创建租户"）

**返回值**: 用户友好的错误消息字符串

**使用示例**:

```typescript
try {
  await getTenants(params)
} catch (error) {
  const errorMessage = handleError(error, '获取租户列表')
  message.error(errorMessage)
}
```

### handleFormError(errorFields: any[]): string

处理表单验证错误，返回第一个错误消息。

**参数**:

- `errorFields`: Ant Design Form 的错误字段数组

**返回值**: 第一个错误消息字符串

**使用示例**:

```typescript
<Form
  onFinishFailed={(errorInfo) => {
    const errorMsg = handleFormError(errorInfo.errorFields)
    message.error(errorMsg)
    console.error('表单验证失败:', errorInfo)
  }}
/>
```

### logError(error: unknown, context?: string): void

记录错误日志到控制台。

**参数**:

- `error`: 错误对象
- `context`: 错误上下文

**日志格式**:

```
[ERROR_TYPE] context: message
details (if available)
```

## 组件中的错误处理

### 表格组件 (TenantTable)

#### 获取租户列表错误处理

```typescript
const fetchData = useCallback(async (params) => {
  try {
    const response = await getTenants(requestParams)
    
    if (response.code === 0 && response.data) {
      return { data: response.data.data || [], success: true, total: response.data.totalCount || 0 }
    } else {
      // API 响应错误
      const errorMsg = response.message || '获取租户列表失败'
      message.error(errorMsg)
      console.error('获取租户列表失败 - API 响应错误:', {
        code: response.code,
        message: response.message,
        params: requestParams,
      })
      return { data: [], success: false, total: 0 }
    }
  } catch (error) {
    // 网络错误或其他异常
    const errorMessage = handleError(error, '获取租户列表')
    message.error(errorMessage)
    return { data: [], success: false, total: 0 }
  }
}, [getTenants])
```

#### 删除租户错误处理

```typescript
const { mutate: deleteTenantMutate } = useMutation({
  mutationFn: async (id: string) => deleteTenantsId({ id }),
  onSuccess: (response) => {
    if (response.code === 0) {
      message.success('删除租户成功')
      actionRef.current?.reload()
    } else {
      // API 响应错误
      const errorMsg = String(response.message || '删除租户失败')
      message.error(errorMsg)
      console.error('删除租户失败 - API 响应错误:', {
        code: response.code,
        message: response.message,
      })
    }
  },
  onError: (error: unknown) => {
    // 网络错误或其他异常
    const errorMessage = handleError(error, '删除租户')
    message.error(errorMessage)
  },
})
```

### 创建租户抽屉 (TenantCreateDrawer)

#### API 错误处理

```typescript
const { mutate: createTenantMutate, isPending: isCreating } = useMutation({
  mutationFn: async (params: CreateTenantRequest) => postTenants(params),
  onSuccess: (response) => {
    if (response.code === 0) {
      message.success('创建租户成功')
      props.onSuccess?.()
      setIsOpen(false)
      form.resetFields()
    } else {
      // API 响应错误
      const errorMsg = response.message || '创建租户失败'
      message.error(errorMsg)
      console.error('创建租户失败 - API 响应错误:', {
        code: response.code,
        message: response.message,
      })
    }
  },
  onError: (error: unknown) => {
    // 网络错误或其他异常
    const errorMessage = handleError(error, '创建租户')
    message.error(errorMessage)
  },
})
```

#### 表单验证错误处理

```typescript
<Form
  onFinish={handleSubmit}
  onFinishFailed={(errorInfo) => {
    const errorMsg = handleFormError(errorInfo.errorFields)
    message.error(errorMsg)
    console.error('表单验证失败:', errorInfo)
  }}
>
  <Form.Item
    label="租户名称"
    name="name"
    rules={[
      { required: true, message: '请输入租户名称' },
      { min: 1, max: 255, message: '租户名称长度应在 1-255 个字符之间' },
    ]}
  >
    <Input placeholder="请输入租户名称" maxLength={255} />
  </Form.Item>
</Form>
```

### 编辑租户抽屉 (TenantEditDrawer)

#### API 错误处理

```typescript
const { mutate: updateTenantMutate, isPending: isUpdating } = useMutation({
  mutationFn: async (params: { id: string; data: UpdateTenantRequest }) =>
    putTenantsId({ id: params.id }, params.data),
  onSuccess: (response) => {
    if (response.code === 0) {
      message.success('更新租户成功')
      props.onSuccess?.()
      setIsOpen(false)
      form.resetFields()
      setCurrentTenant(null)
    } else {
      // API 响应错误
      const errorMsg = response.message || '更新租户失败'
      message.error(errorMsg)
      console.error('更新租户失败 - API 响应错误:', {
        code: response.code,
        message: response.message,
      })
    }
  },
  onError: (error: unknown) => {
    // 网络错误或其他异常
    const errorMessage = handleError(error, '更新租户')
    message.error(errorMessage)
  },
})
```

#### 元数据 JSON 解析错误处理

```typescript
const handleSubmit = (values: UpdateTenantRequest & { metadata?: string }) => {
  if (!currentTenant?.id) {
    message.error('租户信息不完整')
    console.error('更新租户失败 - 租户 ID 缺失:', currentTenant)
    return
  }

  // 处理元数据：如果提供了元数据字符串，尝试解析为 JSON
  let parsedMetadata: UpdateTenantRequest['metadata'] = undefined
  if (values.metadata) {
    try {
      parsedMetadata = JSON.parse(values.metadata)
    } catch (error) {
      message.error('元数据格式不正确，请输入有效的 JSON 格式')
      console.error('元数据解析失败:', {
        metadata: values.metadata,
        error,
      })
      return
    }
  }

  // 继续提交...
}
```

## 错误处理最佳实践

### 1. 双层错误处理

对于 API 请求，实现双层错误处理：

1. **成功回调中的业务错误**: 检查 `response.code`，处理业务逻辑错误
2. **错误回调中的异常**: 处理网络错误、超时等异常情况

```typescript
useMutation({
  mutationFn: apiCall,
  onSuccess: (response) => {
    if (response.code === 0) {
      // 成功处理
    } else {
      // 业务错误处理
      message.error(response.message)
      console.error('业务错误:', response)
    }
  },
  onError: (error) => {
    // 异常错误处理
    const errorMessage = handleError(error, '操作名称')
    message.error(errorMessage)
  },
})
```

### 2. 详细的控制台日志

所有错误都应该在控制台记录详细信息，包括：

- 错误类型和消息
- 请求参数
- 响应数据
- 错误堆栈（如果有）

```typescript
console.error('操作失败 - API 响应错误:', {
  code: response.code,
  message: response.message,
  params: requestParams,
  response: response,
})
```

### 3. 用户友好的错误提示

- 使用简洁明了的中文提示
- 避免技术术语
- 提供可操作的建议
- 使用 Ant Design 的 `message` 组件显示提示

```typescript
// ✅ 好的错误提示
message.error('网络连接失败，请检查网络连接后重试')

// ❌ 不好的错误提示
message.error('Network error: fetch failed')
```

### 4. 表单验证错误

- 在字段级别显示验证错误
- 在提交失败时显示第一个错误
- 记录完整的验证错误信息到控制台

```typescript
<Form.Item
  name="name"
  rules={[
    { required: true, message: '请输入租户名称' },
    { min: 1, max: 255, message: '租户名称长度应在 1-255 个字符之间' },
  ]}
>
  <Input />
</Form.Item>
```

### 5. 错误恢复

- 提供重试机制（如刷新按钮）
- 保持表单数据，避免用户重新输入
- 在错误后自动聚焦到错误字段

## 测试错误处理

### 测试场景

1. **网络错误测试**:
   - 断开网络连接
   - 模拟请求超时

2. **API 错误测试**:
   - 返回 404 错误
   - 返回 500 错误
   - 返回业务错误码

3. **权限错误测试**:
   - 使用过期的 token
   - 使用无权限的账号

4. **表单验证测试**:
   - 提交空表单
   - 输入超长字符串
   - 输入无效的 JSON 格式

### 验证要点

- ✅ 用户看到友好的错误提示
- ✅ 控制台记录详细的错误信息
- ✅ 表单保持用户输入的数据
- ✅ 错误提示自动消失
- ✅ 可以重试操作

## 相关文件

- `src/utils/errorHandler.ts` - 错误处理工具函数
- `src/pages/tenants/components/Table/TenantTable/index.tsx` - 表格组件错误处理
- `src/pages/tenants/components/Drawer/TenantCreateDrawer/index.tsx` - 创建抽屉错误处理
- `src/pages/tenants/components/Drawer/TenantEditDrawer/index.tsx` - 编辑抽屉错误处理

## 需求覆盖

本实现覆盖了以下需求：

- ✅ 需求 8.1: API 请求失败时显示用户友好的错误提示消息
- ✅ 需求 8.2: 网络连接失败时显示网络错误提示
- ✅ 需求 8.3: 权限不足时显示权限错误提示
- ✅ 需求 8.4: 表单验证失败时在相应字段下方显示验证错误信息
- ✅ 需求 8.5: 在控制台记录详细的错误信息以便调试
