import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/connection-manager';

export interface DatabaseError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  context: string;
}

export class DatabaseErrorHandler {
  private static errorLog: DatabaseError[] = [];
  private static readonly MAX_LOG_SIZE = 100;

  static logError(error: any, context: string): DatabaseError {
    const dbError: DatabaseError = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'Unknown database error',
      details: error.details || error,
      timestamp: new Date(),
      context
    };

    this.errorLog.push(dbError);
    
    // 保持日志大小限制
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(-this.MAX_LOG_SIZE);
    }

    console.error(`🔴 Database Error [${context}]:`, {
      code: dbError.code,
      message: dbError.message,
      timestamp: dbError.timestamp.toISOString()
    });

    return dbError;
  }

  static getErrorLog(): DatabaseError[] {
    return [...this.errorLog];
  }

  static clearErrorLog(): void {
    this.errorLog = [];
  }

  static isRetryableError(error: any): boolean {
    const retryableCodes = [
      'PGRST301', // Connection timeout
      'PGRST302', // Connection refused
      'PGRST303', // Network error
      'PGRST304', // Server error
      'PGRST305', // Service unavailable
    ];

    return retryableCodes.includes(error.code) || 
           error.message?.includes('timeout') ||
           error.message?.includes('connection') ||
           error.message?.includes('network');
  }

  static async handleDatabaseOperation<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await dbManager.executeWithRetry(operation, context);
      } catch (error) {
        lastError = error;
        this.logError(error, `${context} (attempt ${attempt}/${maxRetries})`);

        if (!this.isRetryableError(error) || attempt === maxRetries) {
          break;
        }

        // 指数退避
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  static createErrorResponse(error: any, context: string): NextResponse {
    const dbError = this.logError(error, context);
    
    const statusCode = this.getStatusCode(error);
    const errorMessage = this.getErrorMessage(error);

    return NextResponse.json({
      error: {
        message: errorMessage,
        code: dbError.code,
        context: dbError.context,
        timestamp: dbError.timestamp.toISOString()
      }
    }, { status: statusCode });
  }

  private static getStatusCode(error: any): number {
    // 根据错误类型返回适当的 HTTP 状态码
    if (error.code?.startsWith('PGRST')) {
      return 500; // 数据库错误
    }
    
    if (error.message?.includes('not found')) {
      return 404;
    }
    
    if (error.message?.includes('unauthorized') || error.message?.includes('permission')) {
      return 403;
    }
    
    if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      return 400;
    }
    
    return 500; // 默认服务器错误
  }

  private static getErrorMessage(error: any): string {
    // 用户友好的错误消息
    if (error.message?.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    if (error.message?.includes('connection')) {
      return 'Database connection failed. Please try again later.';
    }
    
    if (error.message?.includes('not found')) {
      return 'The requested resource was not found.';
    }
    
    if (error.message?.includes('unauthorized')) {
      return 'You are not authorized to perform this action.';
    }
    
    return 'An unexpected error occurred. Please try again.';
  }
}

// API 路由包装器
export function withDatabaseErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  context: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (error) {
      throw DatabaseErrorHandler.createErrorResponse(error, context);
    }
  };
}

// 中间件函数
export async function databaseErrorMiddleware(
  request: NextRequest,
  next: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await next();
  } catch (error) {
    return DatabaseErrorHandler.createErrorResponse(error, request.url);
  }
} 