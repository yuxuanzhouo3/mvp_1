/**
 * 数据库服务接口类型定义
 * Database Service Interface Types
 * 
 * 为 CN (Cloudbase) 和 INTL (Supabase) 环境定义统一接口
 */

// 通用查询选项
export interface QueryOptions {
  select?: string;
  filter?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

// 通用查询结果
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}

// 通用列表查询结果
export interface ListResult<T> {
  data: T[] | null;
  error: Error | null;
  count?: number;
}

// 数据库服务接口
export interface IDatabaseService {
  // 基础 CRUD 操作
  
  /**
   * 获取单条记录
   */
  get<T>(table: string, id: string): Promise<QueryResult<T>>;

  /**
   * 查询多条记录
   */
  query<T>(table: string, options?: QueryOptions): Promise<ListResult<T>>;

  /**
   * 通过条件查询单条记录
   */
  findOne<T>(table: string, filter: Record<string, any>): Promise<QueryResult<T>>;

  /**
   * 插入记录
   */
  insert<T>(table: string, data: Partial<T>): Promise<QueryResult<T>>;

  /**
   * 更新记录
   */
  update<T>(table: string, id: string, data: Partial<T>): Promise<QueryResult<T>>;

  /**
   * 通过条件更新记录
   */
  updateWhere<T>(table: string, filter: Record<string, any>, data: Partial<T>): Promise<QueryResult<T>>;

  /**
   * 删除记录
   */
  delete(table: string, id: string): Promise<{ error: Error | null }>;

  /**
   * 批量插入
   */
  batchInsert<T>(table: string, data: Partial<T>[]): Promise<ListResult<T>>;

  // 认证相关
  
  /**
   * 获取当前用户
   */
  getCurrentUser(): Promise<QueryResult<{ id: string; email?: string }>>;

  /**
   * 获取当前会话
   */
  getSession(): Promise<QueryResult<{ accessToken: string }>>;
}

// 实时订阅服务接口
export interface IRealtimeService {
  /**
   * 订阅表变更
   */
  subscribe(
    table: string,
    filter: Record<string, any>,
    callbacks: {
      onInsert?: (payload: any) => void;
      onUpdate?: (payload: any) => void;
      onDelete?: (payload: any) => void;
    }
  ): () => void;

  /**
   * 订阅频道
   */
  subscribeChannel(
    channel: string,
    callbacks: {
      onMessage?: (payload: any) => void;
      onPresence?: (payload: any) => void;
    }
  ): () => void;

  /**
   * 发布消息到频道
   */
  publish(channel: string, event: string, payload: any): Promise<void>;
}

// 存储服务接口
export interface IStorageService {
  /**
   * 上传文件
   */
  upload(bucket: string, path: string, file: File | Blob): Promise<QueryResult<{ url: string; path: string }>>;

  /**
   * 获取文件 URL
   */
  getUrl(bucket: string, path: string): Promise<string>;

  /**
   * 删除文件
   */
  delete(bucket: string, path: string): Promise<{ error: Error | null }>;

  /**
   * 列出文件
   */
  list(bucket: string, path?: string): Promise<ListResult<{ name: string; url: string }>>;
}

