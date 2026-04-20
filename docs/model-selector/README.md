# 模型选择器功能

## 概述

在聊天输入框的左下角添加了模型选择器组件，允许用户在发送消息前选择要使用的 AI 模型。选择的模型会被持久化保存到 localStorage，下次打开应用时会自动恢复上次的选择。

## 功能特性

- **模型列表获取**：通过 `getModelConfigurationsAvailable` API 获取当前租户下所有可用的模型配置
- **下拉选择**：使用 Ant Design Dropdown 组件实现模型选择交互
- **持久化存储**：选中的模型 ID 保存到 localStorage，刷新页面后自动恢复
- **自动选择**：首次使用时自动选择第一个可用模型
- **状态同步**：模型选择状态通过回调函数传递到父组件

## 技术实现

### 组件结构

```
src/pages/chat/components/
├── ModelSelector/           # 模型选择器组件
│   ├── index.tsx           # 组件实现
│   └── index.module.css    # 组件样式
├── ChatInput/              # 聊天输入组件（已更新）
│   ├── index.tsx
│   └── index.module.css
└── ChatUI/                 # 聊天界面组件（已更新）
    ├── index.tsx
    └── index.module.css
```

### 核心组件

#### ModelSelector

**位置**：`src/pages/chat/components/ModelSelector/index.tsx`

**功能**：

- 使用 `useAvailableModelConfigurations` hook 获取可用模型列表
- 使用 localStorage 持久化存储选中的模型 ID
- 提供 Dropdown 下拉菜单供用户选择模型
- 通过 `onChange` 回调通知父组件模型变化

**Props**：

```typescript
interface ModelSelectorProps {
  /** 模型变化回调 */
  onChange?: (value: string, model: ModelConfiguration) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 保存时使用的字段名，默认为 "model" */
  valueField?: keyof ModelConfiguration;
}
```

**valueField 说明**：

- 默认值为 `"model"`，表示使用模型标识（如 "gpt-4"）作为选择值
- 可以设置为 `"id"`，使用模型配置的 UUID 作为选择值（推荐）
- 可以设置为 `"name"`，使用模型配置名称作为选择值
- 选择的值会被保存到 localStorage 并通过 onChange 回调传递

**状态管理**：

- 使用 `useState` 管理当前选中的模型值
- 使用 `useMemo` 缓存模型列表和选中的模型对象
- 使用 `useCallback` 优化事件处理函数

#### ChatInput（已更新）

**更新内容**：

- 添加 `onModelChange` prop 接收模型变化回调
- 在 TextArea 左下角集成 ModelSelector 组件
- 调整样式以容纳模型选择器

**新增 Props**：

```typescript
interface ChatInputProps {
  // ... 其他 props
  /** 模型变化回调 */
  onModelChange?: (modelId: string, model: ModelConfiguration) => void;
}
```

#### ChatUI（已更新）

**更新内容**：

- 添加 `selectedModelId` 状态管理当前选中的模型
- 添加 `handleModelChange` 处理模型变化
- 在 `onSendMessage` 回调中传递 modelId 参数
- 将 `onModelChange` 传递给 ChatInput 组件

**更新的 Props**：

```typescript
interface ChatUIProps {
  // ... 其他 props
  /** 发送消息回调（新增 modelId 参数） */
  onSendMessage?: (content: string, modelId?: string) => void;
}
```

## API 集成

### 使用的 Hook

**`useAvailableModelConfigurations`**

- **位置**：`src/hooks/useModelConfigurations.ts`
- **功能**：获取当前租户下所有可用的模型配置
- **API 端点**：`GET /model-configurations/available`
- **返回数据**：

  ```typescript
  {
    data: ModelConfiguration[]  // 可用模型列表
  }
  ```

### ModelConfiguration 类型

```typescript
interface ModelConfiguration {
  id?: string;                    // 配置 ID
  name?: string;                  // 配置名称
  model?: string;                 // 模型标识（如：gpt-4）
  modelProvider?: string;         // 模型提供商（如：openai）
  baseUrl?: string;               // API 基础 URL
  isEnabled?: boolean;            // 是否启用
  tenantId?: string;              // 租户 ID
  createdAt?: string;
  updatedAt?: string;
}
```

### 发送消息时的 API 请求

当用户发送消息时，选中的模型 ID 会通过以下方式传递到后端：

```typescript
// 请求体结构
interface SendMessageRequestBody {
  message: string;      // 消息内容
  sessionId: string;    // 会话 ID
  options?: {
    modelName?: string; // 模型配置 ID（注意：字段名是 modelName，但传递的是配置 ID）
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
  };
}
```

**重要说明**：

- 前端传递的 `modelId` 实际上是模型配置的 UUID
- 在 API 请求中，这个 ID 被放入 `options.modelName` 字段
- 后端会根据这个 ID 从 `model_configurations` 表中查询配置
- 如果不传递 `modelName`，后端会使用会话的默认模型

