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

// 获取AI使用限额
export async function getAIUsageLimits(): Promise<AIUsageLimits | null> {
  const isCN = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN';

  // CN 环境返回默认值
  if (isCN) {
    return {
      daily_analysis_count: 0,
      daily_analysis_limit: 3,
      total_chat_count: 0,
      total_chat_limit: null,
      is_vip: false,
    };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('ai_usage_limits')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!data) return null;

  // 检查VIP状态
  const { data: membership } = await supabase
    .from('user_memberships')
    .select('status, expires_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .single();

  return {
    ...data,
    is_vip: !!membership,
  };
}

// AI性格分析
export async function analyzePersonality(targetUserId: string): Promise<{
  analysis: PersonalityAnalysis;
  cached: boolean;
  tokens_used?: number;
}> {
  const { data: { session } } = await supabase.auth.getSession();

  // CN 环境使用本地 token，INTL 环境使用 Supabase session
  const isCN = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN';
  let authToken = '';

  if (isCN) {
    // CN 环境：从 localStorage 获取用户数据
    let cnUserId: string | null = null;
    if (typeof window !== 'undefined') {
      const cnUserData = localStorage.getItem('cn_user');
      if (cnUserData) {
        try {
          const cnUser = JSON.parse(cnUserData);
          cnUserId = cnUser.id;
        } catch {
          // ignore parse error
        }
      }
    }
    if (cnUserId) {
      authToken = `cn_${cnUserId}`;
    } else if (session?.access_token) {
      authToken = session.access_token;
    }
  } else {
    if (!session) throw new Error('Not authenticated');
    authToken = session.access_token;
  }

  if (!authToken) throw new Error('Not authenticated');

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
  const { data: { session } } = await supabase.auth.getSession();

  const isCN = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN';
  let authToken = '';

  if (isCN) {
    let cnUserId: string | null = null;
    if (typeof window !== 'undefined') {
      const cnUserData = localStorage.getItem('cn_user');
      if (cnUserData) {
        try {
          const cnUser = JSON.parse(cnUserData);
          cnUserId = cnUser.id;
        } catch {
          // ignore parse error
        }
      }
    }
    if (cnUserId) {
      authToken = `cn_${cnUserId}`;
    } else if (session?.access_token) {
      authToken = session.access_token;
    }
  } else {
    if (!session) throw new Error('Not authenticated');
    authToken = session.access_token;
  }

  if (!authToken) throw new Error('Not authenticated');

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
  const { data: { session } } = await supabase.auth.getSession();

  const isCN = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN';
  let authToken = '';

  if (isCN) {
    let cnUserId: string | null = null;
    if (typeof window !== 'undefined') {
      const cnUserData = localStorage.getItem('cn_user');
      if (cnUserData) {
        try {
          const cnUser = JSON.parse(cnUserData);
          cnUserId = cnUser.id;
        } catch {
          // ignore parse error
        }
      }
    }
    if (cnUserId) {
      authToken = `cn_${cnUserId}`;
    } else if (session?.access_token) {
      authToken = session.access_token;
    }
  } else {
    if (!session) throw new Error('Not authenticated');
    authToken = session.access_token;
  }

  if (!authToken) throw new Error('Not authenticated');

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
