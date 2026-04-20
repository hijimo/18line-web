# 聊天会话页面设计文档

## 概述

本设计文档描述了如何将 chatbot-ui-main 项目中的聊天会话页面移植到当前系统中。该功能将提供完整的聊天交互界面，支持消息发送接收、流式响应、文件上传、Markdown 渲染等核心功能。

### 设计目标

1. **功能完整性**: 保留原项目的核心聊天功能
2. **技术适配**: 适配当前项目的技术栈（Ant Design、Zustand、React Query）
3. **用户体验**: 提供流畅的聊天交互体验
4. **可维护性**: 保持代码结构清晰，易于扩展

### 技术栈映射

| 原项目 | 当前项目 | 说明 |
|--------|---------|------|
| Next.js App Router | React Router 7.6 | 路由系统 |
| Context API | Zustand + React Query | 状态管理 |
| Tailwind CSS | Tailwind CSS 4.1 + CSS Modules | 样式方案 |
| 自定义 UI 组件 | Ant Design 5.25 | UI 组件库 |
| Supabase Client | Axios + React Query | API 调用 |
| react-i18next | 待定 | 国际化方案 |

## 架构设计

### 页面布局设计

采用左右分栏布局，会话列表和聊天界面在同一个页面：

```
┌─────────────────────────────────────────────────────┐
│                    Header                           │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│   会话列表    │          聊天界面                     │
│   (左侧栏)    │        (主内容区)                     │
│              │                                      │
│  - 新建会话   │   ┌──────────────────────────┐      │
│  - 搜索框     │   │     ChatHeader           │      │
│  - 会话项1    │   ├──────────────────────────┤      │
│  - 会话项2    │   │                          │      │
│  - 会话项3    │   │     ChatMessages         │      │
│  - ...       │   │                          │      │
│              │   ├──────────────────────────┤      │
│              │   │     ChatInput            │      │
│              │   └──────────────────────────┘      │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

**设计决策**：

- 左侧栏宽度固定 280px，可折叠
- 主内容区自适应剩余宽度
- 移动端时左侧栏收起为抽屉模式
- 会话列表支持置顶、归档、搜索功能

### 目录结构

```
src/
├── pages/
│   └── chat/
│       ├── index.tsx                    # 聊天页面主入口（包含列表和详情）
│       └── components/
│           ├── SessionList/             # 会话列表组件
│           │   ├── index.tsx
│           │   └── index.module.css
│           ├── SessionItem/             # 会话列表项
│           │   ├── index.tsx
│           │   └── index.module.css
│           ├── ChatUI/                  # 聊天 UI 主组件
│           │   ├── index.tsx
│           │   └── index.module.css
│           ├── ChatInput/               # 消息输入组件
│           │   ├── index.tsx
│           │   └── index.module.css
│           ├── ChatMessages/            # 消息列表组件
│           │   ├── index.tsx
│           │   └── index.module.css
│           ├── Message/                 # 单条消息组件
│           │   ├── index.tsx
│           │   └── index.module.css
│           ├── MessageMarkdown/         # Markdown 渲染组件
│           │   └── index.tsx
│           ├── MessageCodeBlock/        # 代码块组件
│           │   ├── index.tsx
│           │   └── index.module.css
│           ├── ChatScrollButtons/       # 滚动控制按钮
│           │   ├── index.tsx
│           │   └── index.module.css
│           ├── ChatHeader/              # 聊天头部组件
│           │   ├── index.tsx
│           │   └── index.module.css
│           ├── ChatSettings/            # 聊天设置面板
│           │   ├── index.tsx
│           │   └── index.module.css
│           ├── FilePicker/              # 文件选择器
│           │   ├── index.tsx
│           │   └── index.module.css
│           ├── AssistantPicker/         # 助手选择器
│           │   └── index.tsx
│           └── ToolPicker/              # 工具选择器
│               └── index.tsx
├── hooks/
│   └── chat/
│       ├── useChatHandler.ts            # 聊天消息处理
│       ├── useScroll.ts                 # 滚动控制
│       ├── useChatHistory.ts            # 聊天历史导航
│       ├── useFileHandler.ts            # 文件处理
│       └── useStreamResponse.ts         # 流式响应处理
├── stores/
│   └── chatStore.ts                     # 聊天状态管理
├── services/
│   └── api/
│       ├── sessions/
│       │   └── sessions.ts              # 会话 API（已生成）
│       ├── messages/
│       │   └── messages.ts              # 消息 API（已生成）
│       └── files/
│           └── files.ts                 # 文件 API（待实现）
└── types/
    └── chat.ts                          # 聊天相关类型定义
