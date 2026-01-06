/**
 * 聊天记录导出工具
 * 支持导出为 TXT 和 JSON 格式
 */

import { Message, MessageType } from '@/lib/realtime/chat-client';

export interface ExportOptions {
  format: 'txt' | 'json' | 'html';
  includeMedia?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ChatExportData {
  roomId: string;
  exportedAt: string;
  participants: {
    userId: string;
    username: string;
  }[];
  messages: ExportMessage[];
  totalCount: number;
}

export interface ExportMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string | null;
  messageType: MessageType;
  timestamp: string;
  isRead: boolean;
  isRecalled: boolean;
  mediaUrl?: string;
}

/**
 * 格式化时间戳
 */
function formatTimestamp(dateString: string, language: 'zh' | 'en' = 'zh'): string {
  const date = new Date(dateString);
  return date.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 获取消息类型描述
 */
function getMessageTypeLabel(type: MessageType, language: 'zh' | 'en' = 'zh'): string {
  const labels = {
    zh: {
      text: '文本',
      image: '图片',
      audio: '语音',
      video: '视频',
      location: '位置',
      sticker: '表情',
      system: '系统消息',
    },
    en: {
      text: 'Text',
      image: 'Image',
      audio: 'Voice',
      video: 'Video',
      location: 'Location',
      sticker: 'Sticker',
      system: 'System',
    },
  };
  return labels[language][type] || type;
}

/**
 * 转换消息为导出格式
 */
export function convertMessagesToExport(
  messages: Message[],
  usernames: Record<string, string>
): ExportMessage[] {
  return messages.map((msg) => ({
    id: msg.id,
    senderId: msg.sender_id,
    senderName: usernames[msg.sender_id] || 'Unknown',
    content: msg.content,
    messageType: msg.message_type,
    timestamp: msg.sent_at,
    isRead: msg.is_read,
    isRecalled: !!msg.deleted_at,
    mediaUrl: getMediaUrl(msg),
  }));
}

/**
 * 获取媒体 URL
 */
function getMediaUrl(msg: Message): string | undefined {
  const metadata = msg.metadata as Record<string, string> | undefined;
  if (!metadata) return undefined;

  switch (msg.message_type) {
    case 'image':
      return metadata.image_url;
    case 'audio':
      return metadata.audio_url;
    case 'video':
      return metadata.video_url;
    default:
      return undefined;
  }
}

/**
 * 导出为纯文本格式
 */
export function exportToTxt(
  data: ChatExportData,
  language: 'zh' | 'en' = 'zh'
): string {
  const t = {
    zh: {
      title: '聊天记录导出',
      exportTime: '导出时间',
      roomId: '聊天室 ID',
      participants: '参与者',
      totalMessages: '消息总数',
      divider: '─'.repeat(50),
      recalled: '[消息已撤回]',
    },
    en: {
      title: 'Chat Export',
      exportTime: 'Export Time',
      roomId: 'Room ID',
      participants: 'Participants',
      totalMessages: 'Total Messages',
      divider: '─'.repeat(50),
      recalled: '[Message recalled]',
    },
  }[language];

  let output = `${t.title}\n${t.divider}\n`;
  output += `${t.exportTime}: ${formatTimestamp(data.exportedAt, language)}\n`;
  output += `${t.roomId}: ${data.roomId}\n`;
  output += `${t.participants}: ${data.participants.map(p => p.username).join(', ')}\n`;
  output += `${t.totalMessages}: ${data.totalCount}\n`;
  output += `${t.divider}\n\n`;

  // 按日期分组消息
  let currentDate = '';
  data.messages.forEach((msg) => {
    const msgDate = new Date(msg.timestamp).toLocaleDateString(
      language === 'zh' ? 'zh-CN' : 'en-US'
    );

    if (msgDate !== currentDate) {
      currentDate = msgDate;
      output += `\n━━━ ${msgDate} ━━━\n\n`;
    }

    const time = new Date(msg.timestamp).toLocaleTimeString(
      language === 'zh' ? 'zh-CN' : 'en-US',
      { hour: '2-digit', minute: '2-digit' }
    );

    if (msg.isRecalled) {
      output += `[${time}] ${msg.senderName}: ${t.recalled}\n`;
    } else if (msg.messageType === 'text') {
      output += `[${time}] ${msg.senderName}: ${msg.content}\n`;
    } else {
      const typeLabel = getMessageTypeLabel(msg.messageType, language);
      output += `[${time}] ${msg.senderName}: [${typeLabel}]`;
      if (msg.mediaUrl) {
        output += ` ${msg.mediaUrl}`;
      }
      output += '\n';
    }
  });

  return output;
}

/**
 * 导出为 JSON 格式
 */
export function exportToJson(data: ChatExportData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * 导出为 HTML 格式
 */
export function exportToHtml(
  data: ChatExportData,
  language: 'zh' | 'en' = 'zh'
): string {
  const t = {
    zh: {
      title: '聊天记录',
      exportTime: '导出时间',
      participants: '参与者',
      recalled: '消息已撤回',
    },
    en: {
      title: 'Chat History',
      exportTime: 'Export Time',
      participants: 'Participants',
      recalled: 'Message recalled',
    },
  }[language];

  let html = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header h1 { margin: 0 0 10px 0; color: #333; }
    .header p { margin: 5px 0; color: #666; font-size: 14px; }
    .date-divider {
      text-align: center;
      margin: 20px 0;
      color: #999;
      font-size: 12px;
    }
    .message {
      display: flex;
      margin: 10px 0;
    }
    .message.self { justify-content: flex-end; }
    .message-content {
      max-width: 70%;
      padding: 10px 15px;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    .message.self .message-content {
      background: #0084ff;
      color: white;
    }
    .message-sender {
      font-size: 12px;
      color: #999;
      margin-bottom: 4px;
    }
    .message.self .message-sender { text-align: right; color: rgba(255,255,255,0.7); }
    .message-text { word-break: break-word; }
    .message-time {
      font-size: 11px;
      color: #999;
      margin-top: 4px;
    }
    .message.self .message-time { text-align: right; color: rgba(255,255,255,0.7); }
    .message-media { color: #0084ff; font-style: italic; }
    .message.self .message-media { color: rgba(255,255,255,0.9); }
    .recalled { color: #999; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${t.title}</h1>
    <p>${t.exportTime}: ${formatTimestamp(data.exportedAt, language)}</p>
    <p>${t.participants}: ${data.participants.map(p => p.username).join(', ')}</p>
  </div>
  <div class="messages">
`;

  let currentDate = '';
  const selfId = data.participants[0]?.userId;

  data.messages.forEach((msg) => {
    const msgDate = new Date(msg.timestamp).toLocaleDateString(
      language === 'zh' ? 'zh-CN' : 'en-US'
    );

    if (msgDate !== currentDate) {
      currentDate = msgDate;
      html += `<div class="date-divider">${msgDate}</div>`;
    }

    const time = new Date(msg.timestamp).toLocaleTimeString(
      language === 'zh' ? 'zh-CN' : 'en-US',
      { hour: '2-digit', minute: '2-digit' }
    );

    const isSelf = msg.senderId === selfId;
    const messageClass = isSelf ? 'message self' : 'message';

    html += `
    <div class="${messageClass}">
      <div class="message-content">
        <div class="message-sender">${msg.senderName}</div>
        <div class="message-text">`;

    if (msg.isRecalled) {
      html += `<span class="recalled">${t.recalled}</span>`;
    } else if (msg.messageType === 'text') {
      html += msg.content || '';
    } else {
      const typeLabel = getMessageTypeLabel(msg.messageType, language);
      html += `<span class="message-media">[${typeLabel}]</span>`;
    }

    html += `</div>
        <div class="message-time">${time}</div>
      </div>
    </div>
    `;
  });

  html += `
  </div>
</body>
</html>
`;

  return html;
}

/**
 * 下载文件
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 导出聊天记录
 */
export async function exportChat(
  data: ChatExportData,
  options: ExportOptions,
  language: 'zh' | 'en' = 'zh'
): Promise<void> {
  let content: string;
  let filename: string;
  let mimeType: string;

  const timestamp = new Date().toISOString().slice(0, 10);

  switch (options.format) {
    case 'json':
      content = exportToJson(data);
      filename = `chat_export_${timestamp}.json`;
      mimeType = 'application/json';
      break;
    case 'html':
      content = exportToHtml(data, language);
      filename = `chat_export_${timestamp}.html`;
      mimeType = 'text/html';
      break;
    case 'txt':
    default:
      content = exportToTxt(data, language);
      filename = `chat_export_${timestamp}.txt`;
      mimeType = 'text/plain';
      break;
  }

  downloadFile(content, filename, mimeType);
}

export default {
  exportChat,
  exportToTxt,
  exportToJson,
  exportToHtml,
  convertMessagesToExport,
  downloadFile,
};

