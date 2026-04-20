# 需求文档

## 简介

将 chatbot-ui-main 项目中的聊天会话页面移植到当前系统中，创建一个完整的聊天交互界面。该功能允许用户查看和管理聊天会话，发送和接收消息，并提供流畅的聊天体验。

## 移植源信息

### 源项目结构

- **源项目路径**: `chatbot-ui-main/`
- **主页面组件**: `chatbot-ui-main/app/[locale]/[workspaceid]/chat/[chatid]/page.tsx`
- **核心 UI 组件**: `chatbot-ui-main/components/chat/chat-ui.tsx`
- **关键子组件**:
  - `ChatInput`: 消息输入组件 (`components/chat/chat-input.tsx`)
  - `ChatMessages`: 消息列表组件 (`components/chat/chat-messages.tsx`)
  - `ChatScrollButtons`: 滚动控制按钮 (`components/chat/chat-scroll-buttons.tsx`)
  - `ChatSecondaryButtons`: 辅助功能按钮 (`components/chat/chat-secondary-buttons.tsx`)
  - `ChatHelp`: 帮助组件 (`components/chat/chat-help.tsx`)
  - `Message`: 单条消息组件 (`components/messages/message.tsx`)

### 核心 Hooks

- **useChatHandler**: 处理聊天消息发送、编辑、停止等核心逻辑 (`components/chat/chat-hooks/use-chat-handler.tsx`)
- **useScroll**: 处理消息列表滚动逻辑 (`components/chat/chat-hooks/use-scroll.tsx`)
- **usePromptAndCommand**: 处理输入框命令和提示词 (`components/chat/chat-hooks/use-prompt-and-command.tsx`)
- **useChatHistoryHandler**: 处理聊天历史导航 (`components/chat/chat-hooks/use-chat-history.tsx`)
- **useSelectFileHandler**: 处理文件选择和上传 (`components/chat/chat-hooks/use-select-file-handler.tsx`)

### 状态管理

- **Context**: `chatbot-ui-main/context/context.tsx`
- **主要状态**:
  - `chatMessages`: 聊天消息列表
  - `userInput`: 用户输入内容
  - `isGenerating`: 是否正在生成回复
  - `selectedChat`: 当前选中的会话
  - `chatSettings`: 聊天设置（模型、温度等）
  - `chatFiles`: 会话关联的文件
  - `chatImages`: 会话中的图片
  - `selectedAssistant`: 选中的助手
  - `selectedTools`: 选中的工具

### 数据库操作

- **会话操作**: `db/chats.ts` - `getChatById`, `updateChat`
- **消息操作**: `db/messages.ts` - `getMessagesByChatId`, `deleteMessagesIncludingAndAfter`
- **文件操作**: `db/chat-files.ts` - `getChatFilesByChatId`
- **助手操作**: `db/assistants.ts`, `db/assistant-tools.ts`, `db/assistant-files.ts`

### 移植适配要点

1. **UI 框架替换**: 将原项目的自定义 UI 组件替换为 Ant Design 组件
2. **路由适配**: 从 Next.js App Router 适配到 React Router
3. **状态管理**: 从 Context API 适配到 Zustand + React Query
4. **样式系统**: 从 Tailwind CSS 适配到当前项目的 Tailwind + CSS Modules
5. **API 调用**: 从 Supabase 客户端调用适配到当前项目的 API 层
6. **国际化**: 从 react-i18next 适配到当前项目的国际化方案（如有）
7. **主题色**: 应用当前系统的 teal 主题色系

## 术语表

- **ChatSessionsPage**: 聊天会话页面组件，用于展示和管理用户的聊天会话
- **ChatUI**: 聊天用户界面组件，包含消息列表、输入框和相关控制按钮
- **SessionAPI**: 会话相关的 API 接口，用于获取、创建、更新和删除会话
- **MessagesAPI**: 消息相关的 API 接口，用于获取、发送和管理聊天消息
- **AntDesign**: UI 组件库，用于替代原项目中的基础组件
- **ThemeSystem**: 当前系统的主题配置，基于 teal 色系
- **ChatMessage**: 聊天消息数据结构，包含消息内容、发送者、时间戳等信息
- **ChatSettings**: 聊天设置数据结构，包含模型选择、温度、上下文长度等配置
- **FileItem**: 文件项数据结构，用于表示会话中的文件附件
- **MessageImage**: 消息图片数据结构，用于表示消息中的图片内容
- **Assistant**: 助手数据结构，表示 AI 助手的配置和信息
- **Tool**: 工具数据结构，表示可用的功能工具（如检索、代码执行等）

