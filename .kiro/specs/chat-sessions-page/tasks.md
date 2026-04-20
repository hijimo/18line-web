# 聊天会话页面

## 状态

- **状态**: 未开始
- **创建时间**: 2025-10-27
- **最后更新**: 2025-10-27

## 前置条件

- ✅ API 层已生成：`src/services/api/sessions/sessions.ts` 和 `src/services/api/messages/messages.ts`
- ✅ API 类型已生成：所有会话和消息相关的类型定义已存在于 `src/types/api/`
- ✅ 基础项目结构已就绪：路由、状态管理、UI 框架等基础设施已配置
- ✅ 流式 API 已生成：`src/services/api/chat/chat.ts` 包含 `postChatStream` 方法

## 任务列表

### 1. 项目基础设施搭建

#### 1.1 创建聊天页面目录结构

- [x] 任务完成

**描述**: 创建聊天功能所需的目录结构

**子任务**:

- 创建 `src/pages/chat/` 目录
- 创建 `src/pages/chat/components/` 子目录
- 创建 `src/hooks/chat/` 目录用于聊天相关 hooks
- 创建 `src/types/chat.ts` 用于聊天类型定义

**验收标准**:

- 所有目录已创建
- 目录结构符合项目规范
- _需求: 1_

---

#### 1.2 配置路由

- [x] 任务完成

**描述**: 配置聊天页面路由和菜单

**子任务**:

- 在 `src/router.tsx` 的 resources 数组中添加聊天资源配置
- 使用 MessageOutlined 图标，标签为"聊天会话"
- 在 children 路由中添加 `/chat` 路由，指向 Chat 页面组件
- 路由支持 `?sessionId=xxx` 查询参数（通过 useSearchParams 处理）
- 创建 `src/pages/chat/index.tsx` 页面组件骨架

**验收标准**:

- 可以通过 `/chat` 访问聊天页面
- 支持 sessionId 查询参数
- 菜单中显示"聊天会话"入口
- _需求: 1_

---

#### 1.3 创建聊天状态管理 Store

- [x] 任务完成

**描述**: 创建聊天功能的全局状态管理

**子任务**:

- 创建 `src/stores/chatStore.ts`
- 定义 ChatStore 接口（包含当前会话、消息列表、用户输入、生成状态等）
- 实现 Zustand store 的基本结构（使用 create 函数）
- 在 `src/stores/index.ts` 中导出 chatStore
- 参考 `src/stores/authStore.ts` 的实现模式

**验收标准**:

- Store 可以正常导入使用
- 状态定义完整且类型安全
- 遵循项目现有 store 的代码风格
- _需求: 2, 4_

---

#### 1.4 定义聊天类型

- [x] 任务完成

**描述**: 定义聊天功能所需的 TypeScript 类型

**子任务**:

- 在 `src/types/chat.ts` 中定义本地使用的类型
- 基于 API 类型（SessionResponse, MessageDetailResponse）定义本地类型
- 定义 ChatSettings、StreamingState、ChatError 等辅助类型
- 定义消息角色枚举（user, assistant, system）

**验收标准**:

- 类型定义完整且符合 TypeScript 严格模式
- 类型与 API 类型兼容
- _需求: 3, 8_

---

### 2. 会话列表功能实现

#### 2.1 创建 SessionList 组件

- [x] 任务完成

**描述**: 创建会话列表组件

**子任务**:

- 创建 `src/pages/chat/components/SessionList/index.tsx`
- 实现会话列表的基本布局（固定宽度 280px，可折叠）
- 添加新建会话按钮（使用 Ant Design Button + PlusOutlined 图标）
- 添加搜索输入框（使用 Ant Design Input.Search）
- 创建对应的 CSS Module 文件 `index.module.css`
- 使用 Flexbox 布局：顶部操作区 + 滚动列表区
- 接收 sessions 数组、currentSessionId、onSelectSession 等 props

**验收标准**:

- 会话列表布局正确
- 新建会话按钮可点击
- 搜索框可输入
- 组件类型定义完整
- _需求: 6_

---

#### 2.2 创建 SessionItem 组件

- [x] 任务完成

**描述**: 创建会话项组件

**子任务**:

- 创建 `src/pages/chat/components/SessionItem/index.tsx`
- 实现会话项的显示（标题、最后消息预览、时间戳）
- 添加选中状态样式（使用 teal 主题色 #14b8a6）
- 实现悬停显示操作按钮（置顶、归档、删除）
- 显示置顶图标（PushpinOutlined）和归档状态
- 创建对应的 CSS Module 文件 `index.module.css`
- 使用 SessionResponse 类型作为 session prop

