'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Progress } from './progress';
import { Activity, Wifi, WifiOff, Battery, BatteryCharging, Cpu, Memory, HardDrive } from 'lucide-react';

interface SystemMetrics {
  online: boolean;
  batteryLevel: number;
  batteryCharging: boolean;
  memoryUsage: number;
  cpuUsage: number;
  networkSpeed: number;
  uptime: number;
}

interface SystemMonitorProps {
  showDetails?: boolean;
  onMetricsUpdate?: (metrics: SystemMetrics) => void;
}

export function SystemMonitor({ 
  showDetails = false, 
  onMetricsUpdate 
}: SystemMonitorProps) {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    online: navigator.onLine,
    batteryLevel: 100,
    batteryCharging: false,
    memoryUsage: 0,
    cpuUsage: 0,
    networkSpeed: 0,
    uptime: 0
  });
  const [isVisible, setIsVisible] = useState(showDetails);

  useEffect(() => {
    const updateMetrics = (newMetrics: Partial<SystemMetrics>) => {
      setMetrics(prev => {
        const updated = { ...prev, ...newMetrics };
        onMetricsUpdate?.(updated);
        return updated;
      });
    };

    // 监听在线状态
    const handleOnline = () => updateMetrics({ online: true });
    const handleOffline = () => updateMetrics({ online: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 获取电池信息
    const getBatteryInfo = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          updateMetrics({
            batteryLevel: battery.level * 100,
            batteryCharging: battery.charging
          });

          battery.addEventListener('levelchange', () => {
            updateMetrics({ batteryLevel: battery.level * 100 });
          });

          battery.addEventListener('chargingchange', () => {
            updateMetrics({ batteryCharging: battery.charging });
          });
        } catch (error) {
          console.warn('Battery API not supported:', error);
        }
      }
    };

    // 获取内存使用情况
    const getMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
        updateMetrics({ memoryUsage });
      }
    };

    // 模拟 CPU 使用率 (实际应用中需要更复杂的实现)
    const getCpuUsage = () => {
      // 这里可以集成真实的 CPU 监控
      const mockCpuUsage = Math.random() * 30 + 10; // 10-40%
      updateMetrics({ cpuUsage: mockCpuUsage });
    };

    // 获取网络速度
    const getNetworkSpeed = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection.effectiveType) {
          const speeds = {
            'slow-2g': 0.5,
            '2g': 1,
            '3g': 3,
            '4g': 10
          };
          updateMetrics({ networkSpeed: speeds[connection.effectiveType] || 0 });
        }
      }
    };

    // 更新运行时间
    const updateUptime = () => {
      updateMetrics({ uptime: performance.now() });
    };

    // 初始化
    getBatteryInfo();
    getMemoryInfo();
    getCpuUsage();
    getNetworkSpeed();
    updateUptime();

    // 定期更新
    const interval = setInterval(() => {
      getMemoryInfo();
      getCpuUsage();
      updateUptime();
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [onMetricsUpdate]);

  const getStatusColor = (value: number, thresholds: { good: number; warning: number; critical: number }) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (online: boolean) => {
    return online ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />;
  };

  if (!isVisible) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg hover:shadow-xl transition-shadow"
          title="显示系统监控"
        >
          <Activity className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      <Card className="shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">系统监控</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant={metrics.online ? "default" : "destructive"}>
                {metrics.online ? "在线" : "离线"}
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
            实时系统状态监控
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 网络状态 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(metrics.online)}
              <span className="text-sm">网络状态</span>
            </div>
            <span className="text-sm font-mono">
              {metrics.networkSpeed > 0 ? `${metrics.networkSpeed} Mbps` : 'N/A'}
            </span>
          </div>

          {/* 电池状态 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {metrics.batteryCharging ? (
                <BatteryCharging className="h-4 w-4 text-green-500" />
              ) : (
                <Battery className={`h-4 w-4 ${getStatusColor(metrics.batteryLevel, { good: 50, warning: 20, critical: 10 })}`} />
              )}
              <span className="text-sm">电池</span>
            </div>
            <span className="text-sm font-mono">
              {Math.round(metrics.batteryLevel)}%
            </span>
          </div>

          {/* 内存使用 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Memory className="h-4 w-4 text-blue-500" />
                <span className="text-sm">内存使用</span>
              </div>
              <span className={`text-sm font-mono ${getStatusColor(metrics.memoryUsage, { good: 70, warning: 85, critical: 95 })}`}>
                {Math.round(metrics.memoryUsage)}%
              </span>
            </div>
            <Progress 
              value={metrics.memoryUsage} 
              className="h-2"
            />
          </div>

          {/* CPU 使用 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-purple-500" />
                <span className="text-sm">CPU 使用</span>
              </div>
              <span className={`text-sm font-mono ${getStatusColor(metrics.cpuUsage, { good: 50, warning: 80, critical: 90 })}`}>
                {Math.round(metrics.cpuUsage)}%
              </span>
            </div>
            <Progress 
              value={metrics.cpuUsage} 
              className="h-2"
            />
          </div>

          {/* 运行时间 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>运行时间</span>
            <span className="font-mono">
              {Math.floor(metrics.uptime / 1000 / 60)} 分钟
            </span>
          </div>

          <div className="text-xs text-gray-500">
            最后更新: {new Date().toLocaleTimeString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 系统监控 Hook
export function useSystemMonitor() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const startMonitoring = () => {
    setIsMonitoring(true);
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
  };

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    SystemMonitor: () => (
      <SystemMonitor 
        showDetails={isMonitoring}
        onMetricsUpdate={setMetrics}
      />
    )
  };
} 