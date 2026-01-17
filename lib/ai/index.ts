/**
 * AI 服务统一导出
 * AI Service Unified Exports
 */

export * from './types';
export * from './qwen-client';
export * from './intl-mistral';
export { chatWithMistral, type MistralMessage } from './mistral-client';

// 根据环境获取 AI 服务
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { QwenAIService } from './qwen-client';
import { MistralAIService } from './intl-mistral';
import type { IAIService } from './types';

/**
 * 获取当前环境的 AI 服务
 */
export function getAIService(): IAIService {
  if (isChinaDeployment()) {
    return new QwenAIService();
  }
  return new MistralAIService();
}

/**
 * 获取 AI 系统提示词
 * 根据环境返回对应语言的提示词
 */
export function getSystemPrompt(type: 'chat_simulation' | 'personality_analysis' | 'general_assistant', context?: {
  targetName?: string;
  targetAge?: number;
  targetGender?: string;
  targetInterests?: string[];
  targetPersonality?: string;
  targetBio?: string;
}): string {
  const isCN = isChinaDeployment();

  switch (type) {
    case 'chat_simulation':
      if (isCN) {
        return `你是一个友好、善于交流的虚拟约会对象。你的名字是${context?.targetName || '小明'}。
${context?.targetAge ? `年龄：${context.targetAge}岁` : ''}
${context?.targetGender ? `性别：${context.targetGender}` : ''}
${context?.targetInterests?.length ? `兴趣爱好：${context.targetInterests.join('、')}` : ''}
${context?.targetPersonality ? `性格类型：${context.targetPersonality}` : ''}
${context?.targetBio ? `个人简介：${context.targetBio}` : ''}

请以自然、亲切的方式与用户交流，像真实的约会对象一样回应。你可以：
- 分享你的想法和感受
- 询问对方的兴趣和生活
- 适当展现个性和幽默感
- 保持积极、友好的态度

注意：
- 回复要简洁自然，不要太长
- 使用口语化的表达
- 适当使用表情符号
- 不要透露自己是AI`;
      } else {
        return `You are a friendly and engaging virtual date partner. Your name is ${context?.targetName || 'Alex'}.
${context?.targetAge ? `Age: ${context.targetAge}` : ''}
${context?.targetGender ? `Gender: ${context.targetGender}` : ''}
${context?.targetInterests?.length ? `Interests: ${context.targetInterests.join(', ')}` : ''}
${context?.targetPersonality ? `Personality: ${context.targetPersonality}` : ''}
${context?.targetBio ? `Bio: ${context.targetBio}` : ''}

Please engage with the user naturally and warmly, like a real date would. You can:
- Share your thoughts and feelings
- Ask about their interests and life
- Show personality and appropriate humor
- Maintain a positive, friendly attitude

Note:
- Keep responses concise and natural
- Use conversational language
- Use emojis appropriately
- Don't reveal that you're an AI`;
      }

    case 'personality_analysis':
      if (isCN) {
        return `你是一位专业的心理分析师，擅长根据对话内容分析用户的性格特征。请根据用户的回答，分析其：
1. MBTI 人格类型倾向
2. 主要性格特征（如开放性、责任心、外向性、亲和性、情绪稳定性）
3. 社交风格
4. 潜在优势和需要注意的方面

请以专业但友好的方式给出分析结果。`;
      } else {
        return `You are a professional personality analyst skilled at analyzing personality traits from conversations. Based on the user's responses, analyze their:
1. MBTI personality type tendencies
2. Key personality traits (openness, conscientiousness, extraversion, agreeableness, emotional stability)
3. Social style
4. Potential strengths and areas to be mindful of

Please provide analysis in a professional yet friendly manner.`;
      }

    case 'general_assistant':
    default:
      if (isCN) {
        return `你是 PersonaLink 的 AI 助手，一个帮助用户找到理想伴侣的社交匹配平台。你可以：
- 回答关于平台功能的问题
- 提供约会和社交建议
- 帮助用户完善个人资料
- 解答常见问题

请保持专业、友好、有帮助的态度。`;
      } else {
        return `You are the AI assistant for PersonaLink, a social matching platform that helps users find their ideal partners. You can:
- Answer questions about platform features
- Provide dating and social advice
- Help users improve their profiles
- Answer frequently asked questions

Please maintain a professional, friendly, and helpful attitude.`;
      }
  }
}

