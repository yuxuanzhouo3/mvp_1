'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  language?: 'zh' | 'en';
  placement?: 'top' | 'bottom' | 'inline';
}

const EMOJI_CATEGORIES = [
  {
    name: { zh: '常用', en: 'Frequently Used' },
    emojis: ['😀', '😂', '🥰', '😍', '🤩', '😘', '😋', '😊', '🥺', '😭', '😅', '🤔', '👍', '❤️', '🔥', '🎉']
  },
  {
    name: { zh: '表情', en: 'Faces' },
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥']
  },
  {
    name: { zh: '情感', en: 'Emotions' },
    emojis: ['😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬']
  },
  {
    name: { zh: '手势', en: 'Gestures' },
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪']
  },
  {
    name: { zh: '爱心', en: 'Hearts' },
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟']
  },
  {
    name: { zh: '动物', en: 'Animals' },
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄']
  },
  {
    name: { zh: '食物', en: 'Food' },
    emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🍜', '🍣', '🍦', '🎂', '🍩', '☕']
  },
  {
    name: { zh: '活动', en: 'Activities' },
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🥍', '🏏', '🪃', '🥊', '🎮', '🎲', '🎯', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎸', '🎹']
  },
  {
    name: { zh: '符号', en: 'Symbols' },
    emojis: ['✨', '⭐', '🌟', '💫', '🔥', '💥', '⚡', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌧️', '⛈️', '🌩️', '❄️', '💧', '🌊', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🏅', '💯', '✅', '❌', '❓', '❗', '💬', '💭']
  }
];

export function EmojiPicker({
  isOpen,
  onClose,
  onSelect,
  language = 'zh',
  placement = 'top',
}: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // ESC键关闭
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const placementClassName =
    placement === 'inline'
      ? 'w-full'
      : `absolute right-0 w-80 ${placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'}`;

  return (
    <div
      ref={pickerRef}
      className={`${placementClassName} max-h-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden`}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {language === 'zh' ? '选择表情' : 'Select Emoji'}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 分类标签 */}
      <div className="flex overflow-x-auto px-2 py-2 border-b border-gray-200 dark:border-gray-700 scrollbar-hide">
        {EMOJI_CATEGORIES.map((category, index) => (
          <button
            key={index}
            onClick={() => setActiveCategory(index)}
            className={`flex-shrink-0 px-3 py-1 text-xs rounded-full mr-1 transition-colors ${
              activeCategory === index
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {language === 'zh' ? category.name.zh : category.name.en}
          </button>
        ))}
      </div>

      {/* 表情网格 */}
      <div className="p-2 max-h-60 overflow-y-auto">
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, index) => (
            <button
              key={index}
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
              className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