```

### 组件层次结构

```
ChatPage
├── SessionList (左侧栏)
│   ├── NewSessionButton
│   ├── SearchInput
│   └── SessionItem[]
│       ├── SessionTitle
│       ├── SessionPreview
│       ├── PinButton
│       ├── ArchiveButton
│       └── DeleteButton
└── ChatUI (主内容区)
    ├── ChatHeader
    │   ├── SessionTitle
    │   ├── ToggleSidebarButton
    │   └── SettingsButton
    ├── ChatMessages
    │   └── Message[]
    │       ├── MessageMarkdown
    │       └── MessageCodeBlock
    ├── ChatScrollButtons
    │   ├── ScrollToTopButton
    │   └── ScrollToBottomButton
    ├── ChatInput
    │   ├── FilePicker
    │   ├── AssistantPicker
    │   ├── ToolPicker
    │   ├── TextArea
    │   └── SendButton
    └── ChatSettings (Drawer)
        ├── ModelSelect
        ├── TemperatureSlider
        ├── ContextLengthInput
        └── SystemPromptTextArea
```

## 数据模型

### 核心数据结构

```typescript
// 聊天会话
interface ChatSession {
  id: string
  userId: string
  title: string
  model: string
  temperature: number
  contextLength: number
  systemPrompt?: string
  assistantId?: string
  createdAt: string
  updatedAt: string
}

// 聊天消息
interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: MessageImage[]
  files?: FileItem[]
  createdAt: string
  updatedAt: string
}

// 消息图片
interface MessageImage {
  id: string
  messageId: string
  url: string
  base64?: string
  fileName: string
  fileSize: number
}

// 文件项
interface FileItem {
  id: string
  name: string
  type: string
  size: number
  url: string
  uploadedAt: string
}

// 聊天设置
interface ChatSettings {
  model: string
  temperature: number
  contextLength: number
  systemPrompt?: string
  enableRetrieval: boolean
  retrievalCount: number
}

// 助手
interface Assistant {
  id: string
  name: string
  description: string
  model: string
  systemPrompt: string
  tools: Tool[]
}

// 工具
interface Tool {
  id: string
  name: string
  description: string
  enabled: boolean
}
```

### 状态管理设计

使用 Zustand 管理全局聊天状态：

```typescript
interface ChatStore {
  // 当前会话
  currentSession: ChatSession | null
  setCurrentSession: (session: ChatSession | null) => void
  
  // 消息列表
  messages: ChatMessage[]
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  updateMessage: (id: string, content: string) => void
  deleteMessage: (id: string) => void
  
  // 用户输入
  userInput: string
  setUserInput: (input: string) => void
  
  // 生成状态
  isGenerating: boolean
  setIsGenerating: (generating: boolean) => void
  
  // 聊天设置
  chatSettings: ChatSettings
  updateChatSettings: (settings: Partial<ChatSettings>) => void
  
  // 选中的助手和工具
  selectedAssistant: Assistant | null
  setSelectedAssistant: (assistant: Assistant | null) => void
  selectedTools: Tool[]
  setSelectedTools: (tools: Tool[]) => void
  
