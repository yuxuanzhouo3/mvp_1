'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileJson, FileCode, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportChat, ExportOptions, ChatExportData, convertMessagesToExport } from '@/lib/chat/export-chat';
import { chatClient, Message } from '@/lib/realtime/chat-client';

interface ExportDialogProps {
  roomId: string;
  currentUserId: string;
  currentUsername: string;
  otherUserId: string;
  otherUsername: string;
  onClose: () => void;
  className?: string;
  language?: 'zh' | 'en';
}

/**
 * 导出对话框组件
 */
export function ExportDialog({
  roomId,
  currentUserId,
  currentUsername,
  otherUserId,
  otherUsername,
  onClose,
  className = '',
  language = 'zh',
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<'txt' | 'json' | 'html'>('txt');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = {
    zh: {
      title: '导出聊天记录',
      description: '选择导出格式，下载完整的聊天记录',
      formats: {
        txt: '纯文本',
        json: 'JSON 数据',
        html: 'HTML 网页',
      },
      formatDescriptions: {
        txt: '简单文本格式，便于阅读',
        json: '结构化数据，便于处理',
        html: '网页格式，保留样式',
      },
      export: '导出',
      exporting: '导出中...',
      cancel: '取消',
      error: '导出失败，请重试',
    },
    en: {
      title: 'Export Chat History',
      description: 'Select format to download complete chat history',
      formats: {
        txt: 'Plain Text',
        json: 'JSON Data',
        html: 'HTML Page',
      },
      formatDescriptions: {
        txt: 'Simple text format, easy to read',
        json: 'Structured data, easy to process',
        html: 'Web page format, with styling',
      },
      export: 'Export',
      exporting: 'Exporting...',
      cancel: 'Cancel',
      error: 'Export failed, please retry',
    },
  }[language];

  const formats: Array<{ key: 'txt' | 'json' | 'html'; icon: typeof FileText }> = [
    { key: 'txt', icon: FileText },
    { key: 'json', icon: FileJson },
    { key: 'html', icon: FileCode },
  ];

  // 执行导出
  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      // 获取所有消息
      const allMessages: Message[] = [];
      let hasMore = true;
      let beforeTimestamp: string | undefined;

      while (hasMore) {
        const messages = await chatClient.getMessages(roomId, 100, beforeTimestamp);
        if (messages.length === 0) {
          hasMore = false;
        } else {
          allMessages.push(...messages);
          beforeTimestamp = messages[messages.length - 1].sent_at;
          
          // 安全限制：最多导出 5000 条消息
          if (allMessages.length >= 5000) {
            hasMore = false;
          }
        }
      }

      // 按时间正序排列
      allMessages.sort((a, b) => 
        new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
      );

      // 转换为导出格式
      const usernames: Record<string, string> = {
        [currentUserId]: currentUsername,
        [otherUserId]: otherUsername,
      };

      const exportMessages = convertMessagesToExport(allMessages, usernames);

      const exportData: ChatExportData = {
        roomId,
        exportedAt: new Date().toISOString(),
        participants: [
          { userId: currentUserId, username: currentUsername },
          { userId: otherUserId, username: otherUsername },
        ],
        messages: exportMessages,
        totalCount: exportMessages.length,
      };

      const options: ExportOptions = {
        format: selectedFormat,
        includeMedia: true,
      };

      await exportChat(exportData, options, language);
      onClose();
    } catch (err) {
      console.error('导出失败:', err);
      setError(t.error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={cn(
        'bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md',
        className
      )}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t.title}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 内容 */}
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t.description}
          </p>

          {/* 格式选择 */}
          <div className="space-y-2">
            {formats.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className={cn(
                  'flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors',
                  selectedFormat === key
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
                onClick={() => setSelectedFormat(key)}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center mr-3',
                  selectedFormat === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {t.formats[key]}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t.formatDescriptions[key]}
                  </p>
                </div>
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                  selectedFormat === key
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                )}>
                  {selectedFormat === key && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 错误提示 */}
          {error && (
            <p className="mt-4 text-sm text-red-500 text-center">{error}</p>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            {t.cancel}
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.exporting}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                {t.export}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ExportDialog;