**验收标准**:

- 会话项显示完整信息（title, lastMessage, updatedAt）
- 选中状态样式正确（teal 背景）
- 悬停显示操作按钮
- 置顶会话显示图钉图标
- _需求: 6_

---

#### 2.3 实现会话列表数据加载

- [x] 任务完成

**描述**: 实现会话列表数据获取

**子任务**:

- 在 ChatPage 主页面中使用 React Query 的 useQuery
- 导入 `getSessions` 从 `@/services/api/sessions/sessions`
- 调用 `getSessions().getChatSessions({ page: 1, pageSize: 50, archived: false })` API
- 实现加载状态显示（使用 Ant Design Spin 组件）
- 实现错误处理（使用 Ant Design message 显示错误提示）
- 将数据传递给 SessionList 组件
- 使用 queryKey: ['sessions'] 进行缓存

**验收标准**:

- 会话列表正确加载
- 加载状态显示正确
- 错误处理完善
- _需求: 2, 8_

---

#### 2.4 实现会话操作功能

- [x] 任务完成

**描述**: 实现会话的增删改查操作

**子任务**:

- 创建 `src/hooks/chat/useSessionOperations.ts` hook
- 导入 `getSessions` 从 `@/services/api/sessions/sessions`
- 实现新建会话功能（调用 `postChatSessions` API，使用 useMutation）
- 实现置顶会话功能（调用 `postChatSessionsIdPin` API）
- 实现归档会话功能（调用 `postChatSessionsIdArchive` API）
- 实现删除会话功能（调用 `deleteChatSessionsId` API，使用 Modal.confirm 确认）
- 操作成功后刷新会话列表（使用 queryClient.invalidateQueries(['sessions'])）
- 使用 message.success 显示成功提示

**验收标准**:

- 所有操作功能正常
- 操作后列表自动刷新
- 删除前有确认提示
- 成功后显示提示信息
- _需求: 2_

---

#### 2.5 实现会话搜索功能

- [x] 任务完成

**描述**: 实现会话搜索功能

**子任务**:

- 在 ChatPage 中添加搜索关键词状态（useState）
- 实现搜索防抖（使用 useMemo + useEffect，延迟 300ms）
- 调用 `getSessions().getChatSessionsSearch({ keyword, page: 1, pageSize: 20 })` API
- 使用独立的 useQuery 处理搜索请求
- 根据是否有搜索关键词决定显示搜索结果还是全部会话
- 清空搜索时恢复原列表

**验收标准**:

- 搜索功能正常
- 防抖生效（300ms）
- 搜索结果正确显示
- 清空搜索恢复原列表
- _需求: 2_

---

### 3. 聊天界面核心组件

#### 3.1 创建 ChatPage 主页面

- [x] 任务完成

**描述**: 创建聊天主页面

**子任务**:

- 在 `src/pages/chat/index.tsx` 中实现主页面组件
- 实现左右分栏布局（使用 Flexbox: flex + flex-1）
- 从 URL query 参数获取 sessionId（使用 react-router 的 useSearchParams）
- 处理无 sessionId 的情况（显示欢迎页面或空状态）
- 实现响应式布局（使用 CSS 媒体查询，屏幕 < 768px 时左侧栏收起为 Drawer）
- 管理侧边栏折叠状态（使用 useState + localStorage）
- 加载会话列表和当前会话消息
- 创建对应的 CSS Module 文件 `index.module.css`

**验收标准**:

- 页面布局正确（左侧 280px，右侧自适应）
- URL 参数解析正常
- 响应式布局生效
- 侧边栏折叠状态持久化
- _需求: 1, 7_

---

#### 3.2 创建 ChatUI 组件

- [x] 任务完成

**描述**: 创建聊天界面组件

**子任务**:

- 创建 `src/pages/chat/components/ChatUI/index.tsx`
- 实现聊天界面的整体布局（ChatHeader + ChatMessages + ChatInput）
- 使用 Flexbox 布局：header 固定高度，messages flex-1 overflow-auto，input 固定底部
- 处理无会话时的空状态显示（使用 Ant Design Empty 组件）
- 创建对应的 CSS Module 文件 `index.module.css`
- 接收 sessionId, messages, onSendMessage 等 props
- 定义 ChatUIProps 接口

**验收标准**:

- 聊天界面布局正确
- 空状态显示正常
- 组件类型定义完整
- _需求: 1, 3_

---

#### 3.3 创建 ChatHeader 组件

- [x] 任务完成

**描述**: 创建聊天头部组件

**子任务**:

- 创建 `src/pages/chat/components/ChatHeader/index.tsx`
- 显示会话标题（使用 Typography.Title level={4}，支持长标题省略 ellipsis）
- 添加折叠侧边栏按钮（MenuFoldOutlined/MenuUnfoldOutlined）
- 添加设置按钮（SettingOutlined，打开设置 Drawer）
- 应用 teal 主题色（#14b8a6）到标题区域背景
- 创建对应的 CSS Module 文件 `index.module.css`
- 接收 title, collapsed, onToggleCollapse, onOpenSettings 等 props

**验收标准**:

- 标题显示正确且支持省略
- 按钮功能正常
- 主题色应用正确
- _需求: 6_

---

### 4. 消息展示功能

#### 4.1 创建 ChatMessages 组件

- [x] 任务完成

**描述**: 创建消息列表组件

**子任务**:

- 创建 `src/pages/chat/components/ChatMessages/index.tsx`
- 实现消息列表的滚动容器（使用 overflow-y: auto, flex-1）
- 按时间顺序展示消息（从上到下，使用 map 渲染 Message 组件）
- 实现消息分组（相隔 > 5 分钟显示时间戳分隔符，使用 dayjs 计算时间差）
- 使用 useRef 管理滚动容器引用（传递给父组件）
- 创建对应的 CSS Module 文件 `index.module.css`
- 接收 messages, isGenerating, onEditMessage, onDeleteMessage 等 props
- 使用 MessageDetailResponse[] 作为 messages 类型

**验收标准**:

- 消息列表滚动正常
- 消息分组显示正确
- 时间戳格式化正确
- _需求: 3, 5_

---

#### 4.2 创建 Message 组件

- [x] 任务完成

**描述**: 创建单条消息组件

**子任务**:

- 创建 `src/pages/chat/components/Message/index.tsx`
- 区分用户消息和 AI 消息的样式（根据 role 字段：'user' vs 'assistant'）
- 用户消息：teal 背景（#14b8a6），白色文字，右对齐（justify-end）
- AI 消息：灰色背景（#f3f4f6），黑色文字，左对齐（justify-start）
- 添加头像显示（使用 Ant Design Avatar，用户显示 UserOutlined，AI 显示 RobotOutlined）
- 悬停显示操作按钮（编辑、删除、复制，使用 Tooltip + Button.Group）
- 创建对应的 CSS Module 文件 `index.module.css`
- 接收 message, isUser, onEdit, onDelete 等 props
- 使用 MessageDetailResponse 作为 message 类型
- 渲染 MessageMarkdown 组件显示内容

**验收标准**:

- 消息样式正确（用户右对齐 teal，AI 左对齐灰色）
- 操作按钮悬停显示正常
- 头像显示正确
- _需求: 3, 11_

---

#### 4.3 集成 Markdown 渲染

- [x] 任务完成

**描述**: 集成 Markdown 渲染功能

**子任务**:

- 安装依赖：`yarn add react-markdown remark-gfm rehype-highlight`
- 创建 `src/pages/chat/components/MessageMarkdown/index.tsx`
- 配置 react-markdown 的安全选项（disallowedElements: ['script', 'iframe']）
- 支持 GitHub Flavored Markdown（使用 remarkGfm 插件）
- 自定义渲染器适配 Ant Design 样式（链接添加 target="_blank" rel="noopener noreferrer"）
- 代码块使用 MessageCodeBlock 组件渲染（components.code）
- 接收 content 字符串作为 prop
- 使用 React.memo 优化性能

**验收标准**:

- Markdown 渲染正确
- 安全选项生效（禁止 script 和 iframe）
- 代码块正确渲染
- _需求: 15_

---

#### 4.4 创建 MessageCodeBlock 组件

- [x] 任务完成

**描述**: 创建代码块组件

**子任务**:

- 创建 `src/pages/chat/components/MessageCodeBlock/index.tsx`
- 安装 highlight.js：`yarn add highlight.js @types/highlight.js`
- 使用 highlight.js 进行语法高亮（hljs.highlightAuto 或 hljs.highlight）
- 显示语言标签（在代码块顶部，使用 Badge 或 Tag）
- 添加一键复制按钮（使用 Ant Design Button + CopyOutlined，调用 navigator.clipboard.writeText）
- 支持代码折叠（行数 > 20 时显示展开/收起按钮，使用 useState 管理折叠状态）
- 创建对应的 CSS Module 文件 `index.module.css`
- 接收 code, language 等 props
- 导入 highlight.js 样式（如 'highlight.js/styles/github-dark.css'）