  // 文件和图片
  selectedFiles: FileItem[]
  setSelectedFiles: (files: FileItem[]) => void
  selectedImages: MessageImage[]
  setSelectedImages: (images: MessageImage[]) => void
}
```

## 组件设计

### ChatPage (主页面)

**职责**:

- 页面整体布局（左右分栏）
- 会话列表和聊天界面协调
- 当前会话状态管理

**Props**: 无

**关键逻辑**:

```typescript
// 1. 加载会话列表
// 2. 从 URL query 参数或 store 获取当前选中的 sessionId
// 3. 加载当前会话的消息
// 4. 处理会话切换
// 5. 渲染 SessionList 和 ChatUI 组件
```

**设计决策**:

- 使用 URL query 参数 `?sessionId=xxx` 标识当前会话，支持分享和刷新
- 使用 React Query 的 `useQuery` 进行数据获取和缓存
- 页面级别的错误边界处理
- 加载状态使用 Ant Design 的 Spin 组件
- 左侧栏折叠状态保存到 localStorage

### SessionList (会话列表)

**职责**:

- 展示会话列表
- 会话搜索
- 会话操作（新建、置顶、归档、删除）

**Props**:

```typescript
interface SessionListProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onCreateSession: () => Promise<void>
  onDeleteSession: (sessionId: string) => Promise<void>
  onPinSession: (sessionId: string, pinned: boolean) => Promise<void>
  onArchiveSession: (sessionId: string, archived: boolean) => Promise<void>
  loading: boolean
}
```

**功能设计**:

- 会话按置顶、时间排序
- 支持关键词搜索（调用搜索 API）
- 显示会话标题和最后一条消息预览
- 当前选中会话高亮显示
- 悬停显示操作按钮（置顶、归档、删除）

**设计决策**:

- 使用虚拟滚动优化大量会话的渲染性能
- 搜索使用防抖，避免频繁请求
- 置顶会话显示在列表顶部，使用不同背景色区分

### SessionItem (会话列表项)

**职责**:

- 渲染单个会话项
- 会话操作按钮

**Props**:

```typescript
interface SessionItemProps {
  session: ChatSession
  isActive: boolean
  onClick: () => void
  onPin: (pinned: boolean) => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
}
```

**样式设计**:

- 选中状态：蓝色背景
- 置顶会话：显示图钉图标
- 悬停时显示操作按钮
- 显示会话标题和最后消息时间

### ChatUI (聊天界面)

**职责**:

- 聊天界面布局
- 消息列表和输入框协调
- 滚动控制

**Props**:

```typescript
interface ChatUIProps {
  sessionId: string
  messages: ChatMessage[]
  onSendMessage: (content: string) => Promise<void>
  isGenerating: boolean
}
```

**布局设计**:

```
┌─────────────────────────────────────┐
│          ChatHeader                 │
├─────────────────────────────────────┤
│                                     │
│                                     │
│         ChatMessages                │
│         (滚动区域)                   │
│                                     │
│                                     │
├─────────────────────────────────────┤
│         ChatInput                   │
└─────────────────────────────────────┘
```

**设计决策**:

- 使用 Flexbox 布局，消息区域自动填充剩余空间
- 消息区域使用 `overflow-y: auto` 实现滚动
- 输入框固定在底部

### ChatMessages (消息列表)

**职责**:

- 渲染消息列表
- 虚拟滚动优化（可选）
- 消息分组显示

**Props**:

```typescript
interface ChatMessagesProps {
  messages: ChatMessage[]
  isGenerating: boolean
  onEditMessage: (messageId: string) => void
  onDeleteMessage: (messageId: string) => void
}
```

**设计决策**:

- 使用 `react-window` 或 `react-virtualized` 进行虚拟滚动（消息数量 > 100 时）
- 用户消息右对齐，AI 消息左对齐
- 消息之间使用时间戳分隔（相隔 > 5 分钟时显示）

### Message (单条消息)

**职责**:

- 渲染单条消息
- 消息操作按钮（编辑、删除、复制）
- 文件和图片展示

**Props**:

```typescript
interface MessageProps {
  message: ChatMessage
  isUser: boolean
  onEdit?: () => void
  onDelete?: () => void
}
```

**样式设计**:

- 用户消息: 蓝色背景（teal 主题色），白色文字，右对齐
- AI 消息: 灰色背景，黑色文字，左对齐
- 悬停时显示操作按钮
- 使用 Ant Design 的 Avatar 组件显示头像

### MessageMarkdown (Markdown 渲染)

**职责**:

- Markdown 内容渲染
- 代码块语法高亮
- 链接处理

**依赖库**:

- `react-markdown`: Markdown 解析和渲染
- `remark-gfm`: GitHub Flavored Markdown 支持
- `rehype-highlight`: 代码语法高亮

**设计决策**:

- 使用 `react-markdown` 而非 `marked` 以获得更好的 React 集成
- 代码块使用 `highlight.js` 进行语法高亮
- 自定义渲染器以适配 Ant Design 样式

### MessageCodeBlock (代码块)

**职责**:

- 代码块渲染
- 语法高亮
- 复制功能

**Props**:

```typescript
interface MessageCodeBlockProps {
  code: string
  language: string
}
```

**设计决策**:

- 使用 `highlight.js` 进行语法高亮
- 提供一键复制按钮
- 显示语言标签
- 支持代码折叠（行数 > 20 时）

### ChatInput (消息输入)

**职责**:

- 文本输入
- 文件上传
- 图片粘贴
- 快捷键处理

**Props**:

```typescript
interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  isGenerating: boolean
  disabled: boolean
}
```

**功能设计**:

- 使用 Ant Design 的 TextArea 组件
- 自动高度调整（最大 200px）
- Enter 发送，Shift+Enter 换行
- 支持图片粘贴（检测 clipboard 事件）
- 文件拖拽上传

**设计决策**:

- 使用受控组件模式
- 输入框状态由父组件管理
- 快捷键使用 `useHotkey` hook 统一管理

### ChatScrollButtons (滚动按钮)

**职责**:

- 滚动到顶部/底部
- 按钮显示/隐藏控制

**Props**:

```typescript
interface ChatScrollButtonsProps {
  containerRef: React.RefObject<HTMLDivElement>
  showScrollToTop: boolean
  showScrollToBottom: boolean
}
```

**设计决策**:

- 使用 Ant Design 的 FloatButton 组件
- 按钮位置固定在右下角
- 平滑滚动动画

### ChatSettings (设置面板)

**职责**:

- 聊天参数配置
- 模型选择
- 助手和工具管理

**Props**:

```typescript
interface ChatSettingsProps {
  open: boolean
  onClose: () => void
  settings: ChatSettings
  onUpdate: (settings: Partial<ChatSettings>) => void
}
```

**设计决策**:

- 使用 Ant Design 的 Drawer 组件
- 从右侧滑出
- 实时保存设置（使用防抖）

## Hooks 设计

### useChatHandler

**职责**: 处理聊天消息的发送、编辑、删除等核心逻辑

**接口**:

```typescript
interface UseChatHandlerReturn {
  sendMessage: (content: string) => Promise<void>
  editMessage: (messageId: string, newContent: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  stopGeneration: () => void
  regenerateMessage: (messageId: string) => Promise<void>
}

function useChatHandler(sessionId: string): UseChatHandlerReturn
```

**实现要点**:

- 使用 React Query 的 `useMutation` 处理 API 调用
- 乐观更新：立即更新 UI，失败时回滚
- 错误处理和重试机制

### useStreamResponse

**职责**: 处理流式响应

**接口**:

```typescript
interface UseStreamResponseReturn {
  streamMessage: (content: string) => Promise<void>
  currentStreamContent: string
  isStreaming: boolean
  stopStream: () => void
}

function useStreamResponse(sessionId: string): UseStreamResponseReturn
```

**实现要点**:

- 使用 Server-Sent Events (SSE) 或 WebSocket 接收流式数据
- 实时更新消息内容
- 支持中断流式响应

### useScroll

**职责**: 管理消息列表滚动

**接口**:

```typescript
interface UseScrollReturn {
  messagesContainerRef: React.RefObject<HTMLDivElement>
  scrollToBottom: (smooth?: boolean) => void
  scrollToTop: (smooth?: boolean) => void
  showScrollToTop: boolean
  showScrollToBottom: boolean
}

function useScroll(messages: ChatMessage[]): UseScrollReturn
```

**实现要点**:

- 监听滚动事件，更新按钮显示状态
- 新消息到达时自动滚动到底部
- 使用 `IntersectionObserver` 优化性能

### useFileHandler

**职责**: 处理文件上传和管理

**接口**:

```typescript
interface UseFileHandlerReturn {
  selectedFiles: FileItem[]
  addFiles: (files: File[]) => Promise<void>
  removeFile: (fileId: string) => void
  uploadProgress: Record<string, number>
}

function useFileHandler(sessionId: string): UseFileHandlerReturn
```

**实现要点**:

- 文件类型和大小验证
- 上传进度跟踪
- 支持多文件上传

### useChatHistory

**职责**: 聊天历史导航

**接口**:

```typescript
interface UseChatHistoryReturn {
  navigateHistory: (direction: 'up' | 'down') => void
  currentHistoryIndex: number
}

function useChatHistory(sessionId: string): UseChatHistoryReturn
```

**实现要点**:

- 使用 Ctrl+Shift+↑/↓ 导航
- 缓存用户输入历史
- 循环导航

## API 设计

### 会话 API

使用 `src/services/api/sessions/sessions.ts` 中已生成的 API：

```typescript
import { getSessions } from '@/services/api/sessions/sessions'

const sessionsApi = getSessions()

// 获取会话列表
sessionsApi.getChatSessions({ 
  page: 1, 
  pageSize: 50,
  archived: false  // 不显示已归档的会话
})

// 创建新会话
sessionsApi.postChatSessions({
  title: '新会话',
  // 其他配置...
})

// 获取会话详情
sessionsApi.getChatSessionsId({ id: sessionId })

// 更新会话
sessionsApi.patchChatSessionsId(
  { id: sessionId },
  { title: '更新后的标题' }
)

// 删除会话（软删除）
sessionsApi.deleteChatSessionsId({ id: sessionId })

// 置顶会话
sessionsApi.postChatSessionsIdPin(
  { id: sessionId },
  { pinned: true }
)

// 归档会话
sessionsApi.postChatSessionsIdArchive(
  { id: sessionId },
  { archived: true }
)

// 搜索会话
sessionsApi.getChatSessionsSearch({
  keyword: '搜索关键词',
  page: 1,
  pageSize: 20
})
```

### 消息 API

使用 `src/services/api/messages/messages.ts` 中已生成的 API：

```typescript
import { getMessages } from '@/services/api/messages/messages'

const messagesApi = getMessages()

// 获取会话消息历史
messagesApi.getChatSessionsIdMessages(
  { id: sessionId },
  { page: 1, pageSize: 50 }
)

// 发送消息
messagesApi.postChatSessionsIdMessages(
  { id: sessionId },
  {
    content: '用户消息内容',
    // 其他参数...
  }
)

// 获取消息详情
messagesApi.getChatMessagesId({ id: messageId })

// 中止消息生成
messagesApi.postChatMessagesIdAbort({ id: messageId })
```

**注意事项**:

- 所有 API 调用通过 `orvalMutator` 统一处理
- 错误处理在 `orvalMutator` 中统一实现
- 使用 React Query 包装 API 调用以获得缓存和状态管理能力

### 文件 API

文件上传 API 需要单独实现（如果后端支持）：

```typescript
// src/services/api/files/files.ts
export const uploadFile = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  
  return orvalMutator<FileItem>({
    url: '/chat/files/upload',
    method: 'POST',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export const deleteFile = (fileId: string) => {
  return orvalMutator<{ success: boolean }>({
    url: `/chat/files/${fileId}`,
    method: 'DELETE'
  })
}
```

## 错误处理

### 错误类型

```typescript
enum ChatErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  MESSAGE_SEND_FAILED = 'MESSAGE_SEND_FAILED',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  STREAM_ERROR = 'STREAM_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
}

interface ChatError {
  type: ChatErrorType
  message: string
  details?: any
}
```

### 错误处理策略

1. **网络错误**: 显示重试按钮，支持自动重试（最多 3 次）
2. **会话不存在**: 重定向到会话列表页
3. **消息发送失败**: 保留用户输入，显示错误提示
4. **文件上传失败**: 显示具体错误原因，允许重新上传
5. **流式响应错误**: 保留已接收内容，显示错误提示

### 错误展示

- 使用 Ant Design 的 `message` 组件显示轻量级错误提示
- 使用 `notification` 组件显示需要用户操作的错误
- 使用 `Alert` 组件显示页面级错误

## 性能优化

### 渲染优化

1. **虚拟滚动**: 消息数量 > 100 时使用虚拟滚动
2. **消息分页**: 初始加载最近 50 条消息，向上滚动时加载更多
3. **Memo 优化**: 使用 `React.memo` 优化 Message 组件
4. **防抖节流**: 输入框使用防抖，滚动事件使用节流

### 数据优化

1. **React Query 缓存**: 利用 React Query 的缓存机制减少 API 调用
2. **乐观更新**: 发送消息时立即更新 UI
3. **增量更新**: 流式响应时增量更新消息内容
4. **懒加载**: 图片和文件使用懒加载

### 代码分割

```typescript
// 懒加载聊天设置面板
const ChatSettings = lazy(() => import('./components/ChatSettings'))

// 懒加载 Markdown 渲染器
const MessageMarkdown = lazy(() => import('./components/MessageMarkdown'))
```

## 测试策略

### 单元测试

- **Hooks 测试**: 使用 `@testing-library/react-hooks` 测试自定义 hooks
- **组件测试**: 使用 `@testing-library/react` 测试组件渲染和交互
- **工具函数测试**: 测试 Markdown 解析、文件处理等工具函数

### 集成测试

- **消息发送流程**: 测试从输入到发送到显示的完整流程
- **文件上传流程**: 测试文件选择、上传、显示的完整流程
- **流式响应**: 测试流式响应的接收和显示

### E2E 测试

使用 Playwright 进行端到端测试：

1. 打开聊天页面
2. 发送消息
3. 验证消息显示
4. 上传文件
5. 编辑消息
6. 删除消息

## 国际化支持

### 文本提取

将所有用户可见文本提取到语言文件：

```typescript
// locales/zh-CN/chat.json
{
  "chat.input.placeholder": "输入消息...",
  "chat.send": "发送",
  "chat.stop": "停止",
  "chat.newSession": "新建会话",
  "chat.settings": "设置",
  "chat.error.networkError": "网络错误，请重试",
  "chat.error.sessionNotFound": "会话不存在"
}
```

### 使用方式

```typescript
import { useTranslation } from 'react-i18next'

function ChatInput() {
  const { t } = useTranslation('chat')
  
  return (
    <Input.TextArea
      placeholder={t('input.placeholder')}
    />
  )
}
```

## 主题适配

### 颜色方案

使用当前系统的 teal 主题色：

```typescript
// theme/chat.ts
export const chatTheme = {
  primary: '#14b8a6', // teal-500
  primaryHover: '#0d9488', // teal-600
  userMessageBg: '#14b8a6',
  userMessageText: '#ffffff',
  aiMessageBg: '#f3f4f6', // gray-100
  aiMessageText: '#1f2937', // gray-800
  inputBorder: '#d1d5db', // gray-300
  inputFocus: '#14b8a6',
}
```

### CSS Modules

```css
/* ChatInput/index.module.css */
.chatInput {
  border-color: var(--chat-input-border);
}

.chatInput:focus {
  border-color: var(--chat-primary);
  box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.2);
}

.sendButton {
  background-color: var(--chat-primary);
  color: white;
}

.sendButton:hover {
  background-color: var(--chat-primary-hover);
}
```

## 安全考虑

### XSS 防护

1. **Markdown 渲染**: 使用 `react-markdown` 的安全模式，禁止 HTML 标签
2. **用户输入**: 所有用户输入在渲染前进行转义
3. **链接处理**: 外部链接添加 `rel="noopener noreferrer"`

### 文件上传安全

1. **文件类型验证**: 白名单验证文件类型
2. **文件大小限制**: 单文件最大 10MB
3. **文件扫描**: 后端进行病毒扫描（如果需要）

### API 安全

1. **认证**: 所有 API 请求携带认证 token
2. **权限验证**: 验证用户是否有权访问会话
3. **速率限制**: 防止消息发送过于频繁

## 可访问性

### 键盘导航

- Tab 键在输入框、按钮之间导航
- Enter 发送消息
- Shift+Enter 换行
- Ctrl+L 聚焦输入框
- Ctrl+Shift+↑/↓ 导航历史

### 屏幕阅读器

- 为所有交互元素添加 `aria-label`
- 消息列表使用 `role="log"` 和 `aria-live="polite"`
- 加载状态使用 `aria-busy`

### 对比度

- 确保文本和背景的对比度符合 WCAG AA 标准
- 用户消息和 AI 消息使用明显不同的颜色

## 移植适配清单

### UI 组件替换

| 原组件 | 替换为 | 说明 |
|--------|--------|------|
| Button | Ant Design Button | 统一使用 Ant Design 按钮 |
| Input | Ant Design Input.TextArea | 使用 Ant Design 输入框 |
| Tooltip | Ant Design Tooltip | 使用 Ant Design 提示框 |
| Dialog | Ant Design Modal | 使用 Ant Design 对话框 |
| Drawer | Ant Design Drawer | 使用 Ant Design 抽屉 |
| Select | Ant Design Select | 使用 Ant Design 选择器 |
| Slider | Ant Design Slider | 使用 Ant Design 滑块 |
| Avatar | Ant Design Avatar | 使用 Ant Design 头像 |
| Spin | Ant Design Spin | 使用 Ant Design 加载指示器 |

### 状态管理迁移

1. **Context → Zustand**: 将 Context API 状态迁移到 Zustand store
2. **本地状态**: 保留组件内部状态
3. **服务器状态**: 使用 React Query 管理

### 路由适配

```typescript
// 原路由: /[locale]/[workspaceid]/chat/[chatid]
// 新路由: /chat?sessionId=xxx

// 路由配置（在 src/router.tsx 中添加）
{
  path: '/chat',
  element: <ChatPage />,
}

// 使用 URL query 参数而非路径参数
// 优点：
// 1. 支持无 sessionId 的情况（显示空状态或创建新会话）
// 2. 更容易处理会话切换
// 3. 支持分享链接
```

### API 调用适配

```typescript
// 原: Supabase 客户端调用
const { data, error } = await supabase
  .from('messages')
  .select('*')
  .eq('chat_id', chatId)

// 新: 使用已生成的 API + React Query
import { getMessages } from '@/services/api/messages/messages'
import { useQuery } from '@tanstack/react-query'

const messagesApi = getMessages()

const { data, error, isLoading } = useQuery({
  queryKey: ['messages', sessionId],
  queryFn: () => messagesApi.getChatSessionsIdMessages(
    { id: sessionId },
    { page: 1, pageSize: 50 }
  ),
  enabled: !!sessionId, // 只有当 sessionId 存在时才执行查询
})
```

### 会话列表集成

```typescript
// 在主页面中同时加载会话列表和当前会话消息
import { getSessions } from '@/services/api/sessions/sessions'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'

function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentSessionId = searchParams.get('sessionId')
  
