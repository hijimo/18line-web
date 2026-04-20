# 模型选择器更新日志

## v1.1.0 - 2024-12-08

### 新增功能

- ✅ 添加 `valueField` 属性，支持配置保存和传递的字段
  - 默认值为 `"model"`（模型标识）
  - 可设置为 `"id"`（模型配置 UUID，推荐）
  - 可设置为 `"name"`（模型配置名称）
  - 或任何 `ModelConfiguration` 接口的字段

### 改进

- ✅ 更灵活的值管理机制
- ✅ 更好的类型安全性
- ✅ 统一的 localStorage 键名：`selected_model_value`

### 使用示例

```typescript
// 使用模型配置 ID（推荐）
<ModelSelector 
  onChange={handleModelChange}
  valueField="id"
/>

// 使用模型标识（默认）
<ModelSelector 
  onChange={handleModelChange}
  valueField="model"
/>

// 使用模型名称
<ModelSelector 
  onChange={handleModelChange}
  valueField="name"
/>
```

### 迁移指南

如果你之前使用了默认配置，现在需要显式指定 `valueField="id"` 以保持相同的行为：

```typescript
// 之前（隐式使用 id）
<ModelSelector onChange={handleModelChange} />

// 现在（显式指定）
<ModelSelector onChange={handleModelChange} valueField="id" />
```

### 技术细节

1. **localStorage 键名变更**：
   - 旧：`selected_model_id`
   - 新：`selected_model_value`
   - 用户需要重新选择模型（一次性影响）

2. **回调参数变更**：
   - 旧：`onChange(modelId: string, model: ModelConfiguration)`
   - 新：`onChange(value: string, model: ModelConfiguration)`
   - `value` 的含义由 `valueField` 决定

3. **内部状态变更**：
   - 旧：`selectedModelId`
   - 新：`selectedValue`
   - 更准确地反映了实际存储的内容

---

## v1.0.0 - 2024-12-08

### 初始版本

- ✅ 基础模型选择功能
- ✅ localStorage 持久化
- ✅ 自动选择第一个可用模型
- ✅ 加载和错误状态处理
- ✅ 完整的 TypeScript 类型定义
- ✅ 与聊天输入框集成
- ✅ API 请求集成
