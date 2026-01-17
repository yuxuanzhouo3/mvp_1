/**
 * 统一的服务端数据库客户端
 * Unified Server-side Database Client
 * 
 * 根据部署环境自动选择 Supabase 或 Cloudbase:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 * 
 * 提供类似 Supabase 的链式查询 API，让 API 路由可以用统一的方式访问数据库
 */

import { isChinaDeployment } from '@/lib/config/deployment.config';
import { CN_TABLE_MAPPING, getCnCollectionName } from './cn-database';

// ==================== 类型定义 ====================

/**
 * 统一的用户类型
 */
export interface UnifiedUser {
  id: string;
  email?: string;
}

/**
 * 查询结果
 */
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
  count?: number;
}

/**
 * 列表查询结果
 */
export interface ListQueryResult<T> {
  data: T[] | null;
  error: Error | null;
  count?: number;
}

/**
 * 认证结果
 */
export interface AuthResult {
  data: { user: UnifiedUser | null };
  error: Error | null;
}

// ==================== 查询构建器 ====================

/**
 * 统一的查询构建器接口
 * 模拟 Supabase 的链式查询 API
 */
export interface IQueryBuilder<T = any> {
  select(columns?: string, options?: { count?: 'exact' }): IQueryBuilder<T>;
  eq(column: string, value: any): IQueryBuilder<T>;
  neq(column: string, value: any): IQueryBuilder<T>;
  in(column: string, values: any[]): IQueryBuilder<T>;
  gt(column: string, value: any): IQueryBuilder<T>;
  gte(column: string, value: any): IQueryBuilder<T>;
  lt(column: string, value: any): IQueryBuilder<T>;
  lte(column: string, value: any): IQueryBuilder<T>;
  is(column: string, value: null): IQueryBuilder<T>;
  or(conditions: string): IQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): IQueryBuilder<T>;
  limit(count: number): IQueryBuilder<T>;
  range(from: number, to: number): IQueryBuilder<T>;
  single(): Promise<QueryResult<T>>;
  // 执行查询
  then<TResult = ListQueryResult<T>>(
    onfulfilled?: (value: ListQueryResult<T>) => TResult | PromiseLike<TResult>,
    onrejected?: (reason: any) => TResult | PromiseLike<TResult>
  ): Promise<TResult>;
}

/**
 * 插入/更新构建器
 */
export interface IMutationBuilder<T = any> {
  select(columns?: string): IMutationBuilder<T>;
  single(): Promise<QueryResult<T>>;
  then<TResult = ListQueryResult<T>>(
    onfulfilled?: (value: ListQueryResult<T>) => TResult | PromiseLike<TResult>,
    onrejected?: (reason: any) => TResult | PromiseLike<TResult>
  ): Promise<TResult>;
}

/**
 * Upsert 构建器
 */
export interface IUpsertBuilder<T = any> extends IMutationBuilder<T> {
  onConflict?: string;
  ignoreDuplicates?: boolean;
}

// ==================== Supabase 实现 ====================

import { 
  createClient as createSupabaseClient,
  createRouteHandlerClient as createSupabaseRouteHandlerClient,
  createServiceClient as createSupabaseServiceClient
} from '@/lib/supabase/server';

/**
 * INTL 环境使用 Supabase
 */
function createIntlClient() {
  return createSupabaseRouteHandlerClient();
}

function createIntlServiceClient() {
  return createSupabaseServiceClient();
}

// ==================== Cloudbase 实现 ====================

/**
 * Cloudbase 查询构建器
 * 将 Supabase 风格的查询转换为 Cloudbase 查询
 */
class CloudbaseQueryBuilder<T = any> implements IQueryBuilder<T> {
  private tableName: string;
  private collectionName: string;
  private db: any;
  private query: any;
  private selectColumns: string = '*';
  private filters: Array<{ type: string; column: string; value: any }> = [];
  private orderByColumn: string | null = null;
  private orderAscending: boolean = true;
  private limitCount: number | null = null;
  private offsetCount: number = 0;
  private countMode: boolean = false;
  private isSingleResult: boolean = false;

  constructor(db: any, tableName: string) {
    this.db = db;
    this.tableName = tableName;
    this.collectionName = getCnCollectionName(tableName);
    this.query = db.collection(this.collectionName);
  }

  select(columns: string = '*', options?: { count?: 'exact' }): IQueryBuilder<T> {
    this.selectColumns = columns;
    if (options?.count === 'exact') {
      this.countMode = true;
    }
    return this;
  }

