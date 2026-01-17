/**
 * CN 环境数据库服务实现 (腾讯云 Cloudbase)
 * CN Environment Database Service Implementation (Tencent Cloudbase)
 */

import type { 
  IDatabaseService, 
  IRealtimeService,
  IStorageService,
  QueryOptions, 
  QueryResult, 
  ListResult 
} from './types';

// Cloudbase SDK 类型定义
interface CloudbaseDatabase {
  collection(name: string): CloudbaseCollection;
}

interface CloudbaseCollection {
  doc(id: string): CloudbaseDocument;
  where(condition: any): CloudbaseQuery;
  add(data: any): Promise<{ id: string }>;
  get(): Promise<{ data: any[] }>;
  count(): Promise<{ total: number }>;
  orderBy(field: string, order: 'asc' | 'desc'): CloudbaseQuery;
  limit(value: number): CloudbaseQuery;
  skip(value: number): CloudbaseQuery;
}

interface CloudbaseDocument {
  get(): Promise<{ data: any[] }>;
  update(data: any): Promise<any>;
  remove(): Promise<any>;
}

interface CloudbaseQuery extends CloudbaseCollection {
  field(projection: any): CloudbaseQuery;
}

interface CloudbaseAuth {
  currentUser: { uid: string; email?: string } | null;
  getLoginState(): Promise<{ credential: { accessToken: string } } | null>;
}

interface CloudbaseApp {
  database(): CloudbaseDatabase;
  auth(): CloudbaseAuth;
  callFunction(options: { name: string; data?: any }): Promise<{ result: any }>;
  uploadFile(options: { cloudPath: string; filePath: any }): Promise<{ fileID: string }>;
  getTempFileURL(options: { fileList: string[] }): Promise<{ fileList: { tempFileURL: string }[] }>;
  deleteFile(options: { fileList: string[] }): Promise<any>;
}

// 全局 Cloudbase 实例缓存
let cloudbaseApp: CloudbaseApp | null = null;

/**
 * 初始化 Cloudbase
 * 注意：需要在客户端初始化，服务端需要使用 Server SDK
 */
async function getCloudbaseApp(): Promise<CloudbaseApp> {
  if (cloudbaseApp) {
    return cloudbaseApp;
  }

  // 动态导入 Cloudbase SDK
  // @ts-ignore - Cloudbase SDK 未安装时忽略类型错误
  const cloudbase = await import('@cloudbase/js-sdk');

  // @ts-ignore
  cloudbaseApp = (cloudbase.default || cloudbase).init({
    env: process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || '',
  }) as unknown as CloudbaseApp;

  return cloudbaseApp;
}

/**
 * CN 数据库服务 - 基于腾讯云 Cloudbase
 */
export class CnDatabaseService implements IDatabaseService {
  private async getDb(): Promise<CloudbaseDatabase> {
    const app = await getCloudbaseApp();
    return app.database();
  }

  private async getAuth(): Promise<CloudbaseAuth> {
    const app = await getCloudbaseApp();
    return app.auth();
  }

  async get<T>(table: string, id: string): Promise<QueryResult<T>> {
    try {
      const db = await this.getDb();
      const result = await db.collection(table).doc(id).get();
      
      return { 
        data: result.data?.[0] as T || null, 
        error: null 
      };
    } catch (error: any) {
      return { data: null, error: new Error(error.message || 'Database query failed') };
    }
  }

