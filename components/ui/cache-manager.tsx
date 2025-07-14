'use client';

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Trash2, RefreshCw, Database, HardDrive, Settings } from 'lucide-react';

interface CacheInfo {
  name: string;
  size: number;
  lastModified: Date;
  type: 'localStorage' | 'sessionStorage' | 'indexedDB' | 'cache';
}

interface CacheManagerProps {
  showDetails?: boolean;
  onCacheUpdate?: (caches: CacheInfo[]) => void;
}

export function CacheManager({ 
  showDetails = false, 
  onCacheUpdate 
}: CacheManagerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cacheList, setCacheList] = useState<CacheInfo[]>([]);

  const getStorageSize = (storage: Storage): number => {
    let size = 0;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) {
        size += key.length + storage.getItem(key)!.length;
      }
    }
    return size;
  };

  const getCacheInfo = async (): Promise<CacheInfo[]> => {
    const cacheList: CacheInfo[] = [];

    // LocalStorage
    try {
      const localStorageSize = getStorageSize(localStorage);
      cacheList.push({
        name: 'Local Storage',
        size: localStorageSize,
        lastModified: new Date(),
        type: 'localStorage'
      });
    } catch (error) {
      console.warn('Failed to get localStorage info:', error);
    }

    // SessionStorage
    try {
      const sessionStorageSize = getStorageSize(sessionStorage);
      cacheList.push({
        name: 'Session Storage',
        size: sessionStorageSize,
        lastModified: new Date(),
        type: 'sessionStorage'
      });
    } catch (error) {
      console.warn('Failed to get sessionStorage info:', error);
    }

    // Service Worker Cache
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        const cacheNamesArray = Array.from(cacheNames);
        for (const cacheName of cacheNamesArray) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          const keysArray = Array.from(keys);
          let totalSize = 0;
          
          for (const request of keysArray) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              totalSize += blob.size;
            }
          }

          cacheList.push({
            name: `Cache: ${cacheName}`,
            size: totalSize,
            lastModified: new Date(),
            type: 'cache'
          });
        }
      } catch (error) {
        console.warn('Failed to get cache info:', error);
      }
    }

    // IndexedDB (简化版本)
    if ('indexedDB' in window) {
      try {
        cacheList.push({
          name: 'IndexedDB',
          size: 0, // 需要更复杂的实现来获取实际大小
          lastModified: new Date(),
          type: 'indexedDB'
        });
      } catch (error) {
        console.warn('Failed to get IndexedDB info:', error);
      }
    }

    return cacheList;
  };

  const refreshCacheInfo = async () => {
    setIsLoading(true);
    try {
      const cacheInfo = await getCacheInfo();
      setCacheList(cacheInfo);
      onCacheUpdate?.(cacheInfo);
    } catch (error) {
      console.error('Failed to refresh cache info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = async (cacheType: string) => {
    setIsLoading(true);
    try {
      switch (cacheType) {
        case 'localStorage':
          localStorage.clear();
          break;
        case 'sessionStorage':
          sessionStorage.clear();
          break;
        case 'cache':
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            const cacheNamesArray = Array.from(cacheNames);
            await Promise.all(cacheNamesArray.map((name: string) => caches.delete(name)));
          }
          break;
        case 'indexedDB':
          // 简化版本，实际需要更复杂的实现
          console.log('IndexedDB clear not implemented');
          break;
      }
      await refreshCacheInfo();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllCaches = async () => {
    if (confirm('确定要清除所有缓存吗？这可能会影响应用程序的性能。')) {
      setIsLoading(true);
      try {
        // 清除所有类型的缓存
        localStorage.clear();
        sessionStorage.clear();
        
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          const cacheNamesArray = Array.from(cacheNames);
          await Promise.all(cacheNamesArray.map((name: string) => caches.delete(name)));
        }

        await refreshCacheInfo();
      } catch (error) {
        console.error('Failed to clear all caches:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    refreshCacheInfo();
  }, []);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg hover:shadow-xl transition-shadow"
          title="显示缓存管理"
        >
          <Database className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    );
  }

  const totalSize = cacheList.reduce((sum, cache) => sum + cache.size, 0);

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80">
      <Card className="shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">缓存管理</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {formatBytes(totalSize)}
              </Badge>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
          <CardDescription className="text-xs">
            管理应用程序缓存和存储
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {cacheList.map((cache, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium">{cache.name}</div>
                    <div className="text-xs text-gray-500">
                      {formatBytes(cache.size)} • {cache.lastModified.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => clearCache(cache.type)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={refreshCacheInfo}
              disabled={isLoading}
              className="flex-1"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={clearAllCaches}
              disabled={isLoading}
              className="flex-1"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              清除全部
            </Button>
          </div>

          <div className="text-xs text-gray-500">
            最后更新: {new Date().toLocaleTimeString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 缓存管理 Hook
export function useCacheManager() {
  const [caches, setCaches] = useState<CacheInfo[]>([]);
  const [isManaging, setIsManaging] = useState(false);

  const startManaging = () => {
    setIsManaging(true);
  };

  const stopManaging = () => {
    setIsManaging(false);
  };

  return {
    caches,
    isManaging,
    startManaging,
    stopManaging,
    CacheManager: () => (
      <CacheManager 
        showDetails={isManaging}
        onCacheUpdate={setCaches}
      />
    )
  };
} 