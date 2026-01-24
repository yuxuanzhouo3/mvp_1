// AI服务 - 前端API调用封装

import { getSupabaseClient } from '@/lib/supabase/client';
import { isChinaDeployment } from '@/lib/config/deployment.config';

const supabase = getSupabaseClient();

export interface PersonalityAnalysis {
  personality_summary: string;
  compatibility_score: number;
  compatibility_analysis: string;
  conversation_topics: string[];
  dos: string[];
  donts: string[];
  potential_challenges: string[];
  first_message_suggestions: string[];
}

export interface AIUsageLimits {
  daily_analysis_count: number;
  daily_analysis_limit: number;
  total_chat_count: number;
  total_chat_limit: number | null;
  is_vip: boolean;
}

export interface ChatSession {
  session_id: string;
  disclaimer: { zh: string; en: string };
  watermark: { zh: string; en: string };
}

export interface ChatMessage {
  ai_reply: string;
  tokens_used: number;
  message_count: number;
  show_reminder: boolean;
}

async function resolveOptionalAuthHeader(): Promise<Record<string, string>> {
  if (isChinaDeployment()) {
    return {};
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// 获取AI使用限额
export async function getAIUsageLimits(): Promise<AIUsageLimits | null> {
  const authHeader = await resolveOptionalAuthHeader();

  const response = await fetch('/api/ai/usage-limits', {
    method: 'GET',
    headers: {
      ...authHeader,
    },
    cache: 'no-store',
  });

  if (!response.ok) return null;
  const data = await response.json();

  return {
    daily_analysis_count: data.daily_analysis_count ?? 0,
    daily_analysis_limit: data.daily_analysis_limit ?? 3,
    total_chat_count: data.total_chat_count ?? 0,
    total_chat_limit: data.total_chat_limit === null ? null : (data.total_chat_limit ?? 10),
    is_vip: !!data.is_vip,
  };
}

// AI性格分析
export async function analyzePersonality(targetUserId: string): Promise<{
  analysis: PersonalityAnalysis;
  cached: boolean;
  tokens_used?: number;
}> {
  const authHeader = await resolveOptionalAuthHeader();

  const response = await fetch('/api/ai/personality-analysis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
    body: JSON.stringify({ target_user_id: targetUserId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Analysis failed');
  }

  return response.json();
}

// 开始AI对话会话
export async function startChatSession(targetUserId: string): Promise<ChatSession> {
  const authHeader = await resolveOptionalAuthHeader();

  const response = await fetch('/api/ai/chat/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
    body: JSON.stringify({ target_user_id: targetUserId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start session');
  }

  return response.json();
}

// 发送AI对话消息
export async function sendChatMessage(sessionId: string, message: string): Promise<ChatMessage> {
  const authHeader = await resolveOptionalAuthHeader();

  const response = await fetch('/api/ai/chat/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
    body: JSON.stringify({ session_id: sessionId, message }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send message');
  }

  return response.json();
}

// 更新AI对话授权设置
export async function updateAIChatConsent(consent: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_profiles')
    .update({ ai_chat_consent: consent })
    .eq('user_id', user.id);

  if (error) throw error;
}

// AI小助手 - 分析消息并建议回复
export interface AIAssistantResponse {
  analysis: string;
  tokens_used: number;
}

export interface ChatHistoryItem {
  content: string;
  isOwn: boolean;
}

export async function getAIAssistant(
  message: string,
  targetUserName?: string,
  chatHistory?: ChatHistoryItem[],
  language: 'zh' | 'en' = 'en'
): Promise<AIAssistantResponse> {
  const historyMessages =
    chatHistory
      ?.map((item) => ({
        role: item.isOwn ? 'user' : 'assistant',
        content: item.content,
      }))
      .filter((m) => typeof m.content === 'string' && m.content.trim().length > 0) || [];

  const instruction =
    language === 'zh'
      ? `请根据以上聊天上下文，分析对方最后这句消息，并给出 3 条自然、礼貌且不冒犯的中文回复建议：\n对方消息：“${message}”`
      : `Based on the chat context above, analyze the other person's last message and give 3 natural, polite reply suggestions in English:\nTheir message: "${message}"`;

  const response = await fetch('/api/ai/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'general_assistant',
      messages: [...historyMessages, { role: 'user', content: instruction }],
      context: targetUserName ? { name: targetUserName } : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'AI Assistant failed');
  }

  const data = await response.json();
  const analysis = data?.analysis || data?.content || '';
  const tokensUsed = data?.tokens_used ?? data?.tokensUsed ?? 0;
  return { analysis, tokens_used: tokensUsed };
}