  async query<T>(table: string, options?: QueryOptions): Promise<ListResult<T>> {
    try {
      const db = await this.getDb();
      let query: any = db.collection(table);

      // 应用过滤条件
      if (options?.filter) {
        query = query.where(options.filter);
      }

      // 应用字段选择
      if (options?.select) {
        const fields: Record<string, boolean> = {};
        options.select.split(',').forEach(f => {
          fields[f.trim()] = true;
        });
        query = query.field(fields);
      }

      // 应用排序
      if (options?.orderBy) {
        query = query.orderBy(
          options.orderBy.column, 
          options.orderBy.ascending ? 'asc' : 'desc'
        );
      }

      // 应用分页
      if (options?.offset) {
        query = query.skip(options.offset);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const result = await query.get();
      
      // 获取总数
      let count: number | undefined;
      if (options?.filter) {
        const countResult = await db.collection(table).where(options.filter).count();
        count = countResult.total;
      }
      
      return { 
        data: result.data as T[], 
        error: null,
        count
      };
    } catch (error: any) {
      return { data: null, error: new Error(error.message || 'Database query failed') };
    }
  }

  async findOne<T>(table: string, filter: Record<string, any>): Promise<QueryResult<T>> {
    try {
      const db = await this.getDb();
      const result = await db.collection(table).where(filter).limit(1).get();
      
      return { 
        data: result.data?.[0] as T || null, 
        error: null 
      };
    } catch (error: any) {
      return { data: null, error: new Error(error.message || 'Database query failed') };
    }
  }

  async insert<T>(table: string, data: Partial<T>): Promise<QueryResult<T>> {
    try {
      const db = await this.getDb();
      const result = await db.collection(table).add({
        ...data,
        _id: undefined, // Cloudbase 自动生成 _id
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      // 获取插入的记录
      const inserted = await this.get<T>(table, result.id);
      
      return inserted;
    } catch (error: any) {
      return { data: null, error: new Error(error.message || 'Database insert failed') };
    }
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<QueryResult<T>> {
    try {
      const db = await this.getDb();
      await db.collection(table).doc(id).update({
        ...data,
        updated_at: new Date().toISOString(),
      });
      
      // 获取更新后的记录
      const updated = await this.get<T>(table, id);
      
      return updated;
    } catch (error: any) {
      return { data: null, error: new Error(error.message || 'Database update failed') };
    }
  }

  async updateWhere<T>(table: string, filter: Record<string, any>, data: Partial<T>): Promise<QueryResult<T>> {
    try {
      // 先查找记录
      const existing = await this.findOne<T & { _id: string }>(table, filter);
      
      if (!existing.data) {
        return { data: null, error: new Error('Record not found') };
      }

      // 更新记录
      return this.update<T>(table, existing.data._id, data);
    } catch (error: any) {
      return { data: null, error: new Error(error.message || 'Database update failed') };
    }
  }

  async delete(table: string, id: string): Promise<{ error: Error | null }> {
    try {
      const db = await this.getDb();
      await db.collection(table).doc(id).remove();
      
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || 'Database delete failed') };
    }
  }

  async batchInsert<T>(table: string, data: Partial<T>[]): Promise<ListResult<T>> {
    try {
      const results: T[] = [];
      
      // Cloudbase 批量插入需要逐条处理
      for (const item of data) {
        const result = await this.insert<T>(table, item);
        if (result.data) {
          results.push(result.data);
        }
      }
      
      return { data: results, error: null };
    } catch (error: any) {
      return { data: null, error: new Error(error.message || 'Database batch insert failed') };
    }
  }

  async getCurrentUser(): Promise<QueryResult<{ id: string; email?: string }>> {
    try {
      const auth = await this.getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        return { data: null, error: new Error('Not authenticated') };
      }
      
      return { 
        data: { id: user.uid, email: user.email }, 
        error: null 
      };
    } catch (error: any) {
      return { data: null, error: new Error(error.message || 'Authentication check failed') };
    }
  }

  async getSession(): Promise<QueryResult<{ accessToken: string }>> {
    try {
      const auth = await this.getAuth();
      const loginState = await auth.getLoginState();
      
      if (!loginState) {
        return { data: null, error: new Error('No session') };
      }
      
      return { 
        data: { accessToken: loginState.credential.accessToken }, 
        error: null 
      };
    } catch (error: any) {
      return { data: null, error: new Error(error.message || 'Session check failed') };
    }
  }
}

/**
 * CN 实时服务 - 基于 Cloudbase 实时数据推送
 * 注意：Cloudbase 的实时功能与 Supabase 不同，需要使用 watch API
 */
export class CnRealtimeService implements IRealtimeService {
  private async getDb(): Promise<CloudbaseDatabase> {
    const app = await getCloudbaseApp();
    return app.database();
  }

  subscribe(
    table: string,
    filter: Record<string, any>,
    callbacks: {
      onInsert?: (payload: any) => void;
      onUpdate?: (payload: any) => void;
      onDelete?: (payload: any) => void;
    }
  ): () => void {
    // Cloudbase 使用 watch API 实现实时订阅
    let watcher: any = null;

    (async () => {
      try {
        const db = await this.getDb();
        // @ts-ignore - watch API
        watcher = db.collection(table).where(filter).watch({
          onChange: (snapshot: any) => {
            const { docChanges } = snapshot;
            docChanges.forEach((change: any) => {
              switch (change.dataType) {
                case 'add':
                  callbacks.onInsert?.(change.doc);
                  break;
                case 'update':
                  callbacks.onUpdate?.(change.doc);
                  break;
                case 'remove':
                  callbacks.onDelete?.(change.doc);
                  break;
              }
            });
          },
          onError: (error: any) => {
            console.error('[Cloudbase Watch Error]', error);
          },
        });
      } catch (error) {
        console.error('[Cloudbase Watch Init Error]', error);
      }
    })();

    // 返回取消订阅函数
    return () => {
      if (watcher) {
        watcher.close();
      }
    };
  }