  eq(column: string, value: any): IQueryBuilder<T> {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: any): IQueryBuilder<T> {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  in(column: string, values: any[]): IQueryBuilder<T> {
    this.filters.push({ type: 'in', column, value: values });
    return this;
  }

  gt(column: string, value: any): IQueryBuilder<T> {
    this.filters.push({ type: 'gt', column, value });
    return this;
  }

  gte(column: string, value: any): IQueryBuilder<T> {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }

  lt(column: string, value: any): IQueryBuilder<T> {
    this.filters.push({ type: 'lt', column, value });
    return this;
  }

  lte(column: string, value: any): IQueryBuilder<T> {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }

  is(column: string, value: null): IQueryBuilder<T> {
    this.filters.push({ type: 'is', column, value });
    return this;
  }

  or(conditions: string): IQueryBuilder<T> {
    // 解析 or 条件，如 "user_1.eq.xxx,user_2.eq.xxx"
    this.filters.push({ type: 'or', column: '', value: conditions });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): IQueryBuilder<T> {
    this.orderByColumn = column;
    this.orderAscending = options?.ascending ?? true;
    return this;
  }

  limit(count: number): IQueryBuilder<T> {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number): IQueryBuilder<T> {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  single(): Promise<QueryResult<T>> {
    this.isSingleResult = true;
    this.limitCount = 1;
    return this.execute().then(result => ({
      data: result.data?.[0] || null,
      error: result.error,
    }));
  }

  then<TResult = ListQueryResult<T>>(
    onfulfilled?: (value: ListQueryResult<T>) => TResult | PromiseLike<TResult>,
    onrejected?: (reason: any) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<ListQueryResult<T>> {
    try {
      let query = this.db.collection(this.collectionName);
      const _ = this.db.command;

      // 构建过滤条件
      const whereConditions: Record<string, any> = {};
      
      for (const filter of this.filters) {
        const { type, column, value } = filter;
        
        // 处理 CN 环境的特殊字段映射
        const mappedColumn = this.mapColumn(column);
        
        switch (type) {
          case 'eq':
            whereConditions[mappedColumn] = value;
            break;
          case 'neq':
            whereConditions[mappedColumn] = _.neq(value);
            break;
          case 'in':
            whereConditions[mappedColumn] = _.in(value);
            break;
          case 'gt':
            whereConditions[mappedColumn] = _.gt(value);
            break;
          case 'gte':
            whereConditions[mappedColumn] = _.gte(value);
            break;
          case 'lt':
            whereConditions[mappedColumn] = _.lt(value);
            break;
          case 'lte':
            whereConditions[mappedColumn] = _.lte(value);
            break;
          case 'is':
            whereConditions[mappedColumn] = _.eq(null);
            break;
          case 'or':
            // 解析 or 条件
            const orConditions = this.parseOrConditions(value, _);
            if (orConditions.length > 0) {
              whereConditions['$or'] = orConditions;
            }
            break;
        }
      }

      if (Object.keys(whereConditions).length > 0) {
        query = query.where(whereConditions);
      }

      // 应用排序
      if (this.orderByColumn) {
        query = query.orderBy(this.mapColumn(this.orderByColumn), this.orderAscending ? 'asc' : 'desc');
      }

      // 应用分页
      if (this.offsetCount > 0) {
        query = query.skip(this.offsetCount);
      }
      if (this.limitCount !== null) {
        query = query.limit(this.limitCount);
      }

      // 执行查询
      const result = await query.get();
      
      // 转换数据格式（将 _id 映射为 id）
      const data = (result.data || []).map((item: any) => this.transformDocument(item));

      // 获取总数
      let count: number | undefined;
      if (this.countMode) {
        const countQuery = Object.keys(whereConditions).length > 0
          ? this.db.collection(this.collectionName).where(whereConditions)
          : this.db.collection(this.collectionName);
        const countResult = await countQuery.count();
        count = countResult.total;
      }

      return { data, error: null, count };
    } catch (error: any) {
      console.error('[Cloudbase Query] Error:', error);
      return { data: null, error: new Error(error.message || 'Query failed') };
    }
  }

  /**
   * 映射字段名（处理 INTL 与 CN 环境的字段名差异）
   */
  private mapColumn(column: string): string {
    // id -> _id 映射
    if (column === 'id') {
      return '_id';
    }
    
    // 处理视图特有的字段
    if (this.tableName.startsWith('v_')) {
      // v_user_full_profile 视图的字段映射到 users 集合
      const viewFieldMapping: Record<string, string> = {
        'total_score': 'market_value_score',
        'city_name': 'location.city',
      };
      return viewFieldMapping[column] || column;
    }
    
    return column;
  }

  /**
   * 转换文档格式
   */
  private transformDocument(doc: any): any {
    if (!doc) return doc;
    
    const transformed = { ...doc };
    
    // _id -> id
    if (doc._id && !doc.id) {
      transformed.id = doc._id;
    }
    
    // 处理视图字段
    if (this.tableName.startsWith('v_')) {
      // 将 market_value_score 映射为 total_score
      if (doc.market_value_score !== undefined) {
        transformed.total_score = doc.market_value_score;
      }
      // 处理 location.city
      if (doc.location?.city) {
        transformed.city_name = doc.location.city;
      }
    }
    
    return transformed;
  }

  /**
   * 解析 or 条件字符串
   */
  private parseOrConditions(orString: string, _: any): any[] {
    const conditions: any[] = [];
    const parts = orString.split(',');
    
    for (const part of parts) {
      // 解析格式如 "user_1.eq.xxx"
      const match = part.match(/^(\w+)\.(eq|neq|gt|gte|lt|lte)\.(.+)$/);
      if (match) {
        const [, column, op, value] = match;
        const condition: Record<string, any> = {};
        
        switch (op) {
          case 'eq':
            condition[column] = value;
            break;
          case 'neq':
            condition[column] = _.neq(value);
            break;
          case 'gt':
            condition[column] = _.gt(value);
            break;
          case 'gte':
            condition[column] = _.gte(value);
            break;
          case 'lt':
            condition[column] = _.lt(value);
            break;
          case 'lte':
            condition[column] = _.lte(value);
            break;
        }
        
        conditions.push(condition);
      }
    }
    
    return conditions;
  }
}

/**
 * Cloudbase 插入/更新构建器
 */
class CloudbaseMutationBuilder<T = any> implements IMutationBuilder<T> {
  private tableName: string;
  private collectionName: string;
  private db: any;
  private operation: 'insert' | 'update' | 'upsert' | 'delete';
  private data: any;
  private id?: string;
  private filters: Array<{ column: string; value: any }> = [];
  private selectColumns: string = '*';
  private isSingleResult: boolean = false;
  private upsertOptions?: { onConflict: string; ignoreDuplicates: boolean };

  constructor(
    db: any, 
    tableName: string, 
    operation: 'insert' | 'update' | 'upsert' | 'delete',
    data?: any,
    options?: { id?: string; upsertOptions?: { onConflict: string; ignoreDuplicates: boolean } }
  ) {
    this.db = db;
    this.tableName = tableName;
    this.collectionName = getCnCollectionName(tableName);
    this.operation = operation;
    this.data = data;
    this.id = options?.id;
    this.upsertOptions = options?.upsertOptions;
  }

  eq(column: string, value: any): CloudbaseMutationBuilder<T> {
    this.filters.push({ column, value });
    return this;
  }

  select(columns: string = '*'): CloudbaseMutationBuilder<T> {
    this.selectColumns = columns;
    return this;
  }

  single(): Promise<QueryResult<T>> {
    this.isSingleResult = true;
    return this.execute().then(result => ({
      data: result.data?.[0] || null,
      error: result.error,
    }));
  }

  then<TResult = ListQueryResult<T>>(
    onfulfilled?: (value: ListQueryResult<T>) => TResult | PromiseLike<TResult>,
    onrejected?: (reason: any) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<ListQueryResult<T>> {
    try {
      const collection = this.db.collection(this.collectionName);

      switch (this.operation) {
        case 'insert': {
          const insertData = Array.isArray(this.data) 
            ? this.data.map((d: any) => this.prepareInsertData(d))
            : [this.prepareInsertData(this.data)];
          
          const results: T[] = [];
          for (const item of insertData) {
            const result = await collection.add(item);
            const doc = await collection.doc(result.id).get();
            if (doc.data?.[0]) {
              results.push(this.transformDocument(doc.data[0]));
            }
          }
          return { data: results, error: null };
        }

        case 'update': {
          let query = collection;
          
          if (this.id) {
            query = collection.doc(this.id);
            await query.update(this.prepareUpdateData(this.data));
            const doc = await collection.doc(this.id).get();
            const result = doc.data?.[0] ? [this.transformDocument(doc.data[0])] : [];
            return { data: result, error: null };
          }
          
          // 使用过滤条件更新
          const whereConditions: Record<string, any> = {};
          for (const filter of this.filters) {
            whereConditions[filter.column === 'id' ? '_id' : filter.column] = filter.value;
          }
          
          if (Object.keys(whereConditions).length > 0) {
            await collection.where(whereConditions).update(this.prepareUpdateData(this.data));
            const docs = await collection.where(whereConditions).get();
            const results = (docs.data || []).map((d: any) => this.transformDocument(d));
            return { data: results, error: null };
          }
          
          return { data: null, error: new Error('No filter specified for update') };
        }

        case 'upsert': {
          // Cloudbase 没有原生 upsert，需要先查询再决定插入或更新
          const insertData = Array.isArray(this.data) 
            ? this.data.map((d: any) => this.prepareInsertData(d))
            : [this.prepareInsertData(this.data)];
          
          const results: T[] = [];
          
          for (const item of insertData) {
            // 检查是否存在（基于 upsertOptions.onConflict）
            let existing = null;
            if (this.upsertOptions?.onConflict) {
              const conflictFields = this.upsertOptions.onConflict.split(',');
              const whereConditions: Record<string, any> = {};
              for (const field of conflictFields) {
                if (item[field] !== undefined) {
                  whereConditions[field] = item[field];
                }
              }
              if (Object.keys(whereConditions).length > 0) {
                const existingResult = await collection.where(whereConditions).limit(1).get();
                existing = existingResult.data?.[0];
              }
            }

            if (existing) {
              if (!this.upsertOptions?.ignoreDuplicates) {
                // 更新现有记录
                await collection.doc(existing._id).update(this.prepareUpdateData(item));
                const doc = await collection.doc(existing._id).get();
                if (doc.data?.[0]) {
                  results.push(this.transformDocument(doc.data[0]));
                }
              }
            } else {
              // 插入新记录
              const result = await collection.add(item);
              const doc = await collection.doc(result.id).get();
              if (doc.data?.[0]) {
                results.push(this.transformDocument(doc.data[0]));
              }
            }
          }
          
          return { data: results, error: null };
        }

        case 'delete': {
          let query = collection;
          
          if (this.id) {
            await collection.doc(this.id).remove();
            return { data: [], error: null };
          }
          
          // 使用过滤条件删除
          const whereConditions: Record<string, any> = {};
          for (const filter of this.filters) {
            whereConditions[filter.column === 'id' ? '_id' : filter.column] = filter.value;
          }
          
          if (Object.keys(whereConditions).length > 0) {
            await collection.where(whereConditions).remove();
            return { data: [], error: null };
          }
          
          return { data: null, error: new Error('No filter specified for delete') };
        }

        default:
          return { data: null, error: new Error(`Unknown operation: ${this.operation}`) };
      }
    } catch (error: any) {
      console.error('[Cloudbase Mutation] Error:', error);
      return { data: null, error: new Error(error.message || 'Mutation failed') };
    }
  }

  private prepareInsertData(data: any): any {
    const prepared = { ...data };
    // 移除 id 字段，让 Cloudbase 自动生成 _id
    delete prepared.id;
    // 添加时间戳
    prepared.created_at = prepared.created_at || new Date().toISOString();
    prepared.updated_at = new Date().toISOString();
    return prepared;
  }

  private prepareUpdateData(data: any): any {
    const prepared = { ...data };
    // 移除 id 字段
    delete prepared.id;
    // 更新时间戳
    prepared.updated_at = new Date().toISOString();
    return prepared;
  }

  private transformDocument(doc: any): any {
    if (!doc) return doc;
    const transformed = { ...doc };
    if (doc._id && !doc.id) {
      transformed.id = doc._id;
    }
    return transformed;
  }
}

/**
 * Cloudbase 认证管理器
 */
class CloudbaseAuthManager {
  private app: any;

  constructor(app: any) {
    this.app = app;
  }

  async getUser(): Promise<AuthResult> {
    try {
      const auth = this.app.auth();
      const user = auth.currentUser;
      
      if (!user) {
        return { data: { user: null }, error: null };
      }
      
      return {
        data: {
          user: {
            id: user.uid,
            email: user.email,
          }
        },
        error: null,
      };
    } catch (error: any) {
      return {
        data: { user: null },
        error: new Error(error.message || 'Failed to get user'),
      };
    }
  }

  async getSession() {
    try {
      const auth = this.app.auth();
      const loginState = await auth.getLoginState();
      
      if (!loginState) {
        return { data: { session: null }, error: null };
      }
      
      return {
        data: {
          session: {
            access_token: loginState.credential.accessToken,
          }
        },
        error: null,
      };
    } catch (error: any) {
      return {
        data: { session: null },
        error: new Error(error.message || 'Failed to get session'),
      };
    }
  }
}

/**
 * Cloudbase 客户端适配器
 * 提供类似 Supabase 的 API
 */
class CloudbaseClientAdapter {
  private app: any;
  private db: any;
  public auth: CloudbaseAuthManager;

  constructor(app: any) {
    this.app = app;
    this.db = app.database();
    this.auth = new CloudbaseAuthManager(app);
  }

  from(table: string): CloudbaseQueryBuilder {
    return new CloudbaseQueryBuilder(this.db, table);
  }

  /**
   * 插入数据
   */
  insert(table: string, data: any): CloudbaseMutationBuilder {
    return new CloudbaseMutationBuilder(this.db, table, 'insert', data);
  }

  /**
   * 更新数据
   */
  update(table: string, data: any, id?: string): CloudbaseMutationBuilder {
    return new CloudbaseMutationBuilder(this.db, table, 'update', data, { id });
  }

  /**
   * Upsert 数据
   */
  upsert(table: string, data: any, options?: { onConflict?: string; ignoreDuplicates?: boolean }): CloudbaseMutationBuilder {
    return new CloudbaseMutationBuilder(this.db, table, 'upsert', data, {
      upsertOptions: {
        onConflict: options?.onConflict || '',
        ignoreDuplicates: options?.ignoreDuplicates || false,
      }
    });
  }

  /**
   * 删除数据
   */
  delete(table: string, id?: string): CloudbaseMutationBuilder {
    return new CloudbaseMutationBuilder(this.db, table, 'delete', undefined, { id });
  }
}

// Cloudbase 应用实例缓存
let cloudbaseApp: any = null;

/**
 * 初始化 Cloudbase 应用
 */
async function getCloudbaseApp() {
  if (cloudbaseApp) {
    return cloudbaseApp;
  }

  // 在服务端使用 Node.js SDK
  if (typeof window === 'undefined') {
    // @ts-ignore - 动态导入
    const cloudbase = await import('@cloudbase/node-sdk');
    cloudbaseApp = cloudbase.init({
      env: process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || '',
      secretId: process.env.CLOUDBASE_SECRET_ID,
      secretKey: process.env.CLOUDBASE_SECRET_KEY,
    });
  } else {
    // 客户端使用 JS SDK
    // @ts-ignore - 动态导入
    const cloudbase = await import('@cloudbase/js-sdk');
    cloudbaseApp = cloudbase.init({
      env: process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || '',
    });
  }

  return cloudbaseApp;
}

/**
 * 创建 CN 环境客户端
 */
async function createCnClient(): Promise<CloudbaseClientAdapter> {
  const app = await getCloudbaseApp();
  return new CloudbaseClientAdapter(app);
}

// ==================== 统一导出 ====================

/**
 * 创建统一的路由处理器数据库客户端
 * 根据部署环境自动选择 Supabase 或 Cloudbase
 */
export function createRouteHandlerClient(): ReturnType<typeof createSupabaseRouteHandlerClient> {
  if (isChinaDeployment()) {
    // CN 环境 - 返回 Cloudbase 适配器
    // 注意：由于需要异步初始化，这里使用代理对象
    throw new Error('CN environment uses async client. Use createRouteHandlerClientAsync() instead.');
  }
  
  // INTL 环境 - 返回 Supabase 客户端
  return createIntlClient();
}

/**
 * 创建统一的路由处理器数据库客户端（异步版本）
 * 用于 CN 环境，返回类似 Supabase API 的 Cloudbase 适配器
 */
export async function createRouteHandlerClientAsync(): Promise<CloudbaseClientAdapter | ReturnType<typeof createSupabaseRouteHandlerClient>> {
  if (isChinaDeployment()) {
    return createCnClient();
  }
  return createIntlClient();
}

/**
 * 创建服务端客户端（绕过 RLS）
 * 用于 Webhook、后台任务等场景
 */
export function createServiceClient(): ReturnType<typeof createSupabaseServiceClient> {
  if (isChinaDeployment()) {
    throw new Error('CN environment uses async client. Use createServiceClientAsync() instead.');
  }
  return createIntlServiceClient();
}

/**
 * 创建服务端客户端（异步版本）
 */
export async function createServiceClientAsync(): Promise<CloudbaseClientAdapter | ReturnType<typeof createSupabaseServiceClient>> {
  if (isChinaDeployment()) {
    return createCnClient();
  }
  return createIntlServiceClient();
}

/**
 * 检查是否为 CN 环境
 * API 路由可以使用这个函数来决定使用同步还是异步客户端
 */
export { isChinaDeployment };

/**
 * 获取数据库客户端的工具函数
 * 自动处理 CN/INTL 环境差异
 */
export async function getDatabaseClient() {
  if (isChinaDeployment()) {
    return createCnClient();
  }
  return createIntlClient();
}

