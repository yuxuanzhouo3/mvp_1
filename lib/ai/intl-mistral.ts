/**
 * Mistral AI 服务包装器 - INTL 环境使用
 * Mistral AI Service Wrapper - For INTL Environment
 * 
 * 包装现有的 mistral-client.ts 以符合统一接口
 */

import type { IAIService, ChatMessage, AIChatResponse, AIChatOptions } from './types';
import { chatWithMistral, type MistralMessage } from './mistral-client';

// 可用模型
const MISTRAL_MODELS = {
  'mistral-tiny': 'mistral-tiny',
  'mistral-small': 'mistral-small',
  'mistral-small-latest': 'mistral-small-latest',
  'mistral-medium': 'mistral-medium',
  'mistral-large': 'mistral-large-latest',
} as const;

// 默认模型
const DEFAULT_MODEL = 'mistral-small-latest';

/**
 * Mistral AI 服务实现
 */
export class MistralAIService implements IAIService {
  /**
   * 发送聊天请求
   */
  async chat(
    messages: ChatMessage[],
    options?: AIChatOptions
  ): Promise<AIChatResponse> {
    // 转换消息格式
    const mistralMessages: MistralMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const result = await chatWithMistral(mistralMessages, {
      model: options?.model || DEFAULT_MODEL,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    });

    return {
      content: result.content,
      tokensUsed: result.tokensUsed,
      model: options?.model || DEFAULT_MODEL,
    };
  }

  /**
   * 流式聊天请求 - Mistral 暂不支持流式
   */
  async chatStream(
    messages: ChatMessage[],
    options?: AIChatOptions,
    onChunk?: (chunk: string) => void
  ): Promise<AIChatResponse> {
    // Mistral 目前不支持流式，直接返回完整响应
    const result = await this.chat(messages, options);
    onChunk?.(result.content);
    return result;
  }

  /**
   * 获取可用模型列表
   */
  getAvailableModels(): string[] {
    return Object.keys(MISTRAL_MODELS);
  }

  /**
   * 获取默认模型
   */
  getDefaultModel(): string {
    return DEFAULT_MODEL;
  }
}

/**
 * 创建 Mistral 客户端实例
 */
export function createMistralClient(): IAIService {
  return new MistralAIService();
}

