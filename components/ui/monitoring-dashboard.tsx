'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { PerformanceMonitor } from './performance-monitor';
import { CacheManager } from './cache-manager';
import { SystemMonitor } from './system-monitor';
import { ErrorBoundary } from './error-boundary';
import { Activity, Settings, X, Maximize2, Minimize2 } from 'lucide-react';

interface MonitoringDashboardProps {
  isVisible?: boolean;
  onToggle?: (visible: boolean) => void;
}

export function MonitoringDashboard({ 
  isVisible = false, 
  onToggle 
}: MonitoringDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMinimized, setIsMinimized] = useState(false);

  const handleToggle = () => {
    const newVisible = !isVisible;
    onToggle?.(newVisible);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleToggle}
          className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg hover:shadow-xl transition-shadow"
          title="显示监控面板"
        >
          <Activity className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-64 shadow-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">监控面板</CardTitle>
              <div className="flex items-center space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleMinimize}
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleToggle}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs text-gray-500">
              点击展开查看详细监控信息
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-4 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <Card className="w-full max-w-4xl h-full max-h-[80vh] shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <CardTitle>系统监控面板</CardTitle>
              <Badge variant="secondary">v1.0.0</Badge>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleMinimize}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggle}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            实时监控应用程序性能、系统状态和缓存管理
          </CardDescription>
        </CardHeader>
        
        <CardContent className="h-full overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">概览</TabsTrigger>
              <TabsTrigger value="performance">性能</TabsTrigger>
              <TabsTrigger value="system">系统</TabsTrigger>
              <TabsTrigger value="cache">缓存</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 h-full overflow-auto">
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">性能概览</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PerformanceMonitor showDetails={true} />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">系统状态</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SystemMonitor showDetails={true} />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">缓存状态</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CacheManager showDetails={true} />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">错误监控</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center text-gray-500">
                        <Activity className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">错误边界已激活</p>
                        <p className="text-xs">自动捕获和处理错误</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="performance" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>性能监控</CardTitle>
                    <CardDescription>
                      详细的性能指标和优化建议
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-full">
                    <PerformanceMonitor showDetails={true} />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="system" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>系统监控</CardTitle>
                    <CardDescription>
                      系统资源使用情况和网络状态
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-full">
                    <SystemMonitor showDetails={true} />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="cache" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>缓存管理</CardTitle>
                    <CardDescription>
                      管理应用程序缓存和存储
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-full">
                    <CacheManager showDetails={true} />
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// 监控面板 Hook
export function useMonitoringDashboard() {
  const [isVisible, setIsVisible] = useState(false);

  return {
    isVisible,
    setIsVisible,
    MonitoringDashboard: () => (
      <MonitoringDashboard 
        isVisible={isVisible}
        onToggle={setIsVisible}
      />
    )
  };
} 