## 数据流

```
1. 用户打开聊天页面
   ↓
2. ModelSelector 组件挂载
   ↓
3. useAvailableModelConfigurations 获取可用模型列表
   ↓
4. 从 localStorage 读取上次选择的模型 ID
   ↓
5. 如果没有选择，自动选择第一个模型
   ↓
6. 用户点击模型选择器
   ↓
7. 显示下拉菜单，展示所有可用模型
   ↓
8. 用户选择模型
   ↓
9. 更新 selectedModelId 状态
   ↓
10. 保存到 localStorage
    ↓
11. 通过 onChange 回调通知 ChatInput
    ↓
12. ChatInput 通知 ChatUI
    ↓
13. ChatUI 更新 selectedModelId 状态
    ↓
14. 用户发送消息时，携带 modelId 参数
    ↓
15. useChatHandler 将 modelId 传递给 useStreamResponse
    ↓
16. useStreamResponse 从 localStorage 读取持久化的 modelId（如果没有传入）
    ↓
17. 将 modelId 作为 options.modelName 传递给后端 API
    ↓
18. 后端根据 modelId 查找对应的模型配置并使用该模型
```

## 样式设计

### 布局

- 模型选择器位于 TextArea 左下角
- 使用绝对定位，不影响输入框的正常使用
- TextArea 底部留出 36px 空间容纳选择器

### 交互

- 按钮大小：`small`
- 悬停效果：背景色变化
- 禁用状态：灰色显示，不可点击
- 加载状态：显示 Spin 组件

### 菜单项

- 显示模型名称（主标题）
- 显示模型提供商和模型标识（副标题）
- 选中项高亮显示

## 使用示例

### 在页面中使用

```typescript
import { ChatUI } from '@/pages/chat/components/ChatUI';

const ChatPage = () => {
  const handleSendMessage = (content: string, modelId?: string) => {
    console.log('发送消息:', content);
    console.log('使用模型:', modelId);
    // 调用发送消息 API
  };

  return (
    <ChatUI
      sessionId="session-id"
      onSendMessage={handleSendMessage}
      // ... 其他 props
    />
  );
};
```

### 单独使用 ModelSelector

```typescript
import { ModelSelector } from '@/pages/chat/components/ModelSelector';

const MyComponent = () => {
  const handleModelChange = (value: string, model: ModelConfiguration) => {
    console.log('选择的值:', value);
    console.log('选择的模型:', model);
  };

  return (
    <>
      {/* 使用模型 ID 作为值（推荐） */}
      <ModelSelector 
        onChange={handleModelChange}
        disabled={false}
        valueField="id"
      />

      {/* 使用模型标识作为值（默认） */}
      <ModelSelector 
        onChange={handleModelChange}
        disabled={false}
        valueField="model"
      />

      {/* 使用模型名称作为值 */}
      <ModelSelector 
        onChange={handleModelChange}
        disabled={false}
        valueField="name"
      />
    </>
  );
};
```

## 注意事项

1. **权限控制**：API 会根据用户权限返回可用模型，租户管理员只能看到自己租户的模型
2. **错误处理**：如果 API 请求失败，组件会显示"无可用模型"
3. **加载状态**：在获取模型列表时显示加载动画
4. **持久化**：使用 localStorage 存储（键：`selected_model_value`），清除浏览器数据会重置选择
5. **自动选择**：首次使用或没有保存的选择时，自动选择第一个可用模型
6. **可配置的值字段**：
   - 通过 `valueField` 属性配置保存和传递的字段
   - 默认为 `"model"`（模型标识，如 "gpt-4"）
   - 推荐使用 `"id"`（模型配置 UUID）以确保唯一性
   - 也可以使用 `"name"`（模型配置名称）
7. **模型值传递**：
   - 前端传递的值由 `valueField` 决定
   - 在当前实现中，使用 `valueField="id"` 传递模型配置的 UUID
   - 在 API 请求中，这个值被放入 `options.modelName` 字段
   - 后端会根据这个值查找对应的模型配置
8. **双重保障**：
   - 如果用户在 UI 中选择了模型，使用选择的值
   - 如果没有传递值，从 localStorage 读取持久化的值
   - 这确保了即使组件状态丢失，也能使用用户上次选择的模型

## 后续优化建议

1. **模型分组**：如果模型数量较多，可以按提供商分组显示
2. **模型详情**：在下拉菜单中显示更多模型信息（如支持的功能、价格等）
3. **快捷键**：支持键盘快捷键切换模型
4. **最近使用**：记录最近使用的模型，优先显示
5. **模型推荐**：根据会话类型推荐合适的模型
6. **全局设置**：在用户设置中配置默认模型
