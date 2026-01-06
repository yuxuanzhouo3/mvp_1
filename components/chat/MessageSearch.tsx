'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { chatClient, Message } from '@/lib/realtime/chat-client';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  content: string;
  sender_id: string;
  sent_at: string;
  highlighted_content?: string;
}

interface MessageSearchProps {
  roomId: string;
  onResultClick: (messageId: string) => void;
  onClose: () => void;
  className?: string;
  language?: 'zh' | 'en';
}

/**
 * 消息搜索组件
 * 在聊天室内搜索历史消息
 */
export function MessageSearch({
  roomId,
  onResultClick,
  onClose,
  className = '',
  language = 'zh',
}: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [totalCount, setTotalCount] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const t = {
    zh: {
      placeholder: '搜索消息...',
      noResults: '未找到结果',
      searching: '搜索中...',
      results: '个结果',
    },
    en: {
      placeholder: 'Search messages...',
      noResults: 'No results found',
      searching: 'Searching...',
      results: 'results',
    },
  }[language];

  // 搜索消息
  const searchMessages = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setResults([]);
      setTotalCount(0);
      setCurrentIndex(-1);
      return;
    }

    setIsSearching(true);

    try {
      const data = await chatClient.searchMessages(roomId, keyword, 50);
      
      const searchResults: SearchResult[] = data.map((msg) => ({
        id: msg.id,
        content: msg.content || '',
        sender_id: msg.sender_id,
        sent_at: msg.sent_at,
        highlighted_content: (msg as unknown as { highlighted_content?: string }).highlighted_content,
      }));

      setResults(searchResults);
      setTotalCount(searchResults.length);
      setCurrentIndex(searchResults.length > 0 ? 0 : -1);

      // 如果有结果，自动跳转到第一个
      if (searchResults.length > 0) {
        onResultClick(searchResults[0].id);
      }
    } catch (err) {
      console.error('搜索失败:', err);
      setResults([]);
      setTotalCount(0);
    } finally {
      setIsSearching(false);
    }
  }, [roomId, onResultClick]);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      searchMessages(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchMessages]);

  // 聚焦输入框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 上一个结果
  const goToPrev = () => {
    if (results.length === 0) return;
    const newIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
    setCurrentIndex(newIndex);
    onResultClick(results[newIndex].id);
  };

  // 下一个结果
  const goToNext = () => {
    if (results.length === 0) return;
    const newIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    onResultClick(results[newIndex].id);
  };

  // 键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        goToPrev();
      } else {
        goToNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm',
      className
    )}>
      <div className="flex items-center px-4 py-2 space-x-2">
        {/* 搜索图标 */}
        <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />

        {/* 输入框 */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.placeholder}
          className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
        />

        {/* 搜索中指示器 */}
        {isSearching && (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        )}

        {/* 结果计数 */}
        {!isSearching && query && (
          <span className="text-sm text-gray-500">
            {totalCount > 0 
              ? `${currentIndex + 1}/${totalCount}`
              : t.noResults
            }
          </span>
        )}

        {/* 导航按钮 */}
        {totalCount > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrev}
              className="p-1"
              title="上一个 (Shift+Enter)"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNext}
              className="p-1"
              title="下一个 (Enter)"
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
          </>
        )}

        {/* 关闭按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="p-1"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 搜索结果预览列表 */}
      {query && results.length > 0 && (
        <div className="max-h-48 overflow-y-auto border-t border-gray-100 dark:border-gray-700">
          {results.slice(0, 10).map((result, index) => (
            <div
              key={result.id}
              className={cn(
                'px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700',
                index === currentIndex && 'bg-blue-50 dark:bg-blue-900/30'
              )}
              onClick={() => {
                setCurrentIndex(index);
                onResultClick(result.id);
              }}
            >
              <div className="flex items-center justify-between">
                <p 
                  className="text-sm text-gray-900 dark:text-white line-clamp-1 flex-1"
                  dangerouslySetInnerHTML={{
                    __html: result.highlighted_content || result.content.slice(0, 100),
                  }}
                />
                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                  {formatTime(result.sent_at)}
                </span>
              </div>
            </div>
          ))}
          {results.length > 10 && (
            <div className="px-4 py-2 text-xs text-gray-400 text-center">
              还有 {results.length - 10} 条结果...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MessageSearch;

