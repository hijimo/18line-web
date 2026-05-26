/**
 * 腾讯云流式响应类型定义
 */

/**
 * 工具调用结果
 */
export type ToolCallResult = {
  /** 状态 */
  status: 'success' | 'error';
  /** 数据 */
  data?: TODO;
};

/**
 * 工具调用错误
 */
export type ToolCallError = {
  /** 错误码 */
  code: string;
  /** 错误信息 */
  message: string;
};

/**
 * 工具调用详情
 */
export type ToolCallDetail = {
  /** 工具名称 */
  tool_name: string;
  /** 工具ID */
  tool_id: string;
  /** 进度 (0-100) */
  progress?: number;
  /** 结果 */
  result?: ToolCallResult;
  /** 错误 */
  error?: ToolCallError;
};

/**
 * 搜索详情
 */
export type SearchDetail = {
  /** 空间名称 */
  space_name?: string;
  /** 空间数量 */
  space_count?: number;
  /** 文档数量 */
  doc_count?: number;
};

/**
 * 资源检索详情
 */
export type ResourceRetrievalDetail = {
  /** 查询关键词 */
  query: string;
  /** 资源类型 */
  resource_type: string;
  /** 资源数量 */
  resource_count?: number;
  /** 资源列表 */
  resources?: TODO[];
};

/**
 * 处理过程信息
 */
export type ProcessInfo = {
  /** 当前阶段 */
  stage: string;
  /** 阶段描述信息 */
  message: string;
  /** 增量内容（思考阶段使用） */
  delta_content: string;
  /** 完整内容 */
  content: string;
  /** 详细信息 */
  detail: ToolCallDetail | SearchDetail | ResourceRetrievalDetail | null;
};

/**
 * 文件信息
 */
export type FileInfo = {
  target_id: string;
  target_type: string;
};

/**
 * 会议信息
 */
export type MeetingInfo = {
  cover_url: string;
  start_time: number;
};

/**
 * 所有者信息
 */
export type Owner = {
  avatar: string;
  display_name: string;
};

/**
 * 空间信息
 */
export type SpaceInfo = {
  id: string;
  name: string;
};

/**
 * 引用文档片段
 */
export type ReferenceChunk = {
  block_id: string;
  content: string;
  content_with_mllm: string;
  file_info: FileInfo;
  file_pages: TODO;
  file_type: string;
  meeting_info: MeetingInfo;
  owner: Owner;
  space_info: SpaceInfo;
  target_id: string;
  target_type: string;
  title: string;
  updated_at: number;
  url: string;
};

/**
 * 引用文档
 */
export type ReferenceDoc = {
  block_id: string;
  file_type: string;
  target_id: string;
  target_type: string;
  title: string;
  url: string;
};

/**
 * 附加内容
 */
export type AdditionalContent = {
  /** 引用片段数量限制 */
  context_limit_reference_chunks_top_n?: number;
  /** 引用的文档片段 */
  reference_chunks?: ReferenceChunk[];
  /** 生成的问题 */
  generated_question?: string;
  /** 引用的文档列表 */
  reference_docs?: ReferenceDoc[];
  /** 场景 */
  scenario?: string;
};

/**
 * 腾讯云流式消息
 */
export type TencentCloudMessage = {
  /** 本次对话的唯一标识 */
  completion_id: string;
  /** 会话ID */
  session_id: string;
  /** 处理过程信息 */
  processes: ProcessInfo;
  /** 增量输出内容 */
  delta_content: string;
  /** 完整内容 */
  content: string;
  /** 结束原因 */
  finish_reason: string;
  /** 是否停止 */
  is_stop: boolean;
  /** 答案来源 */
  answer_source: string;
  /** 附加内容 */
  additional_content?: AdditionalContent | null;
};

/**
 * 流式阶段类型
 */
export type StreamStage =
  | 'tool_call_start'
  | 'tool_call_progress'
  | 'tool_call_complete'
  | 'tool_call_error'
  | 'internal_searching'
  | 'finished_internal_searching'
  | 'resource_retrieval_start'
  | 'resource_retrieval_complete'
  | 'thinking'
  | '';

/**
 * 流式状态
 */
export type StreamState = {
  /** 当前阶段 */
  stage: StreamStage;
  /** 阶段消息 */
  stageMessage: string;
  /** 思考内容 */
  thinkingContent: string;
  /** 输出内容 */
  outputContent: string;
  /** 完整内容（finish 时） */
  fullContent: string;
  /** 是否正在流式传输 */
  isStreaming: boolean;
  /** 是否完成 */
  isFinished: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 引用文档 */
  referenceDocs?: ReferenceDoc[];
  /** 引用片段 */
  referenceChunks?: ReferenceChunk[];
  /** 会话ID */
  sessionId?: string;
  /** 完成ID */
  completionId?: string;
};
