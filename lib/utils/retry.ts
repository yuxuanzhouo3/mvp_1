export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  totalTime: number;
}

// 错误分类
export function isTransientError(error: any): boolean {
  if (!error) return false;

  const transientErrorCodes = [
    'PGRST301', // Connection timeout
    'PGRST302', // Connection refused
    'PGRST303', // Network error
    'PGRST304', // Server error
    'PGRST305', // Service unavailable
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND'
  ];

  const transientErrorMessages = [
    'timeout',
    'connection',
    'network',
    'temporary',
    'retry',
    'rate limit',
    'too many requests',
    'service unavailable',
    'internal server error'
  ];

  // 检查错误代码
  if (error.code && transientErrorCodes.includes(error.code)) {
    return true;
  }

  // 检查错误消息
  if (error.message) {
    const lowerMessage = error.message.toLowerCase();
    return transientErrorMessages.some(msg => lowerMessage.includes(msg));
  }

  // 检查 HTTP 状态码
  if (error.status) {
    return [408, 429, 500, 502, 503, 504].includes(error.status);
  }

  return false;
}

// 指数退避算法
export function exponentialBackoff(
  attempt: number, 
  baseDelay: number = 1000, 
  maxDelay: number = 30000,
  backoffMultiplier: number = 2
): number {
  const delay = Math.min(
    baseDelay * Math.pow(backoffMultiplier, attempt - 1),
    maxDelay
  );
  
  // 添加随机抖动以避免惊群效应
  const jitter = delay * 0.1 * Math.random();
  
  return delay + jitter;
}

// 智能重试函数
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    jitter = true
  } = options;

  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const result = await fn();
      const totalTime = Date.now() - startTime;
      
      return {
        result,
        attempts: attempt,
        totalTime
      };
    } catch (error) {
      lastError = error as Error;
      
      // 如果不是临时错误，直接抛出
      if (!isTransientError(error)) {
        throw error;
      }

      // 如果已经达到最大重试次数，抛出错误
      if (attempt > maxRetries) {
        break;
      }

      // 计算延迟时间
      const delay = jitter 
        ? exponentialBackoff(attempt, baseDelay, maxDelay, backoffMultiplier)
        : baseDelay * Math.pow(backoffMultiplier, attempt - 1);

      console.log(`⚠️  Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  const totalTime = Date.now() - startTime;
  throw new Error(
    `Operation failed after ${maxRetries + 1} attempts (${totalTime}ms): ${lastError?.message}`
  );
}

// 带超时的重试函数
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  timeout: number = 30000,
  retryOptions: RetryOptions = {}
): Promise<RetryResult<T>> {
  return withRetry(
    () => Promise.race([
      fn(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      )
    ]),
    retryOptions
  );
}

// 批量重试函数
export async function withBatchRetry<T>(
  items: T[],
  processor: (item: T) => Promise<any>,
  options: RetryOptions & { 
    concurrency?: number;
    stopOnError?: boolean;
  } = {}
): Promise<{ results: any[]; errors: Array<{ item: T; error: Error }> }> {
  const {
    concurrency = 5,
    stopOnError = false,
    ...retryOptions
  } = options;

  const results: any[] = [];
  const errors: Array<{ item: T; error: Error }> = [];

  // 分批处理
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (item) => {
      try {
        const result = await withRetry(() => processor(item), retryOptions);
        return { success: true, item, result: result.result };
      } catch (error) {
        if (stopOnError) {
          throw error;
        }
        return { success: false, item, error: error as Error };
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          results.push(result.value.result);
        } else {
          errors.push({ item: result.value.item, error: result.value.error || new Error('Unknown error') });
        }
      } else {
        throw result.reason;
      }
    });
  }

  return { results, errors };
}

// 条件重试函数
export async function withConditionalRetry<T>(
  fn: () => Promise<T>,
  condition: (result: T) => boolean,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  return withRetry(async () => {
    const result = await fn();
    if (!condition(result)) {
      throw new Error('Condition not met');
    }
    return result;
  }, options);
}

// 工具函数
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 重试装饰器（用于类方法）
export function Retryable(options: RetryOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withRetry(() => method.apply(this, args), options);
    };
  };
} 