**验收标准**:

- 代码高亮正常
- 复制功能正常（显示成功提示）
- 折叠功能正常
- 语言标签显示正确
- _需求: 15_

---

#### 4.5 实现消息数据加载

- [x] 任务完成

**描述**: 实现消息数据获取

**子任务**:

- 在 ChatPage 主页面中使用 React Query 的 useQuery
- 导入 `getMessages` 从 `@/services/api/messages/messages`
- 调用 `getMessages().getChatSessionsIdMessages({ id: sessionId }, { page: 1, pageSize: 50 })` API
- 实现加载状态显示（在消息列表中心显示 Spin）
- 处理加载错误（使用 Ant Design message.error 显示错误提示）
- 使用 queryKey: ['messages', sessionId] 进行缓存
- 仅在 sessionId 存在时启用查询（enabled: !!sessionId）
- 将消息数据传递给 ChatUI 组件

**验收标准**:

- 消息加载正常
- 加载状态显示正确
- 错误处理完善
- 切换会话时正确加载对应消息
- _需求: 2, 3, 8_

---

### 5. 消息输入和发送

#### 5.1 创建 ChatInput 组件

- [x] 任务完成

**描述**: 创建消息输入组件

**子任务**:

- 创建 `src/pages/chat/components/ChatInput/index.tsx`
- 使用 Ant Design Input.TextArea 组件
- 实现自动高度调整（autoSize={{ minRows: 1, maxRows: 8 }}）
- 添加发送按钮（使用 teal 主题色 #14b8a6，图标 SendOutlined）
- 添加停止按钮（生成中显示，图标 StopOutlined，替换发送按钮）
- 布局：输入框 + 发送/停止按钮（使用 Space 或 Flexbox）
- 创建对应的 CSS Module 文件 `index.module.css`
- 接收 value, onChange, onSend, onStop, isGenerating, disabled 等 props
- 定义 ChatInputProps 接口

**验收标准**:

- 输入框自动调整高度
- 按钮显示正确（根据 isGenerating 切换）
- 组件类型定义完整
- _需求: 4_

---

#### 5.2 实现消息发送功能

- [x] 任务完成

**描述**: 实现消息发送逻辑

**子任务**:

- 创建 `src/hooks/chat/useChatHandler.ts`
- 导入 `getMessages` 从 `@/services/api/messages/messages`
- 实现 sendMessage 函数（调用 `postChatSessionsIdMessages` API）
- 使用 React Query 的 useMutation
- 实现乐观更新（使用 onMutate 立即在 UI 中显示用户消息）
- 处理发送失败的回滚（使用 onError 移除乐观添加的消息）
- 发送成功后刷新消息列表（使用 queryClient.invalidateQueries(['messages', sessionId])）
- 返回 sendMessage, isLoading 等状态
- 在 ChatPage 中使用此 hook

**验收标准**:

- 消息发送正常
- 乐观更新生效
- 错误回滚正常
- 发送成功后消息列表更新
- _需求: 4_

---

#### 5.3 实现快捷键支持

- [x] 任务完成

**描述**: 实现键盘快捷键

**子任务**:

- ✅ 在 ChatInput 组件中监听 onKeyDown 事件
- ✅ Enter 键发送消息（检查 !event.shiftKey && event.key === 'Enter'）
- ✅ Shift+Enter 插入换行（默认行为）
- ✅ 阻止 Enter 键的默认行为（event.preventDefault()）
- ✅ 在 ChatPage 中使用 useEffect 监听 Ctrl+L/Cmd+L 聚焦输入框
- ✅ 使用 useRef 和 forwardRef 获取输入框引用
- ✅ 添加 aria-label 提升可访问性

**验收标准**:

- ✅ Enter 键发送消息正常
- ✅ Shift+Enter 插入换行正常
- ✅ Ctrl+L/Cmd+L 聚焦输入框正常
- ✅ 不影响正常输入
- _需求: 13_

**实现细节**:

- ChatInput 组件使用 forwardRef 暴露 focus 方法
- ChatUI 组件使用 forwardRef 暴露 focusInput 方法
- ChatPage 组件监听全局键盘事件，支持 Ctrl+L/Cmd+L 快捷键
- 输入框底部显示快捷键提示文本

