# API 配置卡片功能

## 概述

模型设置页面已更新，现在使用卡片式布局展示各个 API 提供商的配置，提供更直观的配置管理体验。

## 功能特性

### 1. API 配置卡片展示

页面顶部以卡片形式展示以下 API 提供商的配置：

- **OpenAI API** - OpenAI 官方 API 配置
- **Anthropic API** - Anthropic Claude 系列模型配置
- **Google AI API** - Google Gemini 系列模型配置
- **Azure OpenAI API** - 微软 Azure OpenAI 服务配置
- **百炼 API** - 阿里云百炼平台配置

### 2. 配置状态显示

每个卡片显示：

- 提供商名称和标识
- 配置状态（已配置/未配置）
- Base URL（如果有）
- 模型信息
- 操作按钮（配置/编辑、验证）

### 3. 添加自定义配置

在所有预设 API 卡片下方，提供"添加自定义配置"按钮，支持添加自定义 OpenAI 兼容的 API 端点。

### 4. 配置抽屉

点击"配置"或"编辑"按钮会打开配置抽屉，支持：

- 创建新配置
- 编辑现有配置
- 根据不同提供商显示对应的配置字段
- 编辑模式下 API Key 可选（留空保持不变）

## 组件结构

```
src/pages/model-settings/
├── index.tsx                          # 主页面
└── components/
    ├── ApiConfigSection/              # API 配置区域
    │   └── index.tsx
    ├── ApiConfigCard/                 # 单个 API 配置卡片
    │   └── index.tsx
    ├── ConfigDrawer/                  # 配置抽屉
    │   └── index.tsx
    ├── ModelConfigList/               # 模型配置列表（原有）
    │   └── index.tsx
    └── ModelConfigForm/               # 模型配置表单（已弃用）
        └── index.tsx
```

## 使用说明

### 配置新的 API

1. 在对应的 API 卡片上点击"配置"按钮
2. 在打开的抽屉中填写配置信息：
   - 配置名称
   - 模型标识
   - API Key
   - Base URL（部分提供商需要）
   - 其他特定配置
3. 点击"创建"按钮保存配置

### 编辑现有配置

1. 在已配置的 API 卡片上点击"编辑"按钮
2. 修改需要更新的字段
3. API Key 字段可以留空（保持原有配置不变）
4. 点击"更新"按钮保存更改

### 验证配置

点击卡片上的"验证"按钮可以测试 API 配置是否正确。

### 添加自定义配置

1. 点击"添加自定义配置"按钮
2. 选择"Custom OpenAI"作为提供商
3. 填写自定义 API 的配置信息
4. 点击"创建"按钮保存

## 技术实现

### API 配置卡片组件

`ApiConfigCard` 组件负责展示单个 API 提供商的配置状态：

```tsx
<ApiConfigCard
  provider="openai"
  providerLabel="OpenAI API"
  tagColor="green"
  configured={true}
  apiKey="已配置"
  baseUrl="https://api.openai.com"
  extraConfig={{ 模型: "gpt-4" }}
  onEdit={() => handleEdit()}
  onValidate={() => handleValidate()}
/>
```

### 配置抽屉组件

`ConfigDrawer` 组件提供统一的配置编辑界面，根据不同的提供商动态渲染对应的表单字段。

### 数据管理

使用 React Query hooks 管理配置数据：

- `useModelConfigurations` - 获取配置列表
- `useCreateModelConfiguration` - 创建配置
- `useUpdateModelConfiguration` - 更新配置
- `useValidateModelConfiguration` - 验证配置

## 注意事项

1. **API Key 安全性**：出于安全考虑，API 返回的配置数据不包含 API Key，编辑时需要重新输入或留空保持不变
2. **提供商锁定**：编辑模式下不能更改提供商类型
3. **必填字段**：不同提供商有不同的必填字段要求
4. **Azure OpenAI**：需要额外配置 Deployment Name 和 API Version

## 后续优化

- [ ] 支持批量导入配置
- [ ] 配置模板功能
- [ ] 配置历史记录
- [ ] 更详细的验证结果展示
