'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced update function to prevent excessive re-renders
  const debouncedUpdate = useCallback((newMetrics: Partial<PerformanceMetrics>) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      setMetrics(prev => {
        const updated = { ...prev, ...newMetrics } as PerformanceMetrics;
        onMetricsUpdate?.(updated);
        return updated;
      });
    }, 100); // 100ms debounce
  }, [onMetricsUpdate]);

  // Memoize performance calculation to avoid recalculation
  const getPerformanceMetrics = useCallback((): PerformanceMetrics => {
    if (typeof window === 'undefined') {
      return {
        pageLoadTime: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        firstInputDelay: 0,
        timeToInteractive: 0
      };
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    const firstPaint = paint.find(entry => entry.name === 'first-paint');
    const firstContentfulPaint = paint.find(entry => entry.name === 'first-contentful-paint');
    
    return {
      pageLoadTime: navigation.loadEventEnd - navigation.loadEventStart,
      firstContentfulPaint: firstContentfulPaint?.startTime || 0,
      largestContentfulPaint: 0, // Will be updated by PerformanceObserver
      cumulativeLayoutShift: 0, // Will be updated by PerformanceObserver
      firstInputDelay: 0, // Will be updated by PerformanceObserver
      timeToInteractive: navigation.domInteractive - navigation.fetchStart
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize metrics once
    const initialMetrics = getPerformanceMetrics();
    setMetrics(initialMetrics);
    onMetricsUpdate?.(initialMetrics);

    // Set up performance observers only if they're supported
    if ('PerformanceObserver' in window) {
      try {
        // LCP Observer
        observerRef.current = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          debouncedUpdate({ largestContentfulPaint: lastEntry.startTime });
        });
        observerRef.current.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }

      // CLS Observer
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let cls = 0;
          for (const entry of list.getEntries()) {
            const layoutShiftEntry = entry as any;
            if (!layoutShiftEntry.hadRecentInput) {
              cls += layoutShiftEntry.value;
            }
          }
          debouncedUpdate({ cumulativeLayoutShift: cls });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS PerformanceObserver not supported:', error);
      }

      // FID Observer
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const firstInput = entries[0] as any;
          if (firstInput) {
            debouncedUpdate({ firstInputDelay: firstInput.processingStart - firstInput.startTime });
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
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [getPerformanceMetrics, debouncedUpdate, onMetricsUpdate]);

  // Memoize performance score calculation
  const performanceScore = useMemo(() => {
    if (!metrics) return 0;
    
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
  }, [metrics]);

  // Memoize performance level
  const performanceLevel = useMemo(() => {
    if (performanceScore >= 90) return 'excellent';
    if (performanceScore >= 50) return 'good';
    if (performanceScore >= 25) return 'needs-improvement';
    return 'poor';
  }, [performanceScore]);

  // Memoize performance color
  const performanceColor = useMemo(() => {
    switch (performanceLevel) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'needs-improvement': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, [performanceLevel]);

  if (!metrics) return null;

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
              <Badge className={performanceColor}>
                {performanceScore}/100
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
          
          {performanceLevel === 'poor' && (
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