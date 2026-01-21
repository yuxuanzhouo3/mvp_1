// AI服务 - 前端API调用封装

import { getSupabaseClient } from '@/lib/supabase/client';

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

async function resolveAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (typeof window !== 'undefined') {
    const cnUserData = localStorage.getItem('cn_user');
    if (cnUserData) {
      try {
        const cnUser = JSON.parse(cnUserData);
        if (cnUser?.id) {
          return `cn_${cnUser.id}`;
        }
      } catch {}
    }
  }

  if (session?.access_token) {
    return session.access_token;
  }

  throw new Error('Not authenticated');
}

// 获取AI使用限额
export async function getAIUsageLimits(): Promise<AIUsageLimits | null> {
  let authToken = '';
  try {
    authToken = await resolveAuthToken();
  } catch {
    return null;
  }

  const response = await fetch('/api/ai/usage-limits', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
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
  const authToken = await resolveAuthToken();

  const response = await fetch('/api/ai/personality-analysis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
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
  const authToken = await resolveAuthToken();

  const response = await fetch('/api/ai/chat/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
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
  const authToken = await resolveAuthToken();

  const response = await fetch('/api/ai/chat/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
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
  const response = await fetch('/api/ai/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, targetUserName, chatHistory, language }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'AI Assistant failed');
  }

  return response.json();
}
