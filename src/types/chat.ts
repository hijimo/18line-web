/**
 * 聊天相关类型定义
 * 基于 API 类型扩展的本地使用类型
 */

import type { Message } from './api/message';
import type { MessageDetailResponse } from './api/messageDetailResponse';
import type { SessionResponse } from './api/sessionResponse';

/**
 * 消息角色枚举
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

/**
 * 聊天设置
 * 用于配置聊天行为和模型参数
 */
export interface ChatSettings {
  /** 模型名称 */
  model: string;
  /** 温度参数 (0-2) */
  temperature: number;
  /** 上下文长度 */
  contextLength: number;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 是否启用检索增强生成 */
  enableRetrieval: boolean;
  /** 检索文档数量 */
  retrievalCount: number;
  /** TopP 参数 */
  topP?: number;
}

/**
 * 流式响应状态
 * 用于管理流式消息生成的状态
 */
export interface StreamingState {
  /** 是否正在流式传输 */
  isStreaming: boolean;
  /** 当前流式内容 */
  currentContent: string;
  /** 消息 ID */
  messageId?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 聊天错误类型枚举
 */
export enum ChatErrorType {
  /** 网络错误 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** 会话不存在 */
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  /** 消息发送失败 */
  MESSAGE_SEND_FAILED = 'MESSAGE_SEND_FAILED',
  /** 文件上传失败 */
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  /** 流式响应错误 */
  STREAM_ERROR = 'STREAM_ERROR',
  /** 无效输入 */
  INVALID_INPUT = 'INVALID_INPUT',
  /** 未授权 */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /** 服务器错误 */
  SERVER_ERROR = 'SERVER_ERROR',
}

/**
 * 聊天错误
 */
export interface ChatError {
  /** 错误类型 */
  type: ChatErrorType;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: unknown;
  /** 错误代码 */
  code?: string;
}

/**
 * 文件项
 * 用于表示上传的文件
 */
export interface FileItem {
  /** 文件 ID */
  id: string;
  /** 文件名 */
  name: string;
  /** 文件类型 */
  type: string;
  /** 文件大小（字节） */
  size: number;
  /** 文件 URL */
  url: string;
  /** 上传时间 */
  uploadedAt: string;
  /** 上传状态 */
  status?: 'uploading' | 'done' | 'error';
  /** 上传进度 (0-100) */
  progress?: number;
}

/**
 * 消息图片
 * 用于表示消息中的图片
 */
export interface MessageImage {
  /** 图片 ID */
  id: string;
  /** 消息 ID */
  messageId: string;
  /** 图片 URL */
  url: string;
  /** Base64 编码（用于上传） */
  base64?: string;
  /** 文件名 */
  fileName: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 图片宽度 */
  width?: number;
  /** 图片高度 */
  height?: number;
}

/**
 * 助手
 * 用于表示 AI 助手配置
 */
export interface Assistant {
  /** 助手 ID */
  id: string;
  /** 助手名称 */
  name: string;
  /** 助手描述 */
  description: string;
  /** 使用的模型 */
  model: string;
  /** 系统提示词 */
  systemPrompt: string;
  /** 关联的工具 */
  tools: Tool[];
  /** 助手图标 */
  icon?: string;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 工具
 * 用于表示可用的功能工具
 */
export interface Tool {
  /** 工具 ID */
  id: string;
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 是否启用 */
  enabled: boolean;
  /** 工具类型 */
  type?: string;
  /** 工具参数 */
  parameters?: Record<string, unknown>;
}

/**
 * 本地会话类型
 * 基于 API SessionResponse 扩展
 */
export type ChatSession = SessionResponse;

/**
 * 本地消息类型
 * 基于 API Message 和 MessageDetailResponse 扩展
 */
export type ChatMessage = Message | MessageDetailResponse;

/**
 * 消息发送参数
 */
export interface SendMessageParams {
  /** 消息内容 */
  content: string;
  /** 会话 ID */
  sessionId: string;
  /** 附加的文件 */
  files?: FileItem[];
  /** 附加的图片 */
  images?: MessageImage[];
  /** 是否流式响应 */
  stream?: boolean;
}

/**
 * 会话创建参数
 */
export interface CreateSessionParams {
  /** 会话标题 */
  title?: string;
  /** 模型名称 */
  modelName?: string;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 温度参数 */
  temperature?: number;
  /** TopP 参数 */
  topP?: number;
}

/**
 * 会话更新参数
 */
export interface UpdateSessionParams {
  /** 会话标题 */
  title?: string;
  /** 模型名称 */
  modelName?: string;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 温度参数 */
  temperature?: number;
  /** TopP 参数 */
  topP?: number;
  /** 是否置顶 */
  isPinned?: boolean;
  /** 是否归档 */
  isArchived?: boolean;
}

/**
 * 滚动位置
 */
export interface ScrollPosition {
  /** 是否在顶部 */
  isAtTop: boolean;
  /** 是否在底部 */
  isAtBottom: boolean;
  /** 滚动百分比 (0-100) */
  scrollPercentage: number;
}
