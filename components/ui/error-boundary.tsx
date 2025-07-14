'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // 这里可以发送错误到监控服务
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                出现了一些问题
              </CardTitle>
              <CardDescription className="text-gray-600">
                抱歉，应用程序遇到了一个错误。请尝试刷新页面或返回首页。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="rounded-lg bg-gray-100 p-4 text-sm">
                  <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                    错误详情 (仅开发环境)
                  </summary>
                  <div className="space-y-2">
                    <div>
                      <strong>错误信息:</strong>
                      <pre className="mt-1 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                        {this.state.error.message}
                      </pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>组件堆栈:</strong>
                        <pre className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
              
              <div className="flex flex-col space-y-2">
                <Button 
                  onClick={this.handleReset}
                  className="w-full"
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重试
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  className="w-full"
                >
                  <Home className="mr-2 h-4 w-4" />
                  返回首页
                </Button>
              </div>
              
              <div className="text-center text-xs text-gray-500">
                如果问题持续存在，请联系技术支持
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// 函数式错误边界 Hook
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    console.error('Error caught by useErrorHandler:', error);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}

// 异步错误边界组件
interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export function AsyncErrorBoundary({ 
  children, 
  fallback, 
  onError 
}: AsyncErrorBoundaryProps) {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      setError(event.reason);
      setHasError(true);
      onError?.(event.reason, { componentStack: '' });
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Unhandled error:', event.error);
      setError(event.error);
      setHasError(true);
      onError?.(event.error, { componentStack: '' });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [onError]);

  if (hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              应用程序错误
            </CardTitle>
            <CardDescription className="text-gray-600">
              发生了未处理的错误，请刷新页面重试。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新页面
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
} 