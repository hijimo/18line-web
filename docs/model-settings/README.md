# 模型设置功能

## 概述

模型设置页面允许用户管理 AI 模型配置，包括添加、编辑、删除和启用/禁用模型配置。支持多种模型提供商，每个提供商有不同的配置要求。

## 功能特性

- ✅ 查看已配置的模型列表
- ✅ 启用/禁用模型配置
- ✅ 添加新的模型配置
- ✅ 验证模型配置连接
- ✅ 删除模型配置
- ✅ 支持多种模型提供商

## 支持的模型提供商

### 1. OpenAI

**配置项**:

- API Key (必填)

**示例**:

```
配置名称: GPT-4 生产环境
模型: gpt-4
API Key: sk-...
```

### 2. Anthropic

**配置项**:

- API Key (必填)

**示例**:

```
配置名称: Claude 3 Opus
模型: claude-3-opus-20240229
API Key: sk-ant-...
```

### 3. Google AI

**配置项**:

- API Key (必填)

**示例**:

```
配置名称: Gemini Pro
模型: gemini-pro
API Key: AIza...
```

### 4. 变脸 (Bianlian)

**配置项**:

- API Key (必填)
- Base URL (必填)

**示例**:

```
配置名称: 变脸模型
模型: bianlian-v1
API Key: your-api-key
Base URL: https://api.bianlian.com
```

### 5. Azure OpenAI

**配置项**:

- API Key (必填)
- Base URL (必填) - Azure 资源端点
- Deployment Name (必填) - 部署名称
- API Version (必填) - JSON 格式

**示例**:

```
配置名称: Azure GPT-4
Deployment Name: gpt-35-turbo
API Key: your-azure-key
Base URL: https://my-resource.openai.azure.com
API Version: {"api-version":"2024-02-15-preview"}
```

### 6. Custom OpenAI

**配置项**:

- API Key (必填)
- Base URL (必填)
- Custom Query Params (可选) - JSON 格式

**示例**:

```
配置名称: 自定义 OpenAI
模型: custom-gpt-4
API Key: your-api-key
Base URL: https://api.custom-openai.com
Custom Query Params: {"param1":"value1"}
```

## 页面布局

### 上半部分：已配置的模型列表

- 显示所有已配置的模型
- 支持启用/禁用切换
- 提供验证、编辑、删除操作
- 显示模型提供商、模型名称、Base URL 等信息

### 下半部分：模型配置表单

- 根据选择的提供商动态显示配置项
- 表单验证确保必填项完整
- 支持重置表单

## 技术实现

### 状态管理

- 使用 `@tanstack/react-query` 管理服务端状态
- 自动缓存和更新数据
- 乐观更新提升用户体验

### 组件结构

```
src/pages/model-settings/
├── index.tsx                          # 主页面
├── components/
│   ├── ModelConfigList/              # 模型列表组件
│   │   └── index.tsx
│   └── ModelConfigForm/              # 模型配置表单
│       └── index.tsx
```

### Hooks

```
src/hooks/useModelConfigurations.ts    # 模型配置相关 hooks
```

## API 接口

- `GET /model-configurations` - 获取模型配置列表
- `POST /model-configurations` - 创建模型配置
- `PUT /model-configurations/:id` - 更新模型配置
- `DELETE /model-configurations/:id` - 删除模型配置
- `PATCH /model-configurations/:id/status` - 更新模型状态
- `POST /model-configurations/:id/validate` - 验证模型配置

## 使用说明

### 添加模型配置

1. 在"添加模型配置"卡片中填写配置名称
2. 选择模型提供商
3. 根据提供商要求填写相应的配置项
4. 点击"添加配置"按钮

### 启用/禁用模型

在模型列表中，使用状态开关即可启用或禁用模型。

### 验证模型配置

点击"验证"按钮，系统会测试模型配置是否能正常连接。

### 删除模型配置

点击"删除"按钮，确认后即可删除模型配置。

## 注意事项

- API Key 等敏感信息会被加密存储
- 删除操作为软删除，数据仍保留在数据库中
- 租户管理员只能管理自己租户下的配置
- 平台管理员可以管理所有租户的配置

## 相关文档

- [API 文档](./api.md)
- [组件文档](./components.md)

# 模型设置页面

## 功能概述

模型设置页面用于管理 AI 模型配置，包括查看已配置的模型列表和创建新的模型配置。

## 页面布局

### 1. 已配置模型列表（上方）

显示所有已配置的模型，支持以下功能：

- **查看模型信息**：配置名称、模型提供商、模型标识、Base URL
- **启用/禁用**：通过开关快速切换模型状态
- **编辑配置**：修改现有模型配置
- **删除配置**：删除不需要的模型配置
- **分页显示**：支持大量模型配置的分页浏览

### 2. 模型配置表单（下方）

用于创建新的模型配置，根据选择的模型提供商动态显示不同的配置字段。

## 支持的模型提供商

### 1. OpenAI

**配置字段：**

- 配置名称（必填）
- 模型标识（必填）：如 `gpt-4`, `gpt-3.5-turbo`
- API Key（必填）

