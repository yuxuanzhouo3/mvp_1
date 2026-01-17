/**
 * AI 服务接口类型定义
 * AI Service Interface Types
 * 
 * 为 CN (通义千问) 和 INTL (Mistral AI) 环境定义统一接口
 */

// 消息角色类型
export type MessageRole = 'system' | 'user' | 'assistant';

// 聊天消息
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

// AI 聊天响应
export interface AIChatResponse {
  content: string;
  tokensUsed: number;
  model?: string;
}

// AI 聊天选项
export interface AIChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

// AI 服务接口
export interface IAIService {
  /**
   * 发送聊天请求
   */
  chat(
    messages: ChatMessage[],
    options?: AIChatOptions
  ): Promise<AIChatResponse>;

  /**
   * 流式聊天请求
   */
  chatStream?(
    messages: ChatMessage[],
    options?: AIChatOptions,
    onChunk?: (chunk: string) => void
  ): Promise<AIChatResponse>;

  /**
   * 获取可用模型列表
   */
  getAvailableModels(): string[];

  /**
   * 获取默认模型
   */
  getDefaultModel(): string;
}

// 人格分析结果
export interface PersonalityAnalysisResult {
  mbtiType?: string;
  traits: {
    name: string;
    score: number;
    description: string;
  }[];
  summary: string;
  suggestions: string[];
}

// AI 助手类型
export type AIAssistantType = 'chat_simulation' | 'personality_analysis' | 'general_assistant';

// AI 聊天会话配置
export interface AIChatSessionConfig {
  type: AIAssistantType;
  targetUserProfile?: {
    name: string;
    age?: number;
    gender?: string;
    interests?: string[];
    personality?: string;
    bio?: string;
  };
  systemPrompt?: string;
  language?: 'zh' | 'en';
}

