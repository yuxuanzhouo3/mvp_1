/**
 * 统一的数据库客户端获取函数
 * Unified Database Client Helper
 * 
 * 为 API 路由提供统一的数据库访问接口，自动处理 CN/INTL 环境差异
 */

import { isChinaDeployment } from '@/lib/config/deployment.config';
import { createRouteHandlerClient as createSupabaseClient, createServiceClient as createSupabaseServiceClient } from '@/lib/supabase/server';

// CN 环境 Cloudbase 适配器类型
interface CloudbaseAdapter {
  from(table: string): any;
  auth: {
    getUser(): Promise<{ data: { user: { id: string; email?: string } | null }; error: Error | null }>;
    getSession(): Promise<{ data: { session: any }; error: Error | null }>;
  };
}

// Cloudbase 应用实例缓存
let cloudbaseApp: any = null;
let cloudbaseAdapter: CloudbaseAdapter | null = null;

/**
 * 获取 Cloudbase 适配器（内部使用）
 */
async function getCloudbaseAdapter(): Promise<CloudbaseAdapter> {
  if (cloudbaseAdapter) {
    return cloudbaseAdapter;
  }

  // 动态导入 Cloudbase SDK
  try {
    // @ts-ignore
    const cloudbase = await import('@cloudbase/node-sdk');
    cloudbaseApp = cloudbase.init({
      env: process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || '',
      secretId: process.env.CLOUDBASE_SECRET_ID,
      secretKey: process.env.CLOUDBASE_SECRET_KEY,
    });
  } catch (error) {
    console.error('[Cloudbase] Failed to initialize:', error);
    throw new Error('Cloudbase SDK not available');
  }

  const db = cloudbaseApp.database();
  const _ = db.command;

  // 创建 Cloudbase 查询构建器
  class QueryBuilder {
    private collection: any;
    private tableName: string;
    private filters: any = {};
    private deferredFilters: any = {}; // 延迟过滤（用于需要合并 users 表后才能过滤的字段）
    private orderByField: string | null = null;
    private orderDirection: 'asc' | 'desc' = 'asc';
    private limitCount: number | null = null;
    private skipCount: number = 0;
    private selectFields: string = '*';
    private countMode: boolean = false;

    constructor(tableName: string) {
      this.tableName = tableName;
      this.collection = db.collection(this.mapTableName(tableName));
    }

    private mapTableName(name: string): string {
      // 视图映射到实际集合
      const tableMapping: Record<string, string> = {
        'v_user_full_profile': 'user_profiles',
        'v_active_users': 'user_profiles',
      };
      return tableMapping[name] || name;
    }

    // 判断字段是否在 users 表中（对于视图查询需要延迟过滤）
    private isUserTableField(field: string): boolean {
      const userTableFields = ['gender', 'birth_date', 'account_status', 'is_active', 'username', 'avatar_url'];
      return userTableFields.includes(field);
    }

    // 根据表名映射字段名（处理视图字段映射）
    private mapFieldName(field: string): string {
      // 对于 user_profiles 表，id 应该映射到 user_id
      if (this.tableName === 'v_user_full_profile' || this.tableName === 'v_active_users') {
        if (field === 'id') {
          return 'user_id';
        }
      }
      // 对于 users 表，id 字段保持不变（用户 ID 存储在 id 字段中，不是 _id）
      if (this.tableName === 'users' && field === 'id') {
        return 'id';
      }
      // 默认将 id 映射到 _id（Cloudbase 主键）
      if (field === 'id') {
        return '_id';
      }
      return field;
    }

    select(columns: string = '*', options?: { count?: 'exact' }) {
      this.selectFields = columns;
      if (options?.count === 'exact') {
        this.countMode = true;
      }
      return this;
    }

    eq(column: string, value: any) {
      // 对于视图查询，users 表字段需要延迟过滤
      if ((this.tableName === 'v_user_full_profile' || this.tableName === 'v_active_users') && this.isUserTableField(column)) {
        this.deferredFilters[column] = { op: 'eq', value };
      } else {
        this.filters[this.mapFieldName(column)] = value;
      }
      return this;
    }

    neq(column: string, value: any) {
      if ((this.tableName === 'v_user_full_profile' || this.tableName === 'v_active_users') && this.isUserTableField(column)) {
        this.deferredFilters[column] = { op: 'neq', value };
      } else {
        this.filters[this.mapFieldName(column)] = _.neq(value);
      }
      return this;
    }

    in(column: string, values: any[]) {
      this.filters[this.mapFieldName(column)] = _.in(values);
      return this;
    }

    gt(column: string, value: any) {
      this.filters[this.mapFieldName(column)] = _.gt(value);
      return this;
    }

    gte(column: string, value: any) {
      this.filters[this.mapFieldName(column)] = _.gte(value);
      return this;
    }

    lt(column: string, value: any) {
      this.filters[this.mapFieldName(column)] = _.lt(value);
      return this;
    }

    lte(column: string, value: any) {
      this.filters[this.mapFieldName(column)] = _.lte(value);
      return this;
    }

    is(column: string, value: null) {
      this.filters[this.mapFieldName(column)] = _.eq(null);
      return this;
    }

    or(conditions: string) {
      // 解析 or 条件，如 "user_1.eq.xxx,user_2.eq.xxx"
      const orConditions: any[] = [];
      const parts = conditions.split(',');
      
      for (const part of parts) {
        const match = part.match(/^(\w+)\.(eq|neq)\.(.+)$/);
        if (match) {
          const [, col, op, val] = match;
          if (op === 'eq') {
            orConditions.push({ [col]: val });
          } else if (op === 'neq') {
            orConditions.push({ [col]: _.neq(val) });
          }
        }
      }
      
      if (orConditions.length > 0) {
        this.filters['$or'] = orConditions;
      }
      return this;
    }

    order(column: string, options?: { ascending?: boolean }) {
      this.orderByField = this.mapFieldName(column);
      this.orderDirection = options?.ascending === false ? 'desc' : 'asc';
      return this;
    }

    limit(count: number) {
      this.limitCount = count;
      return this;
    }

    range(from: number, to: number) {
      this.skipCount = from;
      this.limitCount = to - from + 1;
      return this;
    }

    async single() {
      const result = await this.execute();
      return {
        data: result.data?.[0] || null,
        error: result.error,
      };
    }

    async execute() {
      try {
        let query = this.collection;

        // 对于 v_active_users 视图，添加必要的过滤条件
        const baseFilters = { ...this.filters };
        if (this.tableName === 'v_active_users') {
          // 模拟 SQL 视图的 WHERE 条件：
          // account_status = 'active' (在 users 表，后续过滤)
          // gender IS NOT NULL (在 users 表，后续过滤)
          // birth_date IS NOT NULL (在 users 表，后续过滤)
          // total_score IS NOT NULL -> market_value_score 存在
          baseFilters['market_value_score'] = _.exists(true);
        }

        // 应用过滤条件
        if (Object.keys(baseFilters).length > 0) {
          query = query.where(baseFilters);
        }

        // 应用排序
        if (this.orderByField) {
          query = query.orderBy(this.orderByField, this.orderDirection);
        }

        // 应用分页
        if (this.skipCount > 0) {
          query = query.skip(this.skipCount);
        }
        if (this.limitCount !== null) {
          query = query.limit(this.limitCount);
        }

        const result = await query.get();

        // 对于视图查询，需要从 users 表获取额外字段并合并
        let usersMap: Map<string, any> = new Map();
        if ((this.tableName === 'v_user_full_profile' || this.tableName === 'v_active_users') && result.data?.length > 0) {
          const userIds = result.data.map((doc: any) => doc.user_id).filter(Boolean);
          if (userIds.length > 0) {
            const usersCollection = db.collection('users');
            const usersResult = await usersCollection.where({ id: _.in(userIds) }).get();
            for (const user of usersResult.data || []) {
              usersMap.set(user.id, user);
            }
          }
        }

        // 转换字段名
        let data = (result.data || []).map((doc: any) => {
          const transformed = { ...doc };

          // 对于 user_profiles 视图，将 user_id 转换为 id，并合并 users 表数据
          if (this.tableName === 'v_user_full_profile' || this.tableName === 'v_active_users') {
            if (doc.user_id && !doc.id) {
              transformed.id = doc.user_id;
            }
            // 从 users 表合并 gender 和 birth_date
            const userData = usersMap.get(doc.user_id);
            if (userData) {
              if (!transformed.gender && userData.gender) {
                transformed.gender = userData.gender;
              }
              if (!transformed.birth_date && userData.birth_date) {
                transformed.birth_date = userData.birth_date;
              }
              if (!transformed.username && userData.username) {
                transformed.username = userData.username;
              }
              if (!transformed.avatar_url && userData.avatar_url) {
                transformed.avatar_url = userData.avatar_url;
              }
              // account_status 映射：CN 环境用 is_active，INTL 环境用 account_status
              if (!transformed.account_status) {
                if (userData.account_status) {
                  transformed.account_status = userData.account_status;
                } else if (userData.is_active !== undefined) {
                  // CN 环境：is_active=true 映射为 account_status='active'
                  transformed.account_status = userData.is_active ? 'active' : 'inactive';
                }
              }
            }
          } else {
            // 其他表：将 _id 转换为 id
            if (doc._id && !doc.id) {
              transformed.id = doc._id;
            }
          }

          // 视图字段映射
          if (this.tableName.startsWith('v_')) {
            if (doc.market_value_score !== undefined) {
              transformed.total_score = doc.market_value_score;
            }
            if (doc.location?.city) {
              transformed.city_name = doc.location.city;
            }
          }
          return transformed;
        });

        // 对于 v_active_users 视图，应用额外的过滤条件（模拟 SQL 视图的 WHERE 子句）
        if (this.tableName === 'v_active_users') {
          data = data.filter((doc: any) => {
            // account_status = 'active'
            if (doc.account_status && doc.account_status !== 'active') return false;
            // gender IS NOT NULL
            if (!doc.gender) return false;
            // birth_date IS NOT NULL
            if (!doc.birth_date) return false;
            // total_score IS NOT NULL (已在查询时过滤 market_value_score)
            return true;
          });
        }

        // 应用延迟过滤（users 表字段的过滤条件）
        if (Object.keys(this.deferredFilters).length > 0) {
          data = data.filter((doc: any) => {
            for (const [field, condition] of Object.entries(this.deferredFilters)) {
              const { op, value } = condition as { op: string; value: any };
              const docValue = doc[field];
              if (op === 'eq' && docValue !== value) return false;
              if (op === 'neq' && docValue === value) return false;
            }
            return true;
          });
        }

        // 获取总数
        let count: number | undefined;
        if (this.countMode) {
          const countQuery = Object.keys(this.filters).length > 0
            ? this.collection.where(this.filters)
            : this.collection;
          const countResult = await countQuery.count();
          count = countResult.total;
        }

        return { data, error: null, count };
      } catch (error: any) {
        console.error('[Cloudbase Query] Error:', error);
        return { data: null, error: new Error(error.message || 'Query failed') };
      }
    }

    // 支持 Promise 链式调用
    then(resolve: any, reject?: any) {
      return this.execute().then(resolve, reject);
    }

    // 插入数据
    async insert(data: any) {
      try {
        const insertData = Array.isArray(data) ? data : [data];
        const results: any[] = [];

        for (const item of insertData) {
          // 验证数据不为空（排除 id, created_at, updated_at 后检查）
          const dataKeys = Object.keys(item).filter(
            k => !['id', 'created_at', 'updated_at'].includes(k) && item[k] !== undefined && item[k] !== null
          );
          if (dataKeys.length === 0) {
            console.warn('[Cloudbase Insert] Skipping empty data');
            continue;
          }

          const preparedData = { ...item };
          // 如果提供了 id，转换为 _id（Cloudbase 使用 _id 作为主键）
          if (preparedData.id) {
            preparedData._id = preparedData.id;
          }
          delete preparedData.id;
          preparedData.created_at = preparedData.created_at || new Date().toISOString();
          preparedData.updated_at = new Date().toISOString();

          const result = await this.collection.add(preparedData);
          const doc = await this.collection.doc(result.id).get();
          if (doc.data?.[0]) {
            const transformed = { ...doc.data[0], id: doc.data[0]._id };
            results.push(transformed);
          }
        }

        return { data: results, error: null };
      } catch (error: any) {
        return { data: null, error: new Error(error.message || 'Insert failed') };
      }
    }

    // 更新数据
    async update(data: any) {
      try {
        const updateData = { ...data };
        delete updateData.id;
        updateData.updated_at = new Date().toISOString();

        if (Object.keys(this.filters).length > 0) {
          await this.collection.where(this.filters).update(updateData);
          const docs = await this.collection.where(this.filters).get();
          const results = (docs.data || []).map((doc: any) => ({ ...doc, id: doc._id }));
          return { data: results, error: null };
        }

        return { data: null, error: new Error('No filter specified for update') };
      } catch (error: any) {
        return { data: null, error: new Error(error.message || 'Update failed') };
      }
    }

    // 删除数据
    async delete() {
      try {
        if (Object.keys(this.filters).length > 0) {
          await this.collection.where(this.filters).remove();
          return { data: null, error: null };
        }
        return { data: null, error: new Error('No filter specified for delete') };
      } catch (error: any) {
        return { data: null, error: new Error(error.message || 'Delete failed') };
      }
    }

    // Upsert 数据
    async upsert(data: any, options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
      try {
        const insertData = Array.isArray(data) ? data : [data];
        const results: any[] = [];

        for (const item of insertData) {
          // 验证数据不为空
          const dataKeys = Object.keys(item).filter(k => item[k] !== undefined && item[k] !== null);
          if (dataKeys.length === 0) {
            console.warn('[Cloudbase Upsert] Skipping empty data');
            continue;
          }

          let existing = null;

          // 检查是否存在
          if (options?.onConflict) {
            const conflictFields = options.onConflict.split(',');
            const whereConditions: Record<string, any> = {};
            for (const field of conflictFields) {
              const trimmedField = field.trim();
              if (item[trimmedField] !== undefined && item[trimmedField] !== null) {
                // 将 id 字段转换为 _id（Cloudbase 使用 _id 作为主键）
                const dbField = trimmedField === 'id' ? '_id' : trimmedField;
                whereConditions[dbField] = item[trimmedField];
              }
            }
            // 只有当所有冲突字段都有值时才查询
            if (Object.keys(whereConditions).length === conflictFields.length) {
              const existingResult = await this.collection.where(whereConditions).limit(1).get();
              existing = existingResult.data?.[0];
            } else {
              console.warn('[Cloudbase Upsert] Missing conflict field values, skipping. Fields:', conflictFields, 'Item keys:', Object.keys(item));
              continue;
            }
          }

          if (existing) {
            if (!options?.ignoreDuplicates) {
              // 更新
              const updateData = { ...item };
              delete updateData.id;
              updateData.updated_at = new Date().toISOString();
              await this.collection.doc(existing._id).update(updateData);
              const doc = await this.collection.doc(existing._id).get();
              if (doc.data?.[0]) {
                results.push({ ...doc.data[0], id: doc.data[0]._id });
              }
            }
          } else {
            // 插入
            const preparedData = { ...item };
            // 如果提供了 id，转换为 _id（Cloudbase 使用 _id 作为主键）
            if (preparedData.id) {
              preparedData._id = preparedData.id;
            }
            delete preparedData.id;
            preparedData.created_at = preparedData.created_at || new Date().toISOString();
            preparedData.updated_at = new Date().toISOString();
            const result = await this.collection.add(preparedData);
            const doc = await this.collection.doc(result.id).get();
            if (doc.data?.[0]) {
              results.push({ ...doc.data[0], id: doc.data[0]._id });
            }
          }
        }

        return { data: results, error: null };
      } catch (error: any) {
        return { data: null, error: new Error(error.message || 'Upsert failed') };
      }
    }
  }

  // 创建带插入/更新/删除方法的表访问器
  function createTableAccessor(tableName: string) {
    const builder = new QueryBuilder(tableName);
    
    return {
      select: builder.select.bind(builder),
      eq: builder.eq.bind(builder),
      neq: builder.neq.bind(builder),
      in: builder.in.bind(builder),
      gt: builder.gt.bind(builder),
      gte: builder.gte.bind(builder),
      lt: builder.lt.bind(builder),
      lte: builder.lte.bind(builder),
      is: builder.is.bind(builder),
      or: builder.or.bind(builder),
      order: builder.order.bind(builder),
      limit: builder.limit.bind(builder),
      range: builder.range.bind(builder),
      single: builder.single.bind(builder),
      then: builder.then.bind(builder),
      insert: (data: any) => {
        const b = new QueryBuilder(tableName);
        return {
          select: () => ({
            single: () => b.insert(data).then((r: any) => ({ data: r.data?.[0] || null, error: r.error })),
            then: (resolve: any) => b.insert(data).then(resolve),
          }),
          single: () => b.insert(data).then((r: any) => ({ data: r.data?.[0] || null, error: r.error })),
          then: (resolve: any) => b.insert(data).then(resolve),
        };
      },
      update: (data: any) => {
        const b = new QueryBuilder(tableName);
        const createChain = () => ({
          eq: (column: string, value: any) => {
            b.eq(column, value);
            return createChain();
          },
          select: () => ({
            single: () => b.update(data).then((r: any) => ({ data: r.data?.[0] || null, error: r.error })),
            then: (resolve: any) => b.update(data).then(resolve),
          }),
          single: () => b.update(data).then((r: any) => ({ data: r.data?.[0] || null, error: r.error })),
          then: (resolve: any) => b.update(data).then(resolve),
        });
        return createChain();
      },
      delete: () => {
        return {
          eq: (column: string, value: any) => {
            const b = new QueryBuilder(tableName);
            b.eq(column, value);
            return {
              then: (resolve: any) => b.delete().then(resolve),
            };
          },
        };
      },
      upsert: (data: any, options?: { onConflict?: string; ignoreDuplicates?: boolean }) => {
        const b = new QueryBuilder(tableName);
        return {
          select: (columns?: string) => ({
            then: (resolve: any) => b.upsert(data, options).then(resolve),
          }),
          then: (resolve: any) => b.upsert(data, options).then(resolve),
        };
      },
    };
  }

  cloudbaseAdapter = {
    from: createTableAccessor,
    auth: {
      async getUser() {
        try {
          // 从请求头或 cookie 获取用户信息
          // CN 环境通过 Cloudbase 认证或微信登录获取用户
          const auth = cloudbaseApp.auth();
          const currentUser = auth.currentUser;
          
          if (!currentUser) {
            return { data: { user: null }, error: null };
          }
          
          return {
            data: {
              user: {
                id: currentUser.uid,
                email: currentUser.email,
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
      },
      async getSession() {
        try {
          const auth = cloudbaseApp.auth();
          const loginState = await auth.getLoginState();
          
          return {
            data: {
              session: loginState ? { access_token: loginState.credential?.accessToken } : null,
            },
            error: null,
          };
        } catch (error: any) {
          return {
            data: { session: null },
            error: new Error(error.message || 'Failed to get session'),
          };
        }
      },
    },
  };

  return cloudbaseAdapter;
}

/**
 * 获取数据库客户端
 * 
 * 用法示例:
 * ```typescript
 * const supabase = await getDbClient();
 * const { data, error } = await supabase
 *   .from('users')
 *   .select('*')
 *   .eq('id', userId)
 *   .single();
 * ```
 */
export async function getDbClient(): Promise<any> {
  if (isChinaDeployment()) {
    return getCloudbaseAdapter();
  }
  return createSupabaseClient();
}

/**
 * 获取服务端数据库客户端（绕过 RLS）
 * 用于 Webhook、后台任务等场景
 */
export async function getServiceDbClient(): Promise<any> {
  if (isChinaDeployment()) {
    return getCloudbaseAdapter();
  }
  return createSupabaseServiceClient();
}

/**
 * 同步版本的数据库客户端获取函数
 * 仅适用于 INTL 环境
 */
export function getDbClientSync() {
  if (isChinaDeployment()) {
    throw new Error('CN environment requires async client. Use getDbClient() instead.');
  }
  return createSupabaseClient();
}

/**
 * 重新导出环境检测函数
 */
export { isChinaDeployment };

/**
 * 从请求中获取用户信息（支持 CN 和 INTL 环境）
 * 用于 API 路由的统一认证
 */
export async function authenticateRequest(
  request: Request,
  supabaseAdmin?: any
): Promise<{ id: string; email?: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];

  if (isChinaDeployment()) {
    const { verifySessionToken } = await import('@/lib/auth/session');
    const verified = await verifySessionToken(token);
    if (!verified.ok) return null;
    return { id: verified.value.userId, email: verified.value.email };
  } else {
    // INTL 环境: 使用 Supabase 验证 token
    if (!supabaseAdmin) {
      const { createClient } = await import('@supabase/supabase-js');
      supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
    }
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return { id: user.id, email: user.email };
  }
}






