---

#### 5.4 实现消息编辑功能

- [ ] 任务完成

**描述**: 实现消息编辑功能

**子任务**:

- 在 Message 组件添加编辑按钮（EditOutlined，仅 role === 'user' 时显示）
- 在 chatStore 中添加 editingMessageId 和 editingContent 状态
- 点击编辑时调用 store 的 setEditingMessage 方法
- 在 ChatInput 中检测编辑状态，显示编辑提示（使用 Alert 组件）
- 实现取消编辑功能（清空 editingMessageId）
- 在 useChatHandler 中实现 editMessage 函数
- 编辑时先删除该消息及之后的消息，然后重新发送
- 使用 deleteChatMessagesId API（如果有）或通过后端支持

**验收标准**:

- 编辑按钮仅在用户消息显示
- 点击编辑加载内容到输入框
- 显示编辑提示和取消按钮
- 编辑后正确重新发送
- _需求: 11_

---

### 6. 滚动控制功能

#### 6.1 创建 ChatScrollButtons 组件

- [x] 任务完成

**描述**: 创建滚动控制按钮组件

**子任务**:

- ✅ 创建 `src/pages/chat/components/ChatScrollButtons/index.tsx`
- ✅ 使用 Ant Design FloatButton.Group 组件
- ✅ 添加"滚动到顶部"按钮（UpOutlined 图标）
- ✅ 添加"滚动到底部"按钮（DownOutlined 图标）
- ✅ 固定在消息区域右下角（使用 FloatButton 默认定位）
- ✅ 根据滚动位置动态显示/隐藏按钮（接收 showScrollToTop, showScrollToBottom props）
- ✅ 创建对应的 CSS Module 文件 `index.module.css`
- ✅ 接收 onScrollToTop, onScrollToBottom 回调函数
- ✅ 添加 tooltip 和 aria-label 提升可访问性

**验收标准**:

- ✅ 按钮显示正确
- ✅ 动态显示/隐藏正常
- ✅ 点击按钮触发滚动
- _需求: 5_

---

#### 6.2 实现滚动控制逻辑

- [x] 任务完成

**描述**: 实现滚动控制逻辑

**子任务**:

- ✅ 创建 `src/hooks/chat/useScroll.ts`
- ✅ 接收消息数组作为参数
- ✅ 返回 scrollContainerRef, scrollToTop, scrollToBottom, showScrollToTop, showScrollToBottom
- ✅ 使用 useRef 创建滚动容器引用
- ✅ 使用 useState 管理按钮显示状态
- ✅ 监听滚动事件（使用 useEffect + addEventListener），更新按钮显示状态
- ✅ 距离顶部 > 100px 时显示"滚动到顶部"按钮
- ✅ 距离底部 > 100px 时显示"滚动到底部"按钮
- ✅ 实现 scrollToTop 函数（使用 scrollTo({ top: 0, behavior: 'smooth' })）
- ✅ 实现 scrollToBottom 函数（使用 scrollTo({ top: scrollHeight, behavior: 'smooth' })）
- ✅ 新消息到达时自动滚动到底部（使用 useEffect 监听 messages 变化）
- ✅ 仅当用户在底部附近时（距离底部 < 150px）才自动滚动
- ✅ 在 ChatUI 组件中集成 useScroll hook
- ✅ 将 scrollContainerRef 传递给 ChatMessages 组件
- ✅ 添加 role="log" 和 aria-live="polite" 提升可访问性

**验收标准**:

- ✅ 滚动功能正常
- ✅ 自动滚动逻辑正确
- ✅ 按钮显示/隐藏正确
- ✅ 事件监听器正确清理
- _需求: 5_

---

### 7. 流式响应处理

#### 7.1 实现流式响应 Hook

- [x] 任务完成

**描述**: 实现流式响应处理

**子任务**:

- ✅ 创建 `src/hooks/chat/useStreamResponse.ts`
- ✅ 使用 fetch API 调用流式端点 `/api/chat/stream`
- ✅ 实现 streamMessage 函数
- ✅ 使用 fetch 的 ReadableStream 接收流式数据（response.body.getReader()）
- ✅ 解析 SSE 格式数据（data: {...}\n\n）
- ✅ 实时更新消息内容（使用 useState 管理 currentStreamContent）
- ✅ 实现停止流式响应功能（使用 AbortController）
- ✅ 处理流式响应错误（使用 try-catch，显示 message.error）
- ✅ 流式完成后返回完整内容
- ✅ 返回 streamMessage, currentStreamContent, isStreaming, stopStream, resetStream