  const sessionsApi = getSessions()
  
  // 加载会话列表
  const { data: sessionsData } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.getChatSessions({ 
      page: 1, 
      pageSize: 50,
      archived: false 
    }),
  })
  
  // 加载当前会话消息
  const messagesApi = getMessages()
  const { data: messagesData } = useQuery({
    queryKey: ['messages', currentSessionId],
    queryFn: () => messagesApi.getChatSessionsIdMessages(
      { id: currentSessionId! },
      { page: 1, pageSize: 50 }
    ),
    enabled: !!currentSessionId,
  })
  
  // 切换会话
  const handleSelectSession = (sessionId: string) => {
    setSearchParams({ sessionId })
  }
  
  return (
    <div className="flex h-screen">
      <SessionList 
        sessions={sessionsData?.data || []}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
      />
      <ChatUI 
        sessionId={currentSessionId}
        messages={messagesData?.data || []}
      />
    </div>
  )
}
```

## 实现优先级

### P0 (核心功能)

1. 页面路由和基本布局
2. 消息列表展示
3. 消息发送和接收
4. Markdown 渲染
5. 基本错误处理

### P1 (重要功能)

1. 流式响应
2. 文件上传
3. 消息编辑
4. 滚动控制
5. 聊天设置

### P2 (增强功能)

1. 助手和工具选择
2. 图片粘贴
3. 快捷键支持
4. 虚拟滚动
5. RAG 支持

### P3 (优化功能)

1. 国际化
2. 主题切换
3. 离线支持
4. 消息搜索
5. 导出聊天记录

## 风险和挑战

### 技术风险

1. **流式响应实现**: SSE 或 WebSocket 的浏览器兼容性
2. **Markdown 渲染性能**: 大量消息时的渲染性能
3. **文件上传**: 大文件上传的稳定性

### 解决方案

1. **流式响应**: 提供降级方案，不支持时使用轮询
2. **渲染性能**: 使用虚拟滚动和懒加载
3. **文件上传**: 分片上传，支持断点续传

### 兼容性考虑

- 支持 Chrome、Firefox、Safari、Edge 最新两个版本
- 移动端支持 iOS Safari 和 Android Chrome
- 不支持 IE 11

## 后续扩展

### 可能的功能扩展

1. **语音输入**: 支持语音转文字
2. **消息搜索**: 全文搜索历史消息
3. **消息标注**: 标记重要消息
4. **会话分享**: 分享会话链接
5. **协作编辑**: 多人同时编辑会话
6. **消息导出**: 导出为 PDF、Markdown 等格式
7. **消息模板**: 预设常用消息模板
8. **快捷回复**: 快速插入常用回复

### 架构扩展性

- 组件设计遵循单一职责原则，易于扩展
- 使用 Hooks 封装业务逻辑，便于复用
- API 设计遵循 RESTful 规范，易于扩展
- 状态管理使用 Zustand，支持插件扩展

## 总结

本设计文档详细描述了聊天会话页面的架构、组件、数据模型、API 设计等各个方面。通过合理的技术选型和架构设计，确保功能的完整性、性能和可维护性。

### 关键设计决策

1. **组件化设计**: 将复杂的聊天界面拆分为多个独立组件，提高可维护性
2. **Hooks 封装**: 使用自定义 Hooks 封装业务逻辑，提高代码复用性
3. **状态管理**: 使用 Zustand + React Query 组合，平衡全局状态和服务器状态
4. **性能优化**: 虚拟滚动、懒加载、Memo 优化等多种手段提升性能
5. **用户体验**: 流式响应、乐观更新、友好的错误提示等提升用户体验
6. **可扩展性**: 模块化设计，便于后续功能扩展

### 下一步

完成设计评审后，将创建详细的实现任务列表，按优先级逐步实现各项功能。
