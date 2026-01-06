'use client';

import { MapPin, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationMessageProps {
  latitude: number;
  longitude: number;
  address?: string;
  thumbnailUrl?: string;
  isOwn?: boolean;
  className?: string;
}

/**
 * 位置消息组件
 * 显示位置消息卡片
 */
export function LocationMessage({
  latitude,
  longitude,
  address,
  thumbnailUrl,
  isOwn = false,
  className = '',
}: LocationMessageProps) {
  // 生成静态地图 URL（使用 OpenStreetMap）
  const staticMapUrl = thumbnailUrl || 
    `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=300x200&maptype=osmarenderer&markers=${latitude},${longitude},red-pushpin`;

  // 打开外部地图
  const openInMaps = () => {
    // 检测设备类型并打开对应的地图应用
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    let mapUrl: string;
    
    if (isMobile) {
      // 移动设备 - 使用通用的 geo: URL 或 Google Maps
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIOS) {
        // iOS - Apple Maps
        mapUrl = `https://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(address || 'Location')}`;
      } else {
        // Android - Google Maps
        mapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      }
    } else {
      // 桌面设备 - Google Maps
      mapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    }
    
    window.open(mapUrl, '_blank');
  };

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden cursor-pointer transition-opacity hover:opacity-90',
        'max-w-[240px]',
        className
      )}
      onClick={openInMaps}
    >
      {/* 地图预览 */}
      <div className="relative w-full aspect-[3/2] bg-gray-200">
        <img
          src={staticMapUrl}
          alt="Location map"
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* 位置标记叠加层 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <MapPin className="w-8 h-8 text-red-500 drop-shadow-lg" fill="currentColor" />
          </div>
        </div>
        
        {/* 打开地图按钮 */}
        <div className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow">
          <ExternalLink className="w-4 h-4 text-gray-700" />
        </div>
      </div>

      {/* 地址信息 */}
      <div className={cn(
        'p-2',
        isOwn ? 'bg-blue-500' : 'bg-white dark:bg-gray-800'
      )}>
        <div className="flex items-start space-x-2">
          <MapPin className={cn(
            'w-4 h-4 mt-0.5 flex-shrink-0',
            isOwn ? 'text-blue-200' : 'text-gray-400'
          )} />
          <div className="flex-1 min-w-0">
            {address ? (
              <p className={cn(
                'text-sm line-clamp-2',
                isOwn ? 'text-white' : 'text-gray-700 dark:text-gray-300'
              )}>
                {address}
              </p>
            ) : (
              <p className={cn(
                'text-sm',
                isOwn ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
              )}>
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LocationMessage;