## 需求

### 需求 1：页面结构移植

**用户故事：** 作为开发者，我希望将聊天页面的基本结构移植到新系统中，以便用户可以访问聊天功能

#### 验收标准

1. WHEN 用户访问 `/sessions/:sessionId` 路径时，THE ChatSessionsPage SHALL 渲染聊天界面
2. THE ChatSessionsPage SHALL 包含消息列表区域、输入框区域和控制按钮区域
3. THE ChatSessionsPage SHALL 使用 Ant Design 组件替代原有的基础组件
4. THE ChatSessionsPage SHALL 应用当前系统的 teal 主题色系
5. THE ChatSessionsPage SHALL 保存在 `src/pages/sessions/` 目录下

### 需求 2：会话数据加载

**用户故事：** 作为用户，我希望打开聊天页面时能看到历史消息，以便继续之前的对话

#### 验收标准

1. WHEN ChatSessionsPage 组件挂载时，THE ChatSessionsPage SHALL 调用 SessionAPI 获取会话详情
2. WHEN 会话 ID 存在时，THE ChatSessionsPage SHALL 调用 MessagesAPI 获取该会话的历史消息
3. WHEN 数据加载中时，THE ChatSessionsPage SHALL 显示加载状态指示器
4. WHEN 数据加载失败时，THE ChatSessionsPage SHALL 显示错误提示信息
5. WHEN 数据加载成功后，THE ChatSessionsPage SHALL 自动滚动到消息列表底部

### 需求 3：消息展示

**用户故事：** 作为用户，我希望清晰地看到聊天消息，以便理解对话内容

#### 验收标准

1. THE ChatSessionsPage SHALL 按时间顺序展示所有消息
2. THE ChatSessionsPage SHALL 区分用户消息和 AI 消息的显示样式
3. THE ChatSessionsPage SHALL 支持消息内容的 Markdown 渲染
4. THE ChatSessionsPage SHALL 支持代码块的语法高亮显示
5. WHEN 消息列表超出可视区域时，THE ChatSessionsPage SHALL 提供滚动功能

### 需求 4：消息输入和发送

**用户故事：** 作为用户，我希望能够输入和发送消息，以便与 AI 进行对话

#### 验收标准

1. THE ChatSessionsPage SHALL 提供文本输入框供用户输入消息
2. WHEN 用户点击发送按钮或按下 Enter 键时，THE ChatSessionsPage SHALL 调用 MessagesAPI 发送消息
3. WHEN 消息发送中时，THE ChatSessionsPage SHALL 禁用输入框和发送按钮
4. WHEN 消息发送成功后，THE ChatSessionsPage SHALL 清空输入框内容
5. WHEN 消息发送失败时，THE ChatSessionsPage SHALL 显示错误提示并保留输入内容

### 需求 5：滚动控制

**用户故事：** 作为用户，我希望能够方便地浏览消息历史，以便查看之前的对话

#### 验收标准

1. THE ChatSessionsPage SHALL 提供"滚动到顶部"按钮
2. THE ChatSessionsPage SHALL 提供"滚动到底部"按钮
3. WHEN 用户位于消息列表顶部时，THE ChatSessionsPage SHALL 隐藏"滚动到顶部"按钮
4. WHEN 用户位于消息列表底部时，THE ChatSessionsPage SHALL 隐藏"滚动到底部"按钮
5. WHEN 用户手动滚动消息列表时，THE ChatSessionsPage SHALL 更新滚动按钮的显示状态

### 需求 6：会话信息展示

**用户故事：** 作为用户，我希望看到当前会话的基本信息，以便了解对话上下文

#### 验收标准

1. THE ChatSessionsPage SHALL 在页面顶部显示会话标题
2. WHEN 会话标题过长时，THE ChatSessionsPage SHALL 使用省略号截断显示
3. THE ChatSessionsPage SHALL 提供会话设置按钮
4. THE ChatSessionsPage SHALL 提供新建会话按钮
5. THE ChatSessionsPage SHALL 使用系统主题色高亮显示会话标题区域