**示例：**

```
配置名称: GPT-4 生产环境
模型: gpt-4
API Key: sk-xxxxxxxxxxxxxxxx
```

### 2. Anthropic

**配置字段：**

- 配置名称（必填）
- 模型标识（必填）：如 `claude-3-opus`, `claude-3-sonnet`
- API Key（必填）

**示例：**

```
配置名称: Claude 3 Opus
模型: claude-3-opus-20240229
API Key: sk-ant-xxxxxxxxxxxxxxxx
```

### 3. Google AI

**配置字段：**

- 配置名称（必填）
- 模型标识（必填）：如 `gemini-pro`, `gemini-pro-vision`
- API Key（必填）

**示例：**

```
配置名称: Gemini Pro
模型: gemini-pro
API Key: AIzaSyxxxxxxxxxxxxxxxx
```

### 4. 变脸（Bianlian）

**配置字段：**

- 配置名称（必填）
- 模型标识（必填）
- API Key（必填）
- Base URL（必填）

**示例：**

```
配置名称: 变脸模型
模型: bianlian-v1
API Key: bl-xxxxxxxxxxxxxxxx
Base URL: https://api.bianlian.com
```

### 5. Azure OpenAI

**配置字段：**

- 配置名称（必填）
- 模型标识（必填）
- API Key（必填）
- Base URL（必填）
- Deployment Name（必填）：Azure 部署名称
- API Version（必填）：API 版本号

**示例：**

```
配置名称: Azure GPT-4
模型: gpt-4
API Key: xxxxxxxxxxxxxxxx
Base URL: https://my-resource.openai.azure.com
Deployment Name: gpt-4-deployment
API Version: 2024-02-15-preview
```

### 6. 自定义 OpenAI

**配置字段：**

- 配置名称（必填）
- 模型标识（必填）
- API Key（必填）
- Base URL（必填）
- 自定义查询参数（可选）：JSON 格式

**示例：**

```
配置名称: 自定义 OpenAI 兼容服务
模型: custom-model-v1
API Key: custom-xxxxxxxxxxxxxxxx
Base URL: https://api.custom-openai.com
自定义查询参数: {"temperature": 0.7, "max_tokens": 2000}
```

## 页面截图说明

根据提供的示例图片，页面应该包含：

1. **顶部区域**：已配置模型列表
   - 显示模型名称（如 Gemini 2.5 Flash、Sonnet 4.5 等）
   - 每个模型右侧有启用/禁用开关
   - "View All Models" 链接查看所有模型

2. **中间区域**：API Keys 配置区
   - 折叠面板展示不同提供商的配置
   - OpenAI API Key 配置
   - Anthropic API Key 配置
   - Google API Key 配置
   - Azure OpenAI 配置（包含 Base URL、Deployment Name、API Key）
   - AWS Bedrock 配置（包含 Access Key ID、Secret Access Key、Region、Test Model）

3. **配置表单特点**：
   - 每个提供商有独立的配置区域
   - 支持启用/禁用开关
   - 输入框带有占位符提示
   - 敏感信息（API Key）使用密码输入框

## 技术实现

### 文件结构

```
src/pages/model-settings/
├── index.tsx                          # 页面主文件
├── components/
│   ├── ModelConfigList/
│   │   └── index.tsx                  # 模型列表组件
│   └── ModelConfigForm/
│       └── index.tsx                  # 配置表单组件
```

### 核心功能

1. **动态表单**：根据选择的提供商动态渲染不同的配置字段
2. **状态管理**：使用 React Query 管理服务端状态
3. **表单验证**：使用 Ant Design Form 进行表单验证
4. **乐观更新**：启用/禁用操作使用乐观更新提升用户体验

### 使用的技术栈

- React 18 + TypeScript
- Ant Design 5
- TanStack Query (React Query)
- Tailwind CSS

## 使用说明

### 创建新配置

1. 在"模型配置"卡片中填写配置名称
2. 选择模型提供商
3. 填写模型标识
4. 根据提供商填写相应的配置字段
5. 点击"创建配置"按钮

### 管理现有配置

1. 在"已配置模型列表"中查看所有配置
2. 使用开关快速启用/禁用模型
3. 点击"编辑"按钮修改配置
4. 点击"删除"按钮删除配置（需确认）

## 注意事项

1. **API Key 安全**：API Key 会被加密存储，不会在列表中显示
2. **Base URL 格式**：必须是有效的 URL 格式
3. **JSON 格式**：自定义查询参数必须是有效的 JSON 格式
4. **权限控制**：
   - 平台管理员可以管理所有租户的配置
   - 租户管理员只能管理自己租户的配置

## 相关 API

- `GET /model-configurations` - 获取模型配置列表
- `POST /model-configurations` - 创建模型配置
- `PUT /model-configurations/:id` - 更新模型配置
- `PATCH /model-configurations/:id/status` - 更新配置状态
- `DELETE /model-configurations/:id` - 删除模型配置
- `POST /model-configurations/:id/validate` - 验证模型配置
