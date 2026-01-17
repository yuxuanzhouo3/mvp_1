'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getAIAssistant, ChatHistoryItem } from '@/lib/services/ai-service';
import { Bot, X, Loader2, Sparkles } from 'lucide-react';

interface AIAssistantProps {
  message: string;
  targetUserName?: string;
  chatHistory?: ChatHistoryItem[];
  language?: 'zh' | 'en';
  onClose: () => void;
}

export function AIAssistant({
  message,
  targetUserName,
  chatHistory,
  language = 'en',
  onClose,
}: AIAssistantProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getAIAssistant(message, targetUserName, chatHistory, language);
      setAnalysis(result.analysis);
    } catch (err: any) {
      setError(err.message || (language === 'zh' ? '分析失败' : 'Analysis failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 max-w-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Bot className="h-5 w-5" />
          <span className="font-medium text-sm">
            {language === 'zh' ? 'AI小助手' : 'AI Assistant'}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 p-2 bg-gray-50 dark:bg-gray-900 rounded">
        {language === 'zh' ? '分析消息：' : 'Analyzing: '}
        <span className="text-gray-700 dark:text-gray-300">&quot;{message.slice(0, 50)}{message.length > 50 ? '...' : ''}&quot;</span>
      </div>

      {!analysis && !loading && (
        <Button
          onClick={handleAnalyze}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          size="sm"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {language === 'zh' ? '分析并建议回复' : 'Analyze & Suggest Replies'}
        </Button>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          <span className="ml-2 text-sm text-gray-500">
            {language === 'zh' ? '正在分析...' : 'Analyzing...'}
          </span>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded">
          {error}
        </div>
      )}

      {analysis && (
        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
          {analysis}
        </div>
      )}
    </div>
  );
}
