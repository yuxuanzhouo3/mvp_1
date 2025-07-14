import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { exponentialBackoff } from './utils/retry';
import { CircuitBreaker } from './utils/circuitBreaker';

export interface DBHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: Date;
  errorCount: number;
  successCount: number;
  activeConnections: number;
  queueSize: number;
}

export interface ConnectionConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  maxConnections?: number;
  idleTimeout?: number;
  environment?: 'development' | 'staging' | 'production';
}

class DBConnection {
  private static instance: SupabaseClient;
  private static healthStatus: DBHealthStatus = {
    status: 'unhealthy',
    responseTime: 0,
    lastCheck: new Date(),
    errorCount: 0,
    successCount: 0,
    activeConnections: 0,
    queueSize: 0
  };
  
  private static circuitBreaker: CircuitBreaker;
  private static config: ConnectionConfig;
  private static isInitialized = false;
  private static healthCheckInterval: NodeJS.Timeout;
  private static connectionPool: Map<string, SupabaseClient> = new Map();
  private static lastRecycleTime = Date.now();
  private static readonly RECYCLE_INTERVAL = 300000; // 5分钟
  private static readonly MAX_POOL_SIZE = 10;

  static initialize(config: ConnectionConfig): void {
    if (this.isInitialized) {
      console.warn('⚠️  Database connection manager already initialized');
      return;
    }

    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 10000,
      maxConnections: 20,
      idleTimeout: 30000,
      environment: 'development',
      ...config
    };