  subscribeChannel(
    _channel: string,
    callbacks: {
      onMessage?: (payload: any) => void;
      onPresence?: (payload: any) => void;
    }
  ): () => void {
    // Cloudbase 不支持频道订阅，使用轮询或 WebSocket 替代
    // 这里可以集成环信 IM 的实时功能
    console.warn('[CN Realtime] Channel subscription not supported in Cloudbase, use Easemob IM instead');
    
    // 返回空的取消函数
    return () => {};
  }

  async publish(_channel: string, _event: string, _payload: any): Promise<void> {
    // Cloudbase 不支持频道发布，使用云函数或环信 IM 替代
    console.warn('[CN Realtime] Channel publishing not supported in Cloudbase, use Easemob IM instead');
  }
}

/**
 * CN 环境数据表映射
 * 定义 INTL 环境表名到 CN 环境集合名的映射
 */
export const CN_TABLE_MAPPING: Record<string, string> = {
  // 用户相关
  'users': 'users',
  'user_profiles': 'users',  // CN 环境将 profile 存储在 users 集合中
  'user_photos': 'users',    // CN 环境将 photos 存储在 users.photos 字段中
  'user_verifications': 'user_verifications',
  'user_settings': 'user_settings',
  
  // 兴趣相关
  'interests': 'interests',
  'user_interests': 'user_interests',
  
  // 匹配相关
  'recommendations': 'recommendations',
  'swipes': 'swipes',
  'matches': 'matches',
  
  // 聊天相关
  'chat_rooms': 'chat_rooms',
  'messages': 'messages',
  'message_attachments': 'message_attachments',
  
  // 支付相关
  'orders': 'orders',
  'credit_transactions': 'credit_transactions',
  
  // 积分/会员相关
  'credit_packages': 'credit_packages',
  'membership_tiers': 'membership_tiers',
  'user_memberships': 'user_memberships',
  'user_boosts': 'user_boosts',
  
  // AI 相关
  'ai_chat_sessions': 'ai_chat_sessions',
  'ai_usage_limits': 'ai_usage_limits',
  'ai_usage_logs': 'ai_usage_logs',
  
  // 通知相关
  'notifications': 'notifications',
  'push_tokens': 'push_tokens',
  
  // 视图映射 - CN 环境没有数据库视图，使用原始集合
  'v_user_full_profile': 'users',
  'v_active_users': 'users',
};

/**
 * 获取 CN 环境对应的集合名
 */
export function getCnCollectionName(intlTableName: string): string {
  return CN_TABLE_MAPPING[intlTableName] || intlTableName;
}

/**
 * CN 存储服务 - 基于 Cloudbase 云存储
 */
export class CnStorageService implements IStorageService {
  private async getApp(): Promise<CloudbaseApp> {
    return getCloudbaseApp();
  }

  async upload(bucket: string, path: string, file: File | Blob): Promise<QueryResult<{ url: string; path: string }>> {
    try {
      const app = await this.getApp();
      
      // Cloudbase 云存储路径格式
      const cloudPath = `${bucket}/${path}`;
      
      // @ts-ignore - uploadFile API
      const result = await app.uploadFile({
        cloudPath,
        filePath: file,
      });
      
      // 获取文件下载链接
      // @ts-ignore - getTempFileURL API
      const urlResult = await app.getTempFileURL({
        fileList: [result.fileID],
      });
      
      return { 
        data: { 
          url: urlResult.fileList?.[0]?.tempFileURL || '', 
          path: cloudPath 
        }, 
        error: null 
      };
    } catch (error: any) {
      return { data: null, error: new Error(error.message || 'File upload failed') };
    }
  }

  async getUrl(bucket: string, path: string): Promise<string> {
    try {
      const app = await this.getApp();
      const cloudPath = `${bucket}/${path}`;
      
      // @ts-ignore - getTempFileURL API
      const result = await app.getTempFileURL({
        fileList: [cloudPath],
      });
      
      return result.fileList?.[0]?.tempFileURL || '';
    } catch (error) {
      console.error('[Cloudbase Storage] Get URL failed:', error);
      return '';
    }
  }

  async delete(bucket: string, path: string): Promise<{ error: Error | null }> {
    try {
      const app = await this.getApp();
      const cloudPath = `${bucket}/${path}`;
      
      // @ts-ignore - deleteFile API
      await app.deleteFile({
        fileList: [cloudPath],
      });
      
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || 'File delete failed') };
    }
  }

  async list(bucket: string, path?: string): Promise<ListResult<{ name: string; url: string }>> {
    try {
      // Cloudbase 云存储不直接支持列出文件
      // 需要在数据库中维护文件索引或使用云函数
      console.warn('[Cloudbase Storage] List files not directly supported, use database index instead');
      
      return { data: [], error: null };
    } catch (error: any) {
      return { data: null, error: new Error(error.message || 'List files failed') };
    }
  }
}

