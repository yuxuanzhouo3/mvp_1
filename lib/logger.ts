/**
 * Logger Module - 日志记录模块
 * 用于评分系统的日志记录和监控
 */

// ========================================
// 类型定义
// ========================================

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  userId?: string;
  duration?: number;
}

export interface ScoringLogData {
  userId: string;
  algorithm?: string;
  totalScore?: number;
  scoreBreakdown?: Record<string, number>;
  calculationDuration?: number;
  error?: string;
}

// ========================================
// 配置
// ========================================

const LOG_CONFIG = {
  enabled: process.env.NODE_ENV !== 'test',
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  // 生产环境也输出日志，以便在云托管中查看
  consoleOutput: true,
  maxLogLength: 10000,
};

// 日志级别优先级
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3
};

// ========================================
// 日志缓冲区（用于批量发送）
// ========================================

let logBuffer: LogEntry[] = [];
const LOG_BUFFER_SIZE = 50;
const LOG_FLUSH_INTERVAL = 30000; // 30秒

// ========================================
// 核心日志函数
// ========================================

/**
 * 创建日志条目
 */
function createLogEntry(
  level: LogLevel,
  category: string,
  message: string,
  data?: Record<string, unknown>,
  userId?: string,
  duration?: number
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    data,
    userId,
    duration
  };
}

/**
 * 是否应该记录此级别的日志
 */
function shouldLog(level: LogLevel): boolean {
  if (!LOG_CONFIG.enabled) return false;
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[LOG_CONFIG.minLevel];
}

/**
 * 格式化日志输出
 */
function formatLogForConsole(entry: LogEntry): string {
  const levelColors: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: '\x1b[36m', // Cyan
    [LogLevel.INFO]: '\x1b[32m',  // Green
    [LogLevel.WARN]: '\x1b[33m',  // Yellow
    [LogLevel.ERROR]: '\x1b[31m'  // Red
  };
  
  const reset = '\x1b[0m';
  const color = levelColors[entry.level];
  
  let output = `${color}[${entry.level.toUpperCase()}]${reset} [${entry.category}] ${entry.message}`;
  
  if (entry.duration !== undefined) {
    output += ` (${entry.duration}ms)`;
  }
  
  if (entry.userId) {
    output += ` [user: ${entry.userId.slice(0, 8)}...]`;
  }
  
  return output;
}

/**
 * 写入日志
 */
function writeLog(entry: LogEntry): void {
  // 控制台输出
  if (LOG_CONFIG.consoleOutput) {
    const formatted = formatLogForConsole(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formatted, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(formatted, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(formatted, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(formatted, entry.data || '');
        break;
    }
  }
  
  // 添加到缓冲区
  logBuffer.push(entry);
  
  // 检查是否需要刷新
  if (logBuffer.length >= LOG_BUFFER_SIZE) {
    flushLogs();
  }
}

/**
 * 刷新日志缓冲区（发送到服务器）
 */
async function flushLogs(): Promise<void> {
  if (logBuffer.length === 0) return;
  
  const logsToFlush = [...logBuffer];
  logBuffer = [];
  
  // TODO: 发送到Supabase日志表或外部日志服务
  // 当前仅在开发环境打印
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Logger] Flushed ${logsToFlush.length} log entries`);
  }
}

// 定时刷新日志
if (typeof window !== 'undefined') {
  setInterval(flushLogs, LOG_FLUSH_INTERVAL);
}

// ========================================
// 公共API
// ========================================

/**
 * 通用日志函数
 */
export function log(
  level: LogLevel,
  category: string,
  message: string,
  data?: Record<string, unknown>,
  userId?: string
): void {
  if (!shouldLog(level)) return;
  
  const entry = createLogEntry(level, category, message, data, userId);
  writeLog(entry);
}

/**
 * Debug日志
 */
export function debug(category: string, message: string, data?: Record<string, unknown>): void {
  log(LogLevel.DEBUG, category, message, data);
}

/**
 * Info日志
 */
export function info(category: string, message: string, data?: Record<string, unknown>): void {
  log(LogLevel.INFO, category, message, data);
}

/**
 * 警告日志
 */
export function warn(category: string, message: string, data?: Record<string, unknown>): void {
  log(LogLevel.WARN, category, message, data);
}

/**
 * 错误日志
 */
export function error(category: string, message: string, data?: Record<string, unknown>): void {
  log(LogLevel.ERROR, category, message, data);
}

// ========================================
// 评分系统专用日志函数
// ========================================

/**
 * 记录评分计算开始
 */
export function logScoringStart(userId: string, algorithm: string): number {
  info('Scoring', `Starting score calculation`, { userId, algorithm });
  return Date.now();
}

/**
 * 记录评分计算完成
 */
export function logScoringComplete(
  userId: string,
  startTime: number,
  totalScore: number,
  scoreBreakdown: Record<string, number>
): void {
  const duration = Date.now() - startTime;
  
  // 检查异常分数
  if (totalScore < 0 || totalScore > 100) {
    warn('Scoring', `Abnormal total score detected`, {
      userId,
      totalScore,
      expected: '0-100'
    });
  }
  
  // 检查因子分数
  for (const [factor, score] of Object.entries(scoreBreakdown)) {
    if (score < 0 || score > 100) {
      warn('Scoring', `Abnormal factor score detected`, {
        userId,
        factor,
        score,
        expected: '0-100'
      });
    }
  }
  
  info('Scoring', `Score calculation completed`, {
    userId,
    totalScore,
    duration,
    factorCount: Object.keys(scoreBreakdown).length
  });
  
  // 记录计算耗时
  if (duration > 1000) {
    warn('Scoring', `Slow score calculation`, {
      userId,
      duration,
      threshold: 1000
    });
  }
}

/**
 * 记录评分计算错误
 */
export function logScoringError(
  userId: string,
  errorMessage: string,
  errorData?: Record<string, unknown>
): void {
  error('Scoring', `Score calculation failed`, {
    userId,
    error: errorMessage,
    ...errorData
  });
}

/**
 * 记录因子缺失情况
 */
export function logMissingFactors(
  userId: string,
  missingFactors: string[]
): void {
  if (missingFactors.length > 0) {
    info('Scoring', `Missing factors detected`, {
      userId,
      missingFactors,
      count: missingFactors.length
    });
  }
}

/**
 * 记录百分位计算
 */
export function logPercentileCalculation(
  userId: string,
  percentile: number,
  totalUsers: number
): void {
  debug('Percentile', `Percentile calculated`, {
    userId,
    percentile,
    totalUsers
  });
}

// ========================================
// 性能监控
// ========================================

/**
 * 创建性能计时器
 */
export function createTimer(label: string): () => number {
  const start = Date.now();
  
  return () => {
    const duration = Date.now() - start;
    debug('Performance', label, { duration });
    return duration;
  };
}

/**
 * 异步操作计时包装器
 */
export async function withTiming<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    debug('Performance', `${label} completed`, { duration });
    
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    
    error('Performance', `${label} failed`, {
      duration,
      error: err instanceof Error ? err.message : String(err)
    });
    
    throw err;
  }
}

// ========================================
// 导出Logger对象
// ========================================

export const logger = {
  debug,
  info,
  warn,
  error,
  log,
  
  // 评分专用
  scoring: {
    start: logScoringStart,
    complete: logScoringComplete,
    error: logScoringError,
    missingFactors: logMissingFactors,
    percentile: logPercentileCalculation
  },
  
  // 性能监控
  performance: {
    timer: createTimer,
    withTiming
  },
  
  // 工具函数
  flush: flushLogs
};

export default logger;