    // 环境特定配置
    this.applyEnvironmentConfig();

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: this.config.environment === 'production' ? 3 : 5,
      recoveryTimeout: this.config.environment === 'production' ? 30000 : 60000,
      expectedResponseTime: this.config.timeout!
    });

    this.instance = this.createClient();
    this.isInitialized = true;
    this.startHealthMonitoring();
    this.startConnectionRecycling();
    
    console.log(`✅ Database connection manager initialized for ${this.config.environment} environment`);
  }

  private static applyEnvironmentConfig(): void {
    switch (this.config.environment) {
      case 'production':
        this.config.maxRetries = 5;
        this.config.timeout = 15000;
        this.config.maxConnections = 50;
        break;
      case 'staging':
        this.config.maxRetries = 4;
        this.config.timeout = 12000;
        this.config.maxConnections = 30;
        break;
      case 'development':
      default:
        this.config.maxRetries = 3;
        this.config.timeout = 10000;
        this.config.maxConnections = 20;
        break;
    }
  }

  private static createClient(): SupabaseClient {
    return createClient(this.config.url, this.config.serviceRoleKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false
      },
      global: {
        headers: {
          'X-Client-Info': `personalink-db-manager-${this.config.environment}`
        },
        fetch: this.customFetchWithRetry.bind(this)
      }
    });
  }

  static getInstance(): SupabaseClient {
    if (!this.isInitialized) {
      throw new Error('Database connection manager not initialized. Call initialize() first.');
    }
    return this.instance;
  }

  static get getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  static getConnectionFromPool(key: string): SupabaseClient {
    if (this.connectionPool.has(key)) {
      return this.connectionPool.get(key)!;
    }

    if (this.connectionPool.size >= this.MAX_POOL_SIZE) {
      // 回收最旧的连接
      const oldestKey = this.connectionPool.keys().next().value;
      if (oldestKey) {
        this.connectionPool.delete(oldestKey);
      }
    }

    const connection = this.createClient();
    this.connectionPool.set(key, connection);
    return connection;
  }

  private static startConnectionRecycling(): void {
    setInterval(() => {
      this.recycleConnections();
    }, this.RECYCLE_INTERVAL);
  }

  private static recycleConnections(): void {
    const now = Date.now();
    const connectionsToRemove: string[] = [];

    this.connectionPool.forEach((connection, key) => {
      // 这里可以添加连接健康检查逻辑
      // 暂时简单地回收所有连接
      connectionsToRemove.push(key);
    });

    connectionsToRemove.forEach(key => {
      this.connectionPool.delete(key);
    });

    if (connectionsToRemove.length > 0) {
      console.log(`🔄 Recycled ${connectionsToRemove.length} database connections`);
    }

    this.lastRecycleTime = now;
  }

  private static async customFetchWithRetry(
    input: RequestInfo | URL, 
    init?: RequestInit
  ): Promise<Response> {
    const startTime = Date.now();
    
    return this.circuitBreaker.execute(async () => {
      try {
        this.healthStatus.activeConnections++;
        this.healthStatus.queueSize++;
        
        const response = await fetch(input, {
          ...init,
          signal: AbortSignal.timeout(this.config.timeout || 10000)
        });
        
        const responseTime = Date.now() - startTime;
        this.updateHealth(true, responseTime);
        
        return response;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.updateHealth(false, responseTime);
        throw error;
      } finally {
        this.healthStatus.activeConnections = Math.max(0, this.healthStatus.activeConnections - 1);
        this.healthStatus.queueSize = Math.max(0, this.healthStatus.queueSize - 1);
      }
    });
  }

  private static updateHealth(success: boolean, responseTime: number): void {
    this.healthStatus.responseTime = responseTime;
    this.healthStatus.lastCheck = new Date();

    if (success) {
      this.healthStatus.successCount++;
      this.healthStatus.errorCount = Math.max(0, this.healthStatus.errorCount - 1);
    } else {
      this.healthStatus.errorCount++;
    }

    // 更新健康状态
    const errorRate = this.healthStatus.errorCount / (this.healthStatus.successCount + this.healthStatus.errorCount);
    
    if (errorRate === 0) {
      this.healthStatus.status = 'healthy';
    } else if (errorRate < 0.1) {
      this.healthStatus.status = 'degraded';
    } else {
      this.healthStatus.status = 'unhealthy';
    }
  }

  private static startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // 每30秒检查一次
  }

  private static async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();
      const { data, error } = await this.instance
        .from('profiles')
        .select('count')
        .limit(1);

      const responseTime = Date.now() - startTime;
      
      if (error) {
        this.updateHealth(false, responseTime);
        console.warn('⚠️  Health check failed:', error.message);
      } else {
        this.updateHealth(true, responseTime);
      }
    } catch (error) {
      this.updateHealth(false, 0);
      console.error('❌ Health check error:', error);
    }
  }

  static getHealthStatus(): DBHealthStatus {
    return { ...this.healthStatus };
  }

  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string = 'database operation'
  ): Promise<T> {
    if (!this.isInitialized) {
      throw new Error('Database connection manager not initialized');
    }

    return this.circuitBreaker.execute(async () => {
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
            const delay = exponentialBackoff(attempt, this.config.retryDelay!);
            console.log(`⏳ Retrying in ${delay}ms...`);
            await this.sleep(delay);
          }
        }
      }

      throw new Error(`${context} failed after ${this.config.maxRetries} attempts: ${lastError?.message}`);
    });
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async resetConnection(): Promise<void> {
    this.isInitialized = false;
    this.healthStatus = {
      status: 'unhealthy',
      responseTime: 0,
      lastCheck: new Date(),
      errorCount: 0,
      successCount: 0,
      activeConnections: 0,
      queueSize: 0
    };
    
    // 清理连接池
    this.connectionPool.clear();
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    await this.initialize(this.config);
  }

  static getStats() {
    return {
      health: this.healthStatus,
      config: this.config,
      isInitialized: this.isInitialized,
      circuitBreaker: this.circuitBreaker.getStatus(),
      connectionPool: {
        size: this.connectionPool.size,
        maxSize: this.MAX_POOL_SIZE,
        lastRecycle: this.lastRecycleTime
      }
    };
  }
}

// 导出单例实例
export const db = DBConnection;

// 初始化数据库连接
export function initializeDatabase(): void {
  const environment = process.env.NODE_ENV as 'development' | 'staging' | 'production' || 'development';
  
  db.initialize({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    environment,
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 10000,
    maxConnections: 20,
    idleTimeout: 30000
  });
}

// 获取数据库客户端
export function getDBClient(): SupabaseClient {
  return db.getInstance();
} 