import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chatWithMistral, MistralMessage } from '@/lib/ai/mistral-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, chatHistory, targetUserName, language = 'en' } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    // 构建系统提示
    const systemPrompt = language === 'zh'
      ? `你是一个约会聊天助手。用户正在与${targetUserName || '某人'}聊天，需要你帮助分析对方发来的消息并建议合适的��复。

请分析这条消息的含义、情感和意图，然后提供2-3个建议回复。回复应该自然、友好、有趣。

输出格式：
**消息分析：**
[简短分析对方消息的含义和情感]

**建议回复：**
1. [第一个建议回复]
2. [第二个建议回复]
3. [第三个建议回复（可选）]`
      : `You are a dating chat assistant. The user is chatting with ${targetUserName || 'someone'} and needs help analyzing the received message and suggesting appropriate replies.

Please analyze the meaning, emotion, and intent of this message, then provide 2-3 suggested replies. Replies should be natural, friendly, and engaging.

Output format:
**Message Analysis:**
[Brief analysis of the message's meaning and emotion]

**Suggested Replies:**
1. [First suggested reply]
2. [Second suggested reply]
3. [Third suggested reply (optional)]`;

    const messages: MistralMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // 添加聊天历史上下文（最近5条）
    if (chatHistory && Array.isArray(chatHistory)) {
      const recentHistory = chatHistory.slice(-5);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.isOwn ? 'user' : 'assistant',
          content: msg.isOwn ? `[我发送]: ${msg.content}` : `[对方发送]: ${msg.content}`,
        });
      }
    }

    // 添加当前需要分析的消息
    messages.push({
      role: 'user',
      content: language === 'zh'
        ? `请分析对方发来的这条消息并给出回复建议：\n\n"${message}"`
        : `Please analyze this message from them and suggest replies:\n\n"${message}"`,
    });

    const result = await chatWithMistral(messages, {
      temperature: 0.8,
      maxTokens: 512,
    });

    // 记录使用量
    await supabase.from('ai_usage_logs').insert({
      user_id: user.id,
      feature: 'assistant',
      tokens_used: result.tokensUsed,
    });

    return NextResponse.json({
      analysis: result.content,
      tokens_used: result.tokensUsed,
    });
  } catch (error: any) {
    console.error('AI Assistant error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
