'use client';

import { X, Reply, Image as ImageIcon, Mic, Video, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Message, MessageType } from '@/lib/realtime/chat-client';

interface MessageReplyProps {
  message: Message;
  senderName: string;
  isSelf: boolean;
  onCancel: () => void;
  className?: string;
  language?: 'zh' | 'en';
}

/**
 * 消息回复预览组件
 * 显示在输入框上方，表示正在回复的消息
 */
export function MessageReply({
  message,
  senderName,
  isSelf,
  onCancel,
  className = '',
  language = 'zh',
}: MessageReplyProps) {
  const t = {
    zh: {
      replyingTo: '回复',
      you: '自己',
      image: '图片',
      audio: '语音',
      video: '视频',
      location: '位置',
      sticker: '表情',
    },
    en: {
      replyingTo: 'Replying to',
      you: 'yourself',
      image: 'Image',
      audio: 'Voice',
      video: 'Video',
      location: 'Location',
      sticker: 'Sticker',
    },
  }[language];

  // 获取消息类型图标
  const getMessageIcon = (type: MessageType) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'audio':
        return <Mic className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'location':
        return <MapPin className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // 获取消息预览文本
  const getPreviewText = () => {
    if (message.deleted_at) {
      return language === 'zh' ? '消息已撤回' : 'Message recalled';
    }

    switch (message.message_type) {
      case 'image':
        return t.image;
      case 'audio':
        return t.audio;
      case 'video':
        return t.video;
      case 'location':
        return t.location;
      case 'sticker':
        return t.sticker;
      default:
        return message.content || '';
    }
  };

  // 获取缩略图
  const getThumbnail = () => {
    if (message.message_type === 'image') {
      const metadata = message.metadata as { thumbnail_url?: string; image_url?: string };
      return metadata?.thumbnail_url || metadata?.image_url;
    }
    if (message.message_type === 'video') {
      const metadata = message.metadata as { thumbnail_url?: string };
      return metadata?.thumbnail_url;
    }
    return null;
  };

  const thumbnail = getThumbnail();
  const icon = getMessageIcon(message.message_type);

  return (
    <div className={cn(
      'flex items-center space-x-3 p-2 bg-gray-100 dark:bg-gray-800 rounded-t-lg border-l-4 border-blue-500',
      className
    )}>
      <Reply className="w-4 h-4 text-gray-400 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
          {t.replyingTo} {isSelf ? t.you : senderName}
        </p>
        <div className="flex items-center space-x-2 mt-0.5">
          {icon && (
            <span className="text-gray-400">{icon}</span>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {getPreviewText()}
          </p>
        </div>
      </div>

      {thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt="Message attachment"
          className="w-10 h-10 rounded object-cover flex-shrink-0"
        />
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="p-1 text-gray-400 hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

/**
 * 消息中的引用块组件
 * 显示被引用的消息内容
 */
interface QuotedMessageProps {
  content: string | null;
  senderName: string;
  messageType?: MessageType;
  isOwn?: boolean;
  onClick?: () => void;
  className?: string;
  language?: 'zh' | 'en';
}

export function QuotedMessage({
  content,
  senderName,
  messageType = 'text',
  isOwn = false,
  onClick,
  className = '',
  language = 'zh',
}: QuotedMessageProps) {
  const t = {
    zh: {
      image: '[图片]',
      audio: '[语音]',
      video: '[视频]',
      location: '[位置]',
      sticker: '[表情]',
      recalled: '[消息已撤回]',
    },
    en: {
      image: '[Image]',
      audio: '[Voice]',
      video: '[Video]',
      location: '[Location]',
      sticker: '[Sticker]',
      recalled: '[Message recalled]',
    },
  }[language];

  // 获取预览文本
  const getPreviewText = () => {
    if (!content) {
      switch (messageType) {
        case 'image': return t.image;
        case 'audio': return t.audio;
        case 'video': return t.video;
        case 'location': return t.location;
        case 'sticker': return t.sticker;
        default: return t.recalled;
      }
    }
    return content.slice(0, 50) + (content.length > 50 ? '...' : '');
  };

  return (
    <div
      className={cn(
        'mb-1.5 p-2 rounded border-l-2 cursor-pointer',
        isOwn 
          ? 'bg-blue-400/20 border-blue-300' 
          : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-500',
        className
      )}
      onClick={onClick}
    >
      <p className={cn(
        'text-xs font-medium',
        isOwn ? 'text-blue-200' : 'text-gray-600 dark:text-gray-400'
      )}>
        {senderName}
      </p>
      <p className={cn(
        'text-xs mt-0.5 line-clamp-1',
        isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
      )}>
        {getPreviewText()}
      </p>
    </div>
  );
}

export default MessageReply;

