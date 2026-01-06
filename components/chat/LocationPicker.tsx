'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
}

interface LocationPickerProps {
  onSelect: (location: Location) => void;
  onCancel: () => void;
  language?: 'zh' | 'en';
  className?: string;
}

/**
 * 位置选择器组件
 * 获取用户当前位置或手动输入地址
 */
export function LocationPicker({
  onSelect,
  onCancel,
  language = 'zh',
  className = '',
}: LocationPickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const t = {
    zh: {
      title: '发送位置',
      currentLocation: '当前位置',
      searchPlaceholder: '搜索地点...',
      gettingLocation: '获取位置中...',
      locationError: '无法获取位置',
      permissionDenied: '位置权限被拒绝',
      noResults: '未找到结果',
      send: '发送',
      cancel: '取消',
      searching: '搜索中...',
    },
    en: {
      title: 'Send Location',
      currentLocation: 'Current Location',
      searchPlaceholder: 'Search places...',
      gettingLocation: 'Getting location...',
      locationError: 'Unable to get location',
      permissionDenied: 'Location permission denied',
      noResults: 'No results found',
      send: 'Send',
      cancel: 'Cancel',
      searching: 'Searching...',
    },
  }[language];

  // 获取当前位置
  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError(t.locationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const location: Location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      // 尝试获取地址（反向地理编码）
      try {
        const address = await reverseGeocode(location.latitude, location.longitude);
        location.address = address;
      } catch {
        // 地址获取失败不影响位置发送
      }

      setCurrentLocation(location);
    } catch (err) {
      const geoError = err as GeolocationPositionError;
      if (geoError.code === GeolocationPositionError.PERMISSION_DENIED) {
        setError(t.permissionDenied);
      } else {
        setError(t.locationError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // 反向地理编码（使用 OpenStreetMap Nominatim API）
  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': language,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    return data.display_name || '';
  };

  // 搜索地点（使用 OpenStreetMap Nominatim API）
  const searchPlaces = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            'Accept-Language': language,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      const results: Location[] = data.map((item: { lat: string; lon: string; display_name: string; name?: string }) => ({
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        address: item.display_name,
        name: item.name || item.display_name.split(',')[0],
      }));

      setSearchResults(results);
    } catch (err) {
      console.error('搜索失败:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      searchPlaces(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 初始获取当前位置
  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  // 选择位置
  const handleSelect = (location: Location) => {
    onSelect(location);
  };

  // 生成静态地图 URL（使用 OpenStreetMap）
  const getStaticMapUrl = (lat: number, lon: number): string => {
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=15&size=200x150&maptype=osmarenderer&markers=${lat},${lon},red-pushpin`;
  };

  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden',
      'w-80 max-h-[400px]',
      className
    )}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
          <MapPin className="w-4 h-4 mr-2 text-blue-500" />
          {t.title}
        </h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 搜索框 */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-h-[280px] overflow-y-auto">
        {/* 错误提示 */}
        {error && (
          <div className="p-4 text-center text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* 当前位置 */}
        {!searchQuery && currentLocation && (
          <div
            className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700"
            onClick={() => handleSelect(currentLocation)}
          >
            <div className="flex items-start space-x-3">
              {/* 地图预览 */}
              <div className="w-16 h-12 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                <img
                  src={getStaticMapUrl(currentLocation.latitude, currentLocation.longitude)}
                  alt="Map"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center text-sm font-medium text-gray-900 dark:text-white">
                  <Navigation className="w-4 h-4 mr-1 text-blue-500" />
                  {t.currentLocation}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                  {currentLocation.address || `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 加载中 */}
        {isLoading && !currentLocation && (
          <div className="p-4 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">{t.gettingLocation}</p>
          </div>
        )}

        {/* 搜索结果 */}
        {searchQuery && searchResults.length > 0 && (
          <div>
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700"
                onClick={() => handleSelect(result)}
              >
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {result.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {result.address}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 无搜索结果 */}
        {searchQuery && !isSearching && searchResults.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">
            {t.noResults}
          </div>
        )}
      </div>
    </div>
  );
}

export default LocationPicker;

