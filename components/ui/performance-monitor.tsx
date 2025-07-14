'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Activity, Clock, Zap, AlertTriangle } from 'lucide-react';

interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
}

interface PerformanceMonitorProps {
  showDetails?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export function PerformanceMonitor({ 
  showDetails = false, 
  onMetricsUpdate 
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(showDetails);
  const observerRef = useRef<PerformanceObserver | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const getPerformanceMetrics = (): PerformanceMetrics => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      const firstPaint = paint.find(entry => entry.name === 'first-paint');
      const firstContentfulPaint = paint.find(entry => entry.name === 'first-contentful-paint');
      
      return {
        pageLoadTime: navigation.loadEventEnd - navigation.loadEventStart,
        firstContentfulPaint: firstContentfulPaint?.startTime || 0,
        largestContentfulPaint: 0, // 将通过 PerformanceObserver 获取
        cumulativeLayoutShift: 0, // 将通过 PerformanceObserver 获取
        firstInputDelay: 0, // 将通过 PerformanceObserver 获取
        timeToInteractive: navigation.domInteractive - navigation.fetchStart
      };
    };

    const updateMetrics = (newMetrics: Partial<PerformanceMetrics>) => {
      setMetrics(prev => {
        const updated = { ...prev, ...newMetrics } as PerformanceMetrics;
        onMetricsUpdate?.(updated);
        return updated;
      });
    };

    // 初始化指标
    const initialMetrics = getPerformanceMetrics();
    setMetrics(initialMetrics);
    onMetricsUpdate?.(initialMetrics);

    // 监听 LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        observerRef.current = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          updateMetrics({ largestContentfulPaint: lastEntry.startTime });
        });
        observerRef.current.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }

    // 监听 CLS (Cumulative Layout Shift)
    if ('PerformanceObserver' in window) {
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let cls = 0;
          for (const entry of list.getEntries()) {
            const layoutShiftEntry = entry as any;
            if (!layoutShiftEntry.hadRecentInput) {
              cls += layoutShiftEntry.value;
            }
          }
          updateMetrics({ cumulativeLayoutShift: cls });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS PerformanceObserver not supported:', error);
      }
    }

    // 监听 FID (First Input Delay)
    if ('PerformanceObserver' in window) {
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const firstInput = entries[0] as any;
          if (firstInput) {
            updateMetrics({ firstInputDelay: firstInput.processingStart - firstInput.startTime });
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('FID PerformanceObserver not supported:', error);
      }
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [onMetricsUpdate]);

  const getPerformanceScore = (metrics: PerformanceMetrics): number => {
    let score = 100;
    
    // LCP 评分 (权重 25%)
    if (metrics.largestContentfulPaint > 2500) score -= 25;
    else if (metrics.largestContentfulPaint > 4000) score -= 50;
    
    // FID 评分 (权重 25%)
    if (metrics.firstInputDelay > 100) score -= 25;
    else if (metrics.firstInputDelay > 300) score -= 50;
    
    // CLS 评分 (权重 25%)
    if (metrics.cumulativeLayoutShift > 0.1) score -= 25;
    else if (metrics.cumulativeLayoutShift > 0.25) score -= 50;
    
    // TTI 评分 (权重 25%)
    if (metrics.timeToInteractive > 3800) score -= 25;
    else if (metrics.timeToInteractive > 7300) score -= 50;
    
    return Math.max(0, score);
  };

  const getPerformanceLevel = (score: number): 'excellent' | 'good' | 'needs-improvement' | 'poor' => {
    if (score >= 90) return 'excellent';
    if (score >= 50) return 'good';
    if (score >= 25) return 'needs-improvement';
    return 'poor';
  };

  const getPerformanceColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'needs-improvement': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!metrics) return null;

  const score = getPerformanceScore(metrics);
  const level = getPerformanceLevel(score);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg hover:shadow-xl transition-shadow"
          title="显示性能监控"
        >
          <Activity className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">性能监控</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge className={getPerformanceColor(level)}>
                {score}/100
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
            实时性能指标监控
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <Zap className="h-3 w-3 text-blue-500" />
              <span>LCP:</span>
              <span className="font-mono">
                {metrics.largestContentfulPaint > 0 
                  ? `${Math.round(metrics.largestContentfulPaint)}ms`
                  : 'N/A'
                }
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3 text-green-500" />
              <span>FID:</span>
              <span className="font-mono">
                {metrics.firstInputDelay > 0 
                  ? `${Math.round(metrics.firstInputDelay)}ms`
                  : 'N/A'
                }
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Activity className="h-3 w-3 text-purple-500" />
              <span>CLS:</span>
              <span className="font-mono">
                {metrics.cumulativeLayoutShift > 0 
                  ? metrics.cumulativeLayoutShift.toFixed(3)
                  : 'N/A'
                }
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3 text-orange-500" />
              <span>TTI:</span>
              <span className="font-mono">
                {Math.round(metrics.timeToInteractive)}ms
              </span>
            </div>
          </div>
          
          {level === 'poor' && (
            <div className="flex items-center space-x-2 p-2 bg-red-50 rounded text-xs text-red-700">
              <AlertTriangle className="h-3 w-3" />
              <span>性能需要优化</span>
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            最后更新: {new Date().toLocaleTimeString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 性能监控 Hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const startMonitoring = () => {
    setIsMonitoring(true);
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
  };

  const resetMetrics = () => {
    setMetrics(null);
  };

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetMetrics,
    PerformanceMonitor: () => (
      <PerformanceMonitor 
        showDetails={isMonitoring}
        onMetricsUpdate={setMetrics}
      />
    )
  };
} 