### 需求 7：响应式布局

**用户故事：** 作为用户，我希望在不同设备上都能正常使用聊天功能，以便随时随地进行对话

#### 验收标准

1. THE ChatSessionsPage SHALL 在桌面端提供宽敞的聊天界面
2. THE ChatSessionsPage SHALL 在移动端自适应屏幕宽度
3. WHEN 屏幕宽度小于 768px 时，THE ChatSessionsPage SHALL 调整输入框和按钮的布局
4. WHEN 屏幕宽度小于 768px 时，THE ChatSessionsPage SHALL 隐藏部分辅助按钮
5. THE ChatSessionsPage SHALL 确保在所有屏幕尺寸下消息都可读

### 需求 8：错误处理

**用户故事：** 作为用户，我希望在出现错误时能得到清晰的提示，以便知道如何处理

#### 验收标准

1. WHEN 会话不存在时，THE ChatSessionsPage SHALL 显示"会话不存在"错误提示
2. WHEN 网络请求失败时，THE ChatSessionsPage SHALL 显示"网络错误"提示
3. WHEN API 返回错误时，THE ChatSessionsPage SHALL 显示具体的错误信息
4. THE ChatSessionsPage SHALL 提供重试按钮供用户重新加载数据
5. THE ChatSessionsPage SHALL 使用 Ant Design 的 Message 组件显示错误提示

### 需求 9：流式响应处理

**用户故事：** 作为用户，我希望能实时看到 AI 的回复内容，以便更快地获得反馈

#### 验收标准（Streaming Response Handling）

1. WHEN AI 开始生成回复时，THE ChatSessionsPage SHALL 立即显示一条新的 AI 消息占位符
2. WHEN 接收到流式数据时，THE ChatSessionsPage SHALL 实时更新 AI 消息内容
3. WHEN 流式响应进行中时，THE ChatSessionsPage SHALL 显示"正在生成"状态指示器
4. WHEN 用户点击停止按钮时，THE ChatSessionsPage SHALL 中止流式响应并保留已生成的内容
5. WHEN 流式响应完成时，THE ChatSessionsPage SHALL 移除状态指示器并保存完整消息

### 需求 10：文件附件支持

**用户故事：** 作为用户，我希望能在聊天中上传和查看文件，以便与 AI 讨论文件内容

#### 验收标准（File Attachment Support）

1. THE ChatSessionsPage SHALL 提供文件上传按钮供用户选择本地文件
2. WHEN 用户选择文件后，THE ChatSessionsPage SHALL 在输入框上方显示文件预览
3. THE ChatSessionsPage SHALL 支持图片文件的缩略图预览
4. THE ChatSessionsPage SHALL 允许用户在发送前移除已选择的文件
5. WHEN 消息包含文件时，THE ChatSessionsPage SHALL 在消息中显示文件信息和下载链接

### 需求 11：消息编辑功能

**用户故事：** 作为用户，我希望能编辑已发送的消息，以便修正错误或调整问题

#### 验收标准（Message Editing）

1. THE ChatSessionsPage SHALL 在用户消息上提供编辑按钮
2. WHEN 用户点击编辑按钮时，THE ChatSessionsPage SHALL 将消息内容加载到输入框
3. WHEN 用户提交编辑后的消息时，THE ChatSessionsPage SHALL 删除该消息及之后的所有消息
4. WHEN 编辑消息提交后，THE ChatSessionsPage SHALL 重新发送编辑后的消息并获取新的 AI 回复
5. THE ChatSessionsPage SHALL 在编辑模式下显示取消按钮供用户放弃编辑

### 需求 12：助手和工具选择

**用户故事：** 作为用户，我希望能选择不同的 AI 助手和工具，以便获得专业化的帮助

#### 验收标准（Assistant and Tool Selection）

1. THE ChatSessionsPage SHALL 提供助手选择器供用户切换不同的 AI 助手
2. WHEN 选择助手后，THE ChatSessionsPage SHALL 在输入框上方显示当前助手信息
3. THE ChatSessionsPage SHALL 提供工具选择器供用户启用功能工具
4. WHEN 选择工具后，THE ChatSessionsPage SHALL 在输入框上方显示已选工具标签
5. THE ChatSessionsPage SHALL 允许用户点击工具标签来移除该工具

