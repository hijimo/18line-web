# 模型设置页面使用示例

## 配置示例

### 1. 配置 OpenAI GPT-4

**步骤：**

1. 在"模型配置"表单中填写：
   - 配置名称: `GPT-4 生产环境`
   - 模型提供商: 选择 `OpenAI`
   - 模型: `gpt-4`
   - API Key: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

2. 点击"创建配置"按钮

3. 配置创建成功后，会在上方的列表中显示

**配置数据：**

```json
{
  "name": "GPT-4 生产环境",
  "modelProvider": "openai",
  "model": "gpt-4",
  "apiKey": "sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

---

### 2. 配置 Anthropic Claude 3

**步骤：**

1. 在"模型配置"表单中填写：
   - 配置名称: `Claude 3 Opus`
   - 模型提供商: 选择 `Anthropic`
   - 模型: `claude-3-opus-20240229`
   - API Key: `sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

2. 点击"创建配置"按钮

**配置数据：**

```json
{
  "name": "Claude 3 Opus",
  "modelProvider": "anthropic",
  "model": "claude-3-opus-20240229",
  "apiKey": "sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

---

### 3. 配置 Google Gemini Pro

**步骤：**

1. 在"模型配置"表单中填写：
   - 配置名称: `Gemini Pro`
   - 模型提供商: 选择 `Google AI`
   - 模型: `gemini-pro`
   - API Key: `AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

2. 点击"创建配置"按钮

**配置数据：**

```json
{
  "name": "Gemini Pro",
  "modelProvider": "googlegenai",
  "model": "gemini-pro",
  "apiKey": "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

---

### 4. 配置变脸模型

**步骤：**

1. 在"模型配置"表单中填写：
   - 配置名称: `变脸 AI 模型`
   - 模型提供商: 选择 `变脸`
   - 模型: `bianlian-v1`
   - API Key: `bl-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Base URL: `https://api.bianlian.com`

2. 点击"创建配置"按钮

**配置数据：**

```json
{
  "name": "变脸 AI 模型",
  "modelProvider": "bianlian",
  "model": "bianlian-v1",
  "apiKey": "bl-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "baseUrl": "https://api.bianlian.com"
}
```

---

### 5. 配置 Azure OpenAI

**步骤：**

1. 在"模型配置"表单中填写：
   - 配置名称: `Azure GPT-4 Turbo`
   - 模型提供商: 选择 `Azure OpenAI`
   - 模型: `gpt-4`
   - API Key: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Base URL: `https://my-resource.openai.azure.com`
   - Deployment Name: `gpt-4-turbo-deployment`
   - API Version: `2024-02-15-preview`

2. 点击"创建配置"按钮

**配置数据：**

```json
{
  "name": "Azure GPT-4 Turbo",
  "modelProvider": "azureopenai",
  "model": "gpt-4",
  "apiKey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "baseUrl": "https://my-resource.openai.azure.com",
  "queryParams": "{\"deploymentName\":\"gpt-4-turbo-deployment\",\"apiVersion\":\"2024-02-15-preview\"}"
}
```

**注意事项：**

- Base URL 格式: `https://{your-resource-name}.openai.azure.com`
- Deployment Name 是在 Azure 门户中创建的部署名称
- API Version 需要使用 Azure 支持的版本号

---

### 6. 配置自定义 OpenAI 兼容服务

**步骤：**

1. 在"模型配置"表单中填写：
   - 配置名称: `本地 LLM 服务`
   - 模型提供商: 选择 `自定义 OpenAI`
   - 模型: `llama-2-70b`
   - API Key: `local-api-key-xxxxxxxx`
   - Base URL: `http://localhost:8000/v1`
   - 自定义查询参数:

     ```json
     {
       "temperature": 0.7,
       "max_tokens": 2000,
       "top_p": 0.9
     }
     ```

2. 点击"创建配置"按钮

**配置数据：**

```json
{
  "name": "本地 LLM 服务",
  "modelProvider": "custom_openai",
  "model": "llama-2-70b",
  "apiKey": "local-api-key-xxxxxxxx",
  "baseUrl": "http://localhost:8000/v1",
  "queryParams": "{\"temperature\":0.7,\"max_tokens\":2000,\"top_p\":0.9}"
}
```

**适用场景：**

- 本地部署的 LLM 服务
- 第三方 OpenAI 兼容 API
- 自建的模型服务

