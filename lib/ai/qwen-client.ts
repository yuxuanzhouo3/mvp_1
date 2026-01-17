/**
 * 通义千问 AI 客户端 - CN 环境使用
 * Qwen AI Client - For CN Environment
 * 
 * 使用阿里云通义千问 API
 * https://help.aliyun.com/zh/dashscope/developer-reference/api-details
 */

import type { IAIService, ChatMessage, AIChatResponse, AIChatOptions } from './types';

// 通义千问 API 配置
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

// 可用模型
const QWEN_MODELS = {
  'qwen-turbo': 'qwen-turbo',           // 快速响应模型
  'qwen-plus': 'qwen-plus',             // 增强版模型
  'qwen-max': 'qwen-max',               // 最强模型
  'qwen-max-longcontext': 'qwen-max-longcontext', // 长上下文模型
} as const;

// 默认模型
const DEFAULT_MODEL = 'qwen-turbo';

// API 响应类型 (result_format: 'message')
interface QwenResponse {
  output: {
    choices: Array<{
      message: {
        role: string;
        content: string;
      };
      finish_reason: string;
    }>;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  request_id: string;
}

interface QwenStreamResponse {
  output: {
    text: string;
    finish_reason: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

/**
 * 通义千问 AI 服务实现
 */
export class QwenAIService implements IAIService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('[Qwen AI] API key not configured. Set DASHSCOPE_API_KEY or QWEN_API_KEY environment variable.');
    }
  }

  /**
   * 发送聊天请求
   */
  async chat(
    messages: ChatMessage[],
    options?: AIChatOptions
  ): Promise<AIChatResponse> {
    if (!this.apiKey) {
      throw new Error('Qwen API key not configured');
    }

    const model = options?.model || DEFAULT_MODEL;
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? 1500;

    // 转换消息格式
    const qwenMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const requestBody = {
      model,
      input: {
        messages: qwenMessages,
      },
      parameters: {
        temperature,
        max_tokens: maxTokens,
        result_format: 'message',
      },
    };

    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Qwen AI] API error:', response.status, errorText);
      throw new Error(`Qwen API error: ${response.status} - ${errorText}`);
    }

    const data: QwenResponse = await response.json();

    // 从 choices 数组中提取内容
    const content = data.output?.choices?.[0]?.message?.content || '';

    return {
      content,
      tokensUsed: data.usage?.total_tokens || 0,
      model,
    };
  }

  /**
   * 流式聊天请求
   */
  async chatStream(
    messages: ChatMessage[],
    options?: AIChatOptions,
    onChunk?: (chunk: string) => void
  ): Promise<AIChatResponse> {
    if (!this.apiKey) {
      throw new Error('Qwen API key not configured');
    }

    const model = options?.model || DEFAULT_MODEL;
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? 1500;

    // 转换消息格式
    const qwenMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const requestBody = {
      model,
      input: {
        messages: qwenMessages,
      },
      parameters: {
        temperature,
        max_tokens: maxTokens,
        result_format: 'message',
        incremental_output: true, // 启用增量输出
      },
    };

    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-DashScope-SSE': 'enable', // 启用 SSE
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Qwen API error: ${response.status} - ${errorText}`);
    }

    // 处理 SSE 流
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let totalTokens = 0;

    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.startsWith('data:'));

        for (const line of lines) {
          const jsonStr = line.replace('data:', '').trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const data: QwenStreamResponse = JSON.parse(jsonStr);
            const text = data.output?.text || '';
            
            if (text) {
              fullContent += text;
              onChunk?.(text);
            }

            if (data.usage) {
              totalTokens = data.usage.total_tokens;
            }
          } catch (e) {
            // 忽略 JSON 解析错误
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      content: fullContent,
      tokensUsed: totalTokens,
      model,
    };
  }

  /**
   * 获取可用模型列表
   */
  getAvailableModels(): string[] {
    return Object.keys(QWEN_MODELS);
  }

  /**
   * 获取默认模型
   */
  getDefaultModel(): string {
    return DEFAULT_MODEL;
  }
}

/**
 * 创建通义千问客户端实例
 */
export function createQwenClient(): IAIService {
  return new QwenAIService();
}

/**
 * 直接调用通义千问聊天（兼容旧 API）
 */
export async function chatWithQwen(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{ content: string; tokensUsed: number }> {
  const client = createQwenClient();
  return client.chat(messages, options);
}

