'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { startChatSession, sendChatMessage, getAIUsageLimits, ChatSession } from '@/lib/services/ai-service';
import { Bot, Send, AlertTriangle, X } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatSimulationProps {
  targetUserId: string;
  targetUserName: string;
  targetUserAvatar?: string;
  language?: 'zh' | 'en';
  onClose?: () => void;
}

export function AIChatSimulation({
  targetUserId,
  targetUserName,
  targetUserAvatar,
  language = 'en',
  onClose,
}: AIChatSimulationProps) {
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [remainingChats, setRemainingChats] = useState<number | null>(10);
  const [totalLimit, setTotalLimit] = useState<number | null>(10);
  const [isVip, setIsVip] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadLimits = async () => {
    try {
      const limits = await getAIUsageLimits();
      if (!limits) return;
      const remaining = limits.total_chat_limit === null ? null : (limits.total_chat_limit - limits.total_chat_count);
      setRemainingChats(remaining);
      setTotalLimit(limits.total_chat_limit);
      setIsVip(limits.is_vip);
    } catch (err) {
      console.error('Failed to load limits:', err);
    }
  };

  useEffect(() => {
    loadLimits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAcceptDisclaimer = async () => {
    setLoading(true);
    setError(null);

    try {
      const chatSession = await startChatSession(targetUserId);
      setSession(chatSession);
      setShowDisclaimer(false);
      await loadLimits();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to start session';
      if (errorMsg.includes('consent')) {
        setError(language === 'zh'
          ? '该用户未授权AI模拟对话功能'
          : 'This user has not enabled AI chat simulation');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !session || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await sendChatMessage(session.session_id, userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response.ai_reply }]);
      setMessageCount(response.message_count);
    } catch (err: any) {
      setError(err.message || (language === 'zh' ? '发送失败' : 'Failed to send message'));
    } finally {
      setLoading(false);
    }
  };

  const watermark = session?.watermark?.[language] || (language === 'zh' ? '🤖 AI模拟回复' : '🤖 AI-simulated response');

  // 免责声明弹窗
  if (showDisclaimer) {
    return (
      <Dialog open={showDisclaimer} onOpenChange={() => onClose?.()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              {language === 'zh' ? 'AI模拟对话' : 'AI Chat Simulation'}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-left whitespace-pre-line text-sm mt-4">
                {language === 'zh' ? (
                  <>
                    ⚠️ AI模拟对话声明{'\n\n'}
                    此功能使用AI模拟目标用户的对话风格，仅供练习参考。{'\n\n'}
                    重要提示：{'\n'}
                    • AI回复不代表真实用户的想法或态度{'\n'}
                    • 模拟基于公开资料，可能与真人有差异{'\n'}
                    • 请勿将AI回复作为判断真人的依据{'\n'}
                    • 此功能为Beta版，持续优化中
                  </>
                ) : (
                  <>
                    ⚠️ AI Chat Simulation Disclaimer{'\n\n'}
                    This feature uses AI to simulate the target user&apos;s conversation style for practice purposes only.{'\n\n'}
                    Important:{'\n'}
                    • AI responses do not represent the real user&apos;s thoughts{'\n'}
                    • Simulation is based on public profile data{'\n'}
                    • Do not use AI responses to judge the real person{'\n'}
                    • This is a Beta feature
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm">{error}</div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onClose?.()}>
              {language === 'zh' ? '取消' : 'Cancel'}
            </Button>
            <Button onClick={handleAcceptDisclaimer} disabled={loading}>
              {loading ? (language === 'zh' ? '启动中...' : 'Starting...') : (language === 'zh' ? '同意并开始' : 'Agree & Start')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="flex flex-col h-[500px]">
      <div className="pb-2 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold flex items-center gap-2">
            <Bot className="h-4 w-4" />
            {language === 'zh' ? `与 ${targetUserName} 的AI对话` : `AI Chat with ${targetUserName}`}
            <Badge variant="outline" className="text-xs">Beta</Badge>
          </div>
        </div>
        {/* 水印提示 */}
        <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 p-2 rounded mt-2">
          {watermark}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">
            {language === 'zh' ? '发送消息开始对话练习' : 'Send a message to start practicing'}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
              <span className="animate-pulse">...</span>
            </div>
          </div>
        )}

        {/* 每5条消息提醒 */}
        {messageCount > 0 && messageCount % 5 === 0 && (
          <div className="text-center text-xs text-amber-600 py-2">
            {language === 'zh'
              ? '提醒：这是AI模拟对话，不代表真实用户'
              : 'Reminder: This is AI simulation, not the real user'}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="p-4 border-t">
        {error && (
          <div className="text-xs text-red-600 mb-2">{error}</div>
        )}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder={language === 'zh' ? '输入消息...' : 'Type a message...'}
            disabled={loading}
          />
          <Button onClick={handleSendMessage} disabled={loading || !input.trim()} className="bg-indigo-600 hover:bg-indigo-700">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {/* 剩余次数 */}
        <div className="text-xs text-gray-500 mt-2 text-center">
          {isVip || totalLimit === null ? (
            <Badge variant="secondary">VIP {language === 'zh' ? '无限制' : 'Unlimited'}</Badge>
          ) : (
            `${Math.max(0, remainingChats ?? 0)}/${totalLimit} ${language === 'zh' ? '次对话剩余' : 'chats remaining'}`
          )}
        </div>
      </div>
    </div>
  );
}