### 需求 13：快捷键支持

**用户故事：** 作为用户，我希望能使用快捷键操作聊天界面，以便提高使用效率

#### 验收标准（Keyboard Shortcuts）

1. WHEN 用户按下 Enter 键时，THE ChatSessionsPage SHALL 发送消息
2. WHEN 用户按下 Shift+Enter 键时，THE ChatSessionsPage SHALL 在输入框中插入换行符
3. WHEN 用户按下 Ctrl+L 键时，THE ChatSessionsPage SHALL 聚焦到输入框
4. WHEN 用户按下 Ctrl+O 键时，THE ChatSessionsPage SHALL 创建新会话
5. WHEN 用户按下 Ctrl+Shift+↑/↓ 键时，THE ChatSessionsPage SHALL 在聊天历史中导航

### 需求 14：图片粘贴支持

**用户故事：** 作为用户，我希望能直接粘贴图片到输入框，以便快速分享截图

#### 验收标准（Image Paste Support）

1. WHEN 用户在输入框中粘贴图片时，THE ChatSessionsPage SHALL 检测并提取图片数据
2. WHEN 粘贴的图片被检测到时，THE ChatSessionsPage SHALL 在输入框上方显示图片预览
3. WHEN 当前模型不支持图片输入时，THE ChatSessionsPage SHALL 显示错误提示并拒绝图片
4. THE ChatSessionsPage SHALL 允许用户在发送前移除已粘贴的图片
5. WHEN 发送包含图片的消息时，THE ChatSessionsPage SHALL 将图片转换为 base64 格式并上传

### 需求 15：Markdown 和代码渲染

**用户故事：** 作为用户，我希望消息内容能正确渲染 Markdown 和代码，以便更好地阅读技术内容

#### 验收标准（Markdown and Code Rendering）

1. THE ChatSessionsPage SHALL 使用 Markdown 渲染器解析消息内容
2. THE ChatSessionsPage SHALL 支持代码块的语法高亮显示
3. THE ChatSessionsPage SHALL 在代码块上方显示语言标签
4. THE ChatSessionsPage SHALL 提供代码复制按钮供用户快速复制代码
5. THE ChatSessionsPage SHALL 支持表格、列表、链接等常见 Markdown 元素的渲染

### 需求 16：会话设置管理

**用户故事：** 作为用户，我希望能调整会话的参数设置，以便控制 AI 的行为

#### 验收标准（Chat Settings Management）

1. THE ChatSessionsPage SHALL 提供设置按钮打开会话设置面板
2. THE ChatSessionsPage SHALL 允许用户选择不同的 AI 模型
3. THE ChatSessionsPage SHALL 允许用户调整温度参数（0-2）
4. THE ChatSessionsPage SHALL 允许用户设置上下文长度
5. THE ChatSessionsPage SHALL 允许用户配置系统提示词

### 需求 17：加载状态优化

**用户故事：** 作为用户，我希望在数据加载时看到友好的加载提示，以便了解系统状态

#### 验收标准（Loading State Optimization）

1. WHEN 页面初始加载时，THE ChatSessionsPage SHALL 显示全屏加载动画
2. WHEN 消息发送中时，THE ChatSessionsPage SHALL 在输入框显示加载状态
3. WHEN 历史消息加载中时，THE ChatSessionsPage SHALL 在消息列表顶部显示加载指示器
4. THE ChatSessionsPage SHALL 使用 Ant Design 的 Spin 组件作为加载指示器
5. THE ChatSessionsPage SHALL 在加载完成后平滑过渡到内容显示

### 需求 18：检索增强生成（RAG）支持

**用户故事：** 作为用户，我希望 AI 能基于上传的文档回答问题，以便获得更准确的信息

#### 验收标准（RAG Support）

1. WHEN 会话包含文件时，THE ChatSessionsPage SHALL 自动启用检索功能
2. WHEN 发送消息时，THE ChatSessionsPage SHALL 从文件中检索相关内容片段
3. THE ChatSessionsPage SHALL 在 AI 回复中标注引用的文件来源
4. THE ChatSessionsPage SHALL 允许用户配置检索的文档数量
5. THE ChatSessionsPage SHALL 支持多种文档格式的检索（PDF、TXT、MD 等）
