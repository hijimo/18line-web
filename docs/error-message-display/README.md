# 错误信息显示功能

## 概述

在聊天消息中显示接口返回的错误信息，当 AI 响应失败时，用户可以清晰地看到错误原因。

## 功能特性

- 自动解析错误信息格式
- 显示错误代码、错误消息和状态
- 友好的错误提示样式
- 支持多种错误格式解析

## 错误信息格式

系统支持解析以下格式的错误信息：

### 格式 1: 结构化错误字符串

```
Error 503, Message: The model is overloaded. Please try again later., Status: UNAVAILABLE, Details: []
```

解析结果：

- 错误代码: 503
- 错误消息: The model is overloaded. Please try again later.
- 状态: UNAVAILABLE

### 格式 2: JSON 格式错误

```json
{
  "message": "请求失败",
  "code": "500"
}
```

### 格式 3: 纯文本错误

```
网络连接失败
```

## 实现细节

### 类型定义

错误信息存储在 `MessageDetailResponse` 类型的 `error` 字段中：

```typescript
export interface MessageDetailResponse {
  content?: string;
  error?: string;  // 错误信息字段
  // ... 其他字段
}
```

### 错误解析函数

`parseErrorMessage` 函数负责解析不同格式的错误信息：

```typescript
const parseErrorMessage = (error: string): { 
  code?: string; 
  message: string; 
  status?: string 
} => {
  // 解析逻辑
}
```

### 显示逻辑

在 `Message` 组件中：

1. 检查消息是否包含 `error` 字段
2. 如果有错误，使用 `parseErrorMessage` 解析
3. 在消息内容上方显示错误信息卡片
4. 错误信息包含：
   - 错误图标 (⚠️)
   - 错误标题（显示错误代码）
   - 错误消息
   - 错误状态（如果有）

## 样式设计

错误信息使用红色主题的卡片样式：

- 背景色: `#fff2f0` (浅红色)
- 边框色: `#ffccc7` (红色)
- 标题色: `#cf1322` (深红色)
- 消息色: `#595959` (深灰色)
- 状态色: `#8c8c8c` (灰色)

## 使用示例

当接口返回包含错误的消息时：

```json
{
  "id": "b52dbdef-9821-427a-ba63-5e7cdd56fe5f",
  "sessionId": "75ec8292-184a-41cc-9fd2-9cc0a0a8b089",
  "role": "assistant",
  "content": "",
  "error": "Error 503, Message: The model is overloaded. Please try again later., Status: UNAVAILABLE, Details: []"
}
```

用户将看到：

```
⚠️ 错误 503
The model is overloaded. Please try again later.
状态: UNAVAILABLE
```

## 技术栈

- React 18
- TypeScript
- Ant Design 5
- CSS Modules

## 相关文件

- `src/pages/chat/components/Message/index.tsx` - 消息组件
- `src/pages/chat/components/Message/index.module.css` - 消息样式
- `src/types/api/messageDetailResponse.ts` - 消息类型定义

## 注意事项

- 错误信息会在消息内容上方显示
- 如果消息既有错误又有内容，两者都会显示
- 错误解析失败时，会显示原始错误文本
- 样式在移动端会自动适配