**验收标准**:

- ✅ 流式响应正常
- ✅ 实时更新消息内容
- ✅ 停止功能正常（使用 AbortController）
- ✅ 错误处理完善
- _需求: 9_

---

#### 7.2 集成流式响应到 ChatInput

- [x] 任务完成

**描述**: 集成流式响应到输入组件

**子任务**:

- ✅ 在 useChatHandler 中集成 useStreamResponse
- ✅ 实现 sendStreamMessage 函数（调用 streamMessage）
- ✅ 发送消息时启用流式响应
- ✅ 在消息列表中显示"正在生成"状态（ChatMessages 组件已支持）
- ✅ 实时更新流式消息内容（通过 tempMessageId 和 currentStreamContent）
- ✅ 添加停止按钮（在 ChatInput 中，isGenerating 为 true 时显示）
- ✅ 点击停止按钮调用 stopStream
- ✅ 流式完成后刷新消息列表（invalidateQueries）
- ✅ 在 ChatPage 中合并真实消息和流式消息
- ✅ 乐观更新：立即显示用户消息和空的 AI 消息

**验收标准**:

- ✅ 流式响应集成正常
- ✅ 实时显示生成内容
- ✅ 状态指示器显示正确
- ✅ 停止按钮功能正常
- ✅ 乐观更新生效
- _需求: 9_

---

### 8. 文件上传功能（可选）

#### 8.1 实现文件上传功能

- [ ] 任务完成（可选）

**描述**: 实现文件上传和图片粘贴功能

**子任务**:

- 创建 `src/pages/chat/components/FilePicker/index.tsx`
- 使用 Ant Design Upload 组件
- 实现文件类型和大小验证（图片、PDF、文本，最大 10MB）
- 显示文件预览列表
- 在 ChatInput 中监听 paste 事件处理图片粘贴
- 转换图片为 base64 格式
- 发送消息时包含文件数据

**验收标准**:

- 文件选择和上传正常
- 图片粘贴功能正常
- 文件预览显示正确
- _需求: 10, 14_

---

### 9. 聊天设置功能

#### 9.1 创建 ChatSettings 组件

- [x] 任务完成

**描述**: 创建聊天设置组件

**子任务**:

- ✅ 创建 `src/pages/chat/components/ChatSettings/index.tsx`
- ✅ 使用 Ant Design Drawer 组件（从右侧滑出，宽度 400px）
- ✅ 使用 Form 组件管理表单状态
- ✅ 添加模型选择器（Select，从 `getProviders` API 获取模型列表）
- ✅ 添加温度参数滑块（Slider，范围 0-2，步长 0.1，默认 0.7）
- ✅ 添加 TopP 参数滑块（Slider，范围 0-1，步长 0.1，默认 1）
- ✅ 添加系统提示词文本框（TextArea，rows={4}，最大 2000 字符）
- ✅ 实现防抖保存（使用 useEffect，延迟 500ms）
- ✅ 调用 `patchChatSessionsId` API 更新会话设置
- ✅ 显示保存成功提示
- ✅ 创建对应的 CSS Module 文件 `index.module.css`
- ✅ 在 ChatUI 中集成 ChatSettings 组件
- ✅ 从 ChatPage 传递 session 数据

**验收标准**:

- ✅ 设置面板显示正确
- ✅ 所有设置项可交互
- ✅ 防抖保存生效
- ✅ 保存成功显示提示
- ✅ 参数说明清晰
- _需求: 16_

---

### 10. 助手和工具选择（可选功能）

#### 10.1 实现助手和工具选择

- [ ] 任务完成（可选 - 暂不实现）

**描述**: 创建助手和工具选择组件

**子任务**:

- 创建 `src/pages/chat/components/AssistantPicker/index.tsx`
- 创建 `src/pages/chat/components/ToolPicker/index.tsx`
- 使用 Select 组件实现助手选择器
- 使用 Select mode="multiple" 实现工具选择器
- 从后端 API 获取助手和工具列表
- 在输入框上方显示当前助手和工具标签
- 支持切换助手和添加/移除工具

**验收标准**:

- 助手选择功能正常
- 工具选择功能正常
- 标签显示正确

**暂不实现原因**:

- 当前后端 API 未提供助手和工具相关的接口
- 需要等待后端 API 完善后再实现
- 可以在未来版本中添加此功能
- _需求: 12_

---

### 11. 性能优化

#### 11.1 实现组件优化

- [x] 任务完成

**描述**: 优化组件性能

**子任务**:

- ✅ 使用 React.memo 优化 Message 组件
- ✅ 使用 React.memo 优化 SessionItem 组件
- ✅ 使用 React.memo 优化 MessageMarkdown 组件（已在创建时完成）
- ✅ 使用 useMemo 缓存消息分组计算结果（ChatMessages 组件已优化）
- ✅ 使用 useCallback 优化事件处理函数（Message 和 SessionItem）
- ✅ 使用 React.lazy 懒加载 ChatSettings 组件
- ✅ 添加 Suspense 边界（使用 Spin 作为 fallback）
- ✅ 在 ChatPage 中使用 useMemo 缓存 displayMessages
- ✅ 在 ChatPage 中使用 useCallback 优化事件处理函数

**验收标准**:

- ✅ 组件重渲染减少
- ✅ 代码分割生效（ChatSettings 懒加载）
- ✅ 性能提升明显

- 组件重渲染减少
- 代码分割生效
- 性能提升明显

---

### 12. 错误处理和加载状态

#### 12.1 实现错误处理和加载状态

- [x] 任务完成

**描述**: 实现统一错误处理和加载状态

**子任务**:

- ✅ 在 `src/types/chat.ts` 中定义错误类型枚举（ChatErrorType）
- ✅ 使用 message.error 显示错误提示（所有 API 调用）
- ✅ 处理特定错误：网络错误、会话不存在、权限错误等
- ✅ 页面初始加载显示 Spin（ChatUI 空状态）
- ✅ 消息发送中禁用输入框（ChatInput disabled prop）
- ✅ 会话列表加载显示 loading 状态（SessionList loading prop）
- ✅ 流式响应错误处理（useStreamResponse）
- ✅ React Query 错误处理（onError 回调）
- ✅ 乐观更新错误回滚（useChatHandler）

**验收标准**:

- 错误处理完善
- 错误提示友好
- 加载状态显示正确
- _需求: 8, 17_

---

### 13. 样式和主题

#### 13.1 应用主题色和响应式样式

- [x] 任务完成

**描述**: 应用统一主题色和响应式布局

**子任务**:

- ✅ 使用 teal 主题色（#14b8a6）
- ✅ 应用到用户消息背景（Message 组件）
- ✅ 应用到发送按钮（ChatInput 组件）
- ✅ 应用到会话选中状态（SessionItem 组件）
- ✅ 应用到 ChatHeader（渐变背景）
- ✅ 应用到保存指示器（ChatSettings 组件）
- ✅ 桌面端（> 768px）：左侧栏 280px，主内容区自适应
- ✅ 移动端（< 768px）：使用 CSS 媒体查询调整布局
- ✅ 确保文字可读性（最小字号 14px）
- ✅ 所有组件都有响应式样式

**验收标准**:

- ✅ 主题色应用一致
- ✅ 响应式布局正常
- ✅ 移动端体验良好
- ✅ 文字清晰可读

- 主题色应用一致
- 响应式布局正常
- 移动端体验良好
- _需求: 7_

---

### 14. 可访问性和安全

#### 14.1 实现可访问性和安全防护

- [x] 任务完成

**描述**: 实现键盘导航和安全防护

**子任务**:

- ✅ 为所有按钮添加 aria-label（ChatHeader、ChatScrollButtons）
- ✅ 消息列表容器使用 role="log" 和 aria-live="polite"（ChatMessages）
- ✅ 输入框添加 aria-label="消息输入框"（ChatInput）
- ✅ 配置 Markdown 安全模式（disallowedElements: ['script', 'iframe']）
- ✅ 外部链接添加 rel="noopener noreferrer" target="_blank"
- ✅ 键盘导航支持（Tab、Enter、Esc）
- ✅ 焦点管理（输入框自动聚焦）
- ✅ 用户输入自动转义（React 默认行为）
- 配置 react-markdown 安全模式（disallowedElements: ['script', 'iframe']）
- 外部链接添加 rel="noopener noreferrer" target="_blank"
- 确保 Tab 键导航正常

**验收标准**:

- 键盘导航完整
- 无障碍属性正确
- XSS 防护生效

---

### 15. 测试和文档（可选）

#### 15.1 编写测试和文档

- [ ] 任务完成（可选）