---

## 管理操作示例

### 启用/禁用模型

**场景：** 临时禁用某个模型配置

**操作步骤：**

1. 在"已配置模型列表"中找到目标模型
2. 点击"状态"列的开关
3. 开关变为灰色，模型被禁用
4. 再次点击可重新启用

**效果：**

- 禁用后的模型不会在可用模型列表中显示
- 不会删除配置数据
- 可随时重新启用

---

### 编辑模型配置

**场景：** 更新 API Key 或其他配置

**操作步骤：**

1. 在"已配置模型列表"中找到目标模型
2. 点击"操作"列的"编辑"按钮
3. 在弹出的表单中修改配置
4. 点击"保存"按钮

**可修改字段：**

- 配置名称
- 模型标识
- API Key
- Base URL
- 查询参数

**注意：** 模型提供商不可修改

---

### 删除模型配置

**场景：** 删除不再使用的模型配置

**操作步骤：**

1. 在"已配置模型列表"中找到目标模型
2. 点击"操作"列的"删除"按钮
3. 在确认对话框中点击"确定"
4. 配置被删除，从列表中移除

**注意：**

- 删除操作不可恢复
- 删除前请确认该配置不再使用
- 系统会执行软删除，数据仍保留在数据库中

---

## 常见问题

### Q1: 如何获取 OpenAI API Key？

**答：**

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 登录账号
3. 进入 API Keys 页面
4. 点击"Create new secret key"
5. 复制生成的 API Key

### Q2: Azure OpenAI 的 Deployment Name 在哪里找？

**答：**

1. 登录 [Azure Portal](https://portal.azure.com/)
2. 进入你的 OpenAI 资源
3. 在"Model deployments"页面查看
4. 每个部署都有一个唯一的名称

### Q3: 自定义查询参数的格式要求？

**答：**

- 必须是有效的 JSON 格式
- 使用双引号包裹键和字符串值
- 数字和布尔值不需要引号
- 示例：`{"key": "value", "number": 123, "bool": true}`

### Q4: Base URL 应该填写什么？

**答：**

- OpenAI: 通常不需要填写（使用默认）
- Azure OpenAI: `https://{resource-name}.openai.azure.com`
- 自定义服务: 你的服务地址，如 `http://localhost:8000/v1`
- 变脸: 提供商指定的 API 地址

### Q5: 如何测试配置是否正确？

**答：**

1. 创建配置后，在列表中找到该配置
2. 点击"验证"按钮（如果有）
3. 系统会尝试连接并测试配置
4. 查看验证结果

### Q6: 为什么我的配置创建失败？

**可能原因：**

- API Key 格式不正确
- Base URL 格式无效
- 网络连接问题
- 权限不足（租户管理员只能管理自己租户的配置）

**解决方法：**

- 检查所有字段是否填写正确
- 确认 API Key 有效
- 检查网络连接
- 联系管理员确认权限

---

## 最佳实践

### 1. 命名规范

**推荐格式：** `{提供商}-{模型}-{环境}`

**示例：**

- `OpenAI-GPT4-生产`
- `Anthropic-Claude3-测试`
- `Azure-GPT35-开发`

### 2. 环境隔离

**建议：**

- 为不同环境创建独立配置
- 生产环境使用独立的 API Key
- 测试环境可以使用较低配额的 Key

### 3. 安全管理

**注意事项：**

- 定期轮换 API Key
- 不要在代码中硬编码 API Key
- 限制 API Key 的权限范围
- 监控 API 使用情况

### 4. 性能优化

**建议：**

- 为常用模型启用配置
- 禁用不常用的模型以减少列表加载时间
- 定期清理无用的配置

---

## 权限说明

### 平台管理员 (system_admin)

**权限：**

- 查看所有租户的模型配置
- 创建任意租户的模型配置
- 编辑任意租户的模型配置
- 删除任意租户的模型配置
- 更新任意租户的配置状态

**注意：**

- 创建配置时必须指定 `tenantId`

### 租户管理员 (tenant_admin)

**权限：**

- 查看自己租户的模型配置
- 创建自己租户的模型配置
- 编辑自己租户的模型配置
- 删除自己租户的模型配置
- 更新自己租户的配置状态

**限制：**

- 无法访问其他租户的配置
- `tenantId` 参数会被自动设置为当前租户
