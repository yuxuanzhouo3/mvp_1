import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { redisUtils } from '@/lib/redis';

export interface DatabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface ConnectionHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: Date;
  errorCount: number;
  successCount: number;
}

export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private supabase: SupabaseClient;
  private config: DatabaseConfig;
  private health: ConnectionHealth;
  private isInitialized = false;

  private constructor(config: DatabaseConfig) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 10000,
      ...config
    };

    this.supabase = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false
      },
      global: {
        headers: {
          'X-Client-Info': 'personalink-db-manager'
        }
      }
    });

    this.health = {
      status: 'healthy',
      responseTime: 0,
      lastCheck: new Date(),
      errorCount: 0,
      successCount: 0
    };
  }

  static getInstance(config?: DatabaseConfig): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      if (!config) {
        throw new Error('Database configuration required for first initialization');
      }
      DatabaseConnectionManager.instance = new DatabaseConnectionManager(config);
    }
    return DatabaseConnectionManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 测试连接
      await this.testConnection();
      this.isInitialized = true;
      console.log('✅ Database connection manager initialized');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  private async testConnection(): Promise<void> {
    const startTime = Date.now();
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) throw error;

      const responseTime = Date.now() - startTime;
      this.updateHealth(true, responseTime);
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime);
      throw error;
    }
  }

  private updateHealth(success: boolean, responseTime: number): void {
    this.health.responseTime = responseTime;
    this.health.lastCheck = new Date();

    if (success) {
      this.health.successCount++;
      this.health.errorCount = Math.max(0, this.health.errorCount - 1);
    } else {
      this.health.errorCount++;
    }

    // 更新健康状态
    if (this.health.errorCount === 0) {
      this.health.status = 'healthy';
    } else if (this.health.errorCount < 3) {
      this.health.status = 'degraded';
    } else {
      this.health.status = 'unhealthy';
    }
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string = 'database operation'
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries!; attempt++) {
      try {
        const result = await operation();
        this.updateHealth(true, 0);
        return result;
      } catch (error) {
        lastError = error as Error;
        this.updateHealth(false, 0);
        
        console.error(`❌ ${context} failed (attempt ${attempt}/${this.config.maxRetries}):`, error);

        if (attempt < this.config.maxRetries!) {
          const delay = this.config.retryDelay! * Math.pow(2, attempt - 1); // 指数退避
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`${context} failed after ${this.config.maxRetries} attempts: ${lastError?.message}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 数据库操作包装器
  async query<T = any>(
    table: string,
    operation: 'select' | 'insert' | 'update' | 'delete',
    options: any = {}
  ): Promise<T> {
    return this.executeWithRetry(async (): Promise<T> => {
      const query = this.supabase.from(table);

      switch (operation) {
        case 'select':
          return query.select(options.columns || '*') as T;
        case 'insert':
          return query.insert(options.data) as T;
        case 'update':
          return query.update(options.data) as T;
        case 'delete':
          return query.delete() as T;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    }, `${operation} on ${table}`);
  }

  // 事务支持
  async transaction<T>(operations: (() => Promise<T>)[]): Promise<T[]> {
    return this.executeWithRetry(async () => {
      const results: T[] = [];
      
      for (const operation of operations) {
        const result = await operation();
        results.push(result);
      }
      
      return results;
    }, 'database transaction');
  }

  // 缓存支持
  async cachedQuery<T>(
    key: string,
    query: () => Promise<T>,
    ttl: number = 300 // 5 minutes default
  ): Promise<T> {
    try {
      // 尝试从缓存获取
      const cached = await redisUtils.get<T>(key);
      if (cached) {
        console.log(`📦 Cache hit for key: ${key}`);
        return cached;
      }
    } catch (error) {
      console.warn(`⚠️  Cache read failed for key: ${key}:`, error);
    }

    // 执行查询
    const result = await this.executeWithRetry(query, `cached query: ${key}`);

    try {
      // 存储到缓存
      await redisUtils.set(key, result, ttl);
      console.log(`💾 Cached result for key: ${key}`);
    } catch (error) {
      console.warn(`⚠️  Cache write failed for key: ${key}:`, error);
    }

    return result;
  }

  // 健康检查
  async healthCheck(): Promise<ConnectionHealth> {
    try {
      await this.testConnection();
    } catch (error) {
      console.error('Health check failed:', error);
    }
    return this.health;
  }

  // 获取 Supabase 客户端
  getClient(): SupabaseClient {
    return this.supabase;
  }

  // 重置连接
  async resetConnection(): Promise<void> {
    this.isInitialized = false;
    this.health = {
      status: 'unhealthy',
      responseTime: 0,
      lastCheck: new Date(),
      errorCount: 0,
      successCount: 0
    };
    
    await this.initialize();
  }

  // 获取连接统计
  getStats() {
    return {
      health: this.health,
      config: {
        url: this.config.url,
        maxRetries: this.config.maxRetries,
        retryDelay: this.config.retryDelay,
        timeout: this.config.timeout
      },
      isInitialized: this.isInitialized
    };
  }
}

// 导出单例实例
export const dbManager = DatabaseConnectionManager.getInstance({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 10000
}); 