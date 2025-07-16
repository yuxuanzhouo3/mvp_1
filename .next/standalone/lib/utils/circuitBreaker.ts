export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeout: number;
  expectedResponseTime: number;
  monitoringWindow?: number;
  halfOpenMaxAttempts?: number;
}

export interface CircuitBreakerStatus {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
  totalRequests: number;
  errorRate: number;
  halfOpenAttempts: number;
  consecutiveSuccesses: number;
}

export interface CircuitBreakerMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  circuitOpens: number;
  circuitCloses: number;
  averageResponseTime: number;
  lastExecutionTime?: Date;
}

export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttemptTime?: Date;
  private totalRequests = 0;
  private halfOpenAttempts = 0;
  private consecutiveSuccesses = 0;
  private options: CircuitBreakerOptions;
  private metrics: CircuitBreakerMetrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    circuitOpens: 0,
    circuitCloses: 0,
    averageResponseTime: 0
  };
  private responseTimes: number[] = [];

  constructor(options: CircuitBreakerOptions) {
    this.options = {
      monitoringWindow: 60000, // 1 minute default
      halfOpenMaxAttempts: 3,
      ...options
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;
    this.metrics.totalExecutions++;

    // 检查断路器状态
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new ServiceUnavailableError(
          `Circuit breaker is open. Next attempt at ${this.nextAttemptTime?.toISOString()}`
        );
      }
    }

    try {
      const startTime = Date.now();
      const result = await Promise.race([
        fn(),
        this.createTimeoutPromise()
      ]);
      
      const responseTime = Date.now() - startTime;
      this.recordResponseTime(responseTime);
      
      // 检查响应时间
      if (responseTime > this.options.expectedResponseTime) {
        this.recordFailure(new Error(`Response time ${responseTime}ms exceeded threshold ${this.options.expectedResponseTime}ms`));
        throw new Error('Response time exceeded threshold');
      }

      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error as Error);
      throw error;
    }
  }

  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timeout after ${this.options.expectedResponseTime}ms`));
      }, this.options.expectedResponseTime);
    });
  }

  private recordSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = new Date();
    this.consecutiveSuccesses++;
    this.metrics.successfulExecutions++;
    this.metrics.lastExecutionTime = new Date();

    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
      
      // 如果半开状态下连续成功次数达到阈值，关闭断路器
      if (this.consecutiveSuccesses >= this.options.halfOpenMaxAttempts!) {
        this.transitionToClosed();
      }
    } else if (this.state === 'closed') {
      // 在关闭状态下，重置失败计数
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  private recordFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    this.consecutiveSuccesses = 0;
    this.metrics.failedExecutions++;
    this.metrics.lastExecutionTime = new Date();

    if (this.state === 'closed' && this.failureCount >= this.options.failureThreshold) {
      this.transitionToOpen();
    } else if (this.state === 'half-open') {
      this.transitionToOpen();
    }
  }

  private transitionToOpen(): void {
    this.state = 'open';
    this.nextAttemptTime = new Date(Date.now() + this.options.recoveryTimeout);
    this.halfOpenAttempts = 0;
    this.metrics.circuitOpens++;
    
    console.warn(`🔴 Circuit breaker opened. Next attempt at ${this.nextAttemptTime.toISOString()}`);
  }

  private transitionToHalfOpen(): void {
    this.state = 'half-open';
    this.halfOpenAttempts = 0;
    this.consecutiveSuccesses = 0;
    console.log('🟡 Circuit breaker half-open - testing connection');
  }

  private transitionToClosed(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.halfOpenAttempts = 0;
    this.consecutiveSuccesses = 0;
    this.metrics.circuitCloses++;
    console.log('🟢 Circuit breaker closed - connection restored');
  }

  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) return false;
    return Date.now() >= this.nextAttemptTime.getTime();
  }

  private recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    
    // 保持最近100个响应时间
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100);
    }
    
    // 更新平均响应时间
    this.metrics.averageResponseTime = this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  getStatus(): CircuitBreakerStatus {
    const errorRate = this.totalRequests > 0 ? this.failureCount / this.totalRequests : 0;
    
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
      totalRequests: this.totalRequests,
      errorRate,
      halfOpenAttempts: this.halfOpenAttempts,
      consecutiveSuccesses: this.consecutiveSuccesses
    };
  }

  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.nextAttemptTime = undefined;
    this.totalRequests = 0;
    this.halfOpenAttempts = 0;
    this.consecutiveSuccesses = 0;
    this.responseTimes = [];
    
    console.log('🔄 Circuit breaker manually reset');
  }

  forceOpen(): void {
    this.transitionToOpen();
  }

  forceClose(): void {
    this.transitionToClosed();
  }

  // 获取断路器配置
  getConfig(): CircuitBreakerOptions {
    return { ...this.options };
  }

  // 更新断路器配置
  updateConfig(newOptions: Partial<CircuitBreakerOptions>): void {
    this.options = { ...this.options, ...newOptions };
    console.log('⚙️  Circuit breaker configuration updated');
  }
}

// 自定义错误类
export class ServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

// 断路器管理器
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private defaultOptions: CircuitBreakerOptions;
  private metrics: Map<string, CircuitBreakerMetrics> = new Map();

  constructor(defaultOptions: CircuitBreakerOptions) {
    this.defaultOptions = defaultOptions;
  }

  getBreaker(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breakerOptions = { ...this.defaultOptions, ...options };
      this.breakers.set(name, new CircuitBreaker(breakerOptions));
    }
    return this.breakers.get(name)!;
  }

  getStatus(): Record<string, CircuitBreakerStatus> {
    const status: Record<string, CircuitBreakerStatus> = {};
    this.breakers.forEach((breaker, name) => {
      status[name] = breaker.getStatus();
    });
    return status;
  }

  getMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    this.breakers.forEach((breaker, name) => {
      metrics[name] = breaker.getMetrics();
    });
    return metrics;
  }

  resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }

  forceOpenAll(): void {
    this.breakers.forEach(breaker => breaker.forceOpen());
  }

  forceCloseAll(): void {
    this.breakers.forEach(breaker => breaker.forceClose());
  }

  // 获取所有断路器的聚合状态
  getAggregateStatus(): {
    totalBreakers: number;
    openBreakers: number;
    halfOpenBreakers: number;
    closedBreakers: number;
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const statuses = this.getStatus();
    const totalBreakers = Object.keys(statuses).length;
    const openBreakers = Object.values(statuses).filter(s => s.state === 'open').length;
    const halfOpenBreakers = Object.values(statuses).filter(s => s.state === 'half-open').length;
    const closedBreakers = Object.values(statuses).filter(s => s.state === 'closed').length;

    let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (openBreakers > 0) {
      overallHealth = openBreakers > totalBreakers * 0.5 ? 'unhealthy' : 'degraded';
    } else if (halfOpenBreakers > 0) {
      overallHealth = 'degraded';
    }

    return {
      totalBreakers,
      openBreakers,
      halfOpenBreakers,
      closedBreakers,
      overallHealth
    };
  }
}

// 全局断路器管理器实例
export const circuitBreakerManager = new CircuitBreakerManager({
  failureThreshold: 5,
  recoveryTimeout: 60000,
  expectedResponseTime: 5000,
  halfOpenMaxAttempts: 3
}); 