**描述**: 编写单元测试、集成测试和功能文档

**子任务**:

- 测试 useChatHandler hook
- 测试 Message、ChatInput、SessionItem 组件
- 测试消息发送流程
- 测试流式响应流程
- 在 `docs/chat-sessions-page/` 创建 README.md
- 记录组件使用方法和 API 调用方式
- 记录已知问题和性能优化建议

**验收标准**:

- 主要流程测试通过
- 文档完整清晰

---

### 16. RAG 支持（可选功能）

#### 16.1 实现检索增强生成

- [ ] 任务完成（可选）

**描述**: 实现 RAG 功能

**子任务**:

- 检测会话是否包含文件
- 自动启用检索功能
- 在回复中标注引用来源
- 支持配置检索文档数量
- 显示检索到的文档片段

**验收标准**:

- RAG 功能正常
- 引用来源显示正确
- _需求: 18_

---

## 实现优先级

### P0 - 核心功能（必须实现）

- 任务 1：项目基础设施搭建
- 任务 2：会话列表功能实现
- 任务 3：聊天界面核心组件
- 任务 4：消息展示功能
- 任务 5：消息输入和发送
- 任务 6：滚动控制功能
- 任务 7：流式响应处理
- 任务 9：聊天设置功能
- 任务 11：性能优化
- 任务 12：错误处理和加载状态
- 任务 13：样式和主题
- 任务 14：可访问性和安全

### P1 - 可选功能

- 任务 8：文件上传功能
- 任务 10：助手和工具选择
- 任务 15：测试和文档
- 任务 16：RAG 支持

---

## 技术规范

### 技术栈

- **框架**: React 18.3 + TypeScript 5.8
- **UI 库**: Ant Design 5.25
- **状态管理**: Zustand + React Query (TanStack Query)
- **样式方案**: TailwindCSS 4.1 + CSS Modules
- **Markdown**: react-markdown + remark-gfm + rehype-highlight
- **代码高亮**: highlight.js
- **路由**: React Router 7.6

### 开发规范

- 遵循项目的 TypeScript 严格模式
- 所有用户可见文本使用中文
- 代码注释使用中文
- 使用路径别名 `@/` 引用 src 目录
- 组件文件使用 PascalCase 命名
- 优先使用函数式组件和 React Hooks

### 样式规范

- 主题色：teal (#14b8a6)
- 用户消息：teal 背景，白色文字，右对齐
- AI 消息：灰色背景 (#f3f4f6)，黑色文字，左对齐
- 会话列表宽度：280px（可折叠）
- 响应式断点：768px

### API 使用

- 会话 API：`getSessions()` 从 `@/services/api/sessions/sessions`
- 消息 API：`getMessages()` 从 `@/services/api/messages/messages`
- 流式 API：`getChat()` 从 `@/services/api/chat/chat`
- 使用 React Query 的 useQuery 和 useMutation
- 使用 Zustand 管理全局聊天状态
- queryKey 格式：['sessions'], ['messages', sessionId]

### 性能要求

- 使用 React.memo 优化组件
- 使用 useMemo 和 useCallback 优化计算和回调
- 使用 React.lazy 和 Suspense 进行代码分割

### 安全要求

- 配置 react-markdown 安全模式（disallowedElements: ['script', 'iframe']）
- 外部链接添加 rel="noopener noreferrer" target="_blank"
- 用户输入自动转义（React 默认行为）

---

## 注意事项

1. **API 已生成**: 会话、消息、流式 API 已生成，直接导入使用
2. **类型安全**: 使用 API 生成的类型（SessionResponse, MessageDetailResponse）
3. **错误处理**: 所有 API 调用都需要错误处理
4. **加载状态**: 所有异步操作都需要加载状态
5. **React Query**: 使用 useQuery 和 useMutation 管理服务器状态
6. **Zustand**: 使用 store 管理全局聊天状态
7. **响应式**: 确保移动端和桌面端体验良好
8. **性能**: 使用 React.memo、useMemo、useCallback 优化性能

---

## 开始实现

建议按照以下顺序实现：

1. **第一阶段**：任务 1-3（基础设施、会话列表、聊天界面框架）
2. **第二阶段**：任务 4-5（消息展示和输入发送）
3. **第三阶段**：任务 6-7（滚动控制和流式响应）
4. **第四阶段**：任务 9、11-14（设置、优化、错误处理、样式、可访问性）
5. **第五阶段**：根据需要实现可选功能（任务 8、10、15、16）
