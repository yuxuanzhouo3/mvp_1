/**
 * INTL 环境数据库服务实现 (Supabase)
 * INTL Environment Database Service Implementation
 */

import { createClient } from '@/lib/supabase/server';
import type { 
  IDatabaseService, 
  IRealtimeService,
  IStorageService,
  QueryOptions, 
  QueryResult, 
  ListResult 
} from './types';

/**
 * INTL 数据库服务 - 基于 Supabase
 */
export class IntlDatabaseService implements IDatabaseService {
  private getClient() {
    return createClient();
  }

  async get<T>(table: string, id: string): Promise<QueryResult<T>> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    
    return { data: data as T, error: error ? new Error(error.message) : null };
  }

  async query<T>(table: string, options?: QueryOptions): Promise<ListResult<T>> {
    const supabase = this.getClient();
    let query = supabase.from(table).select(options?.select || '*', { count: 'exact' });

    // 应用过滤条件
    if (options?.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // 应用排序
    if (options?.orderBy) {
      query = query.order(options.orderBy.column, { 
        ascending: options.orderBy.ascending ?? true 
      });
    }

    // 应用分页
    if (options?.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error, count } = await query;
    
    return { 
      data: data as T[], 
      error: error ? new Error(error.message) : null,
      count: count ?? undefined
    };
  }

  async findOne<T>(table: string, filter: Record<string, any>): Promise<QueryResult<T>> {
    const supabase = this.getClient();
    let query = supabase.from(table).select('*');

    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query.single();
    
    return { data: data as T, error: error ? new Error(error.message) : null };
  }

  async insert<T>(table: string, data: Partial<T>): Promise<QueryResult<T>> {
    const supabase = this.getClient();
    const { data: result, error } = await supabase
      .from(table)
      .insert(data as any)
      .select()
      .single();
    
    return { data: result as T, error: error ? new Error(error.message) : null };
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<QueryResult<T>> {
    const supabase = this.getClient();
    const { data: result, error } = await supabase
      .from(table)
      .update(data as any)
      .eq('id', id)
      .select()
      .single();
    
    return { data: result as T, error: error ? new Error(error.message) : null };
  }

  async updateWhere<T>(table: string, filter: Record<string, any>, data: Partial<T>): Promise<QueryResult<T>> {
    const supabase = this.getClient();
    let query = supabase.from(table).update(data as any);

    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data: result, error } = await query.select().single();
    
    return { data: result as T, error: error ? new Error(error.message) : null };
  }

  async delete(table: string, id: string): Promise<{ error: Error | null }> {
    const supabase = this.getClient();
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    return { error: error ? new Error(error.message) : null };
  }

  async batchInsert<T>(table: string, data: Partial<T>[]): Promise<ListResult<T>> {
    const supabase = this.getClient();
    const { data: result, error } = await supabase
      .from(table)
      .insert(data as any[])
      .select();
    
    return { data: result as T[], error: error ? new Error(error.message) : null };
  }

  async getCurrentUser(): Promise<QueryResult<{ id: string; email?: string }>> {
    const supabase = this.getClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { data: null, error: error ? new Error(error.message) : new Error('Not authenticated') };
    }
    
    return { data: { id: user.id, email: user.email }, error: null };
  }

  async getSession(): Promise<QueryResult<{ accessToken: string }>> {
    const supabase = this.getClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return { data: null, error: error ? new Error(error.message) : new Error('No session') };
    }
    
    return { data: { accessToken: session.access_token }, error: null };
  }
}

/**
 * INTL 实时服务 - 基于 Supabase Realtime
 */
export class IntlRealtimeService implements IRealtimeService {
  private getClient() {
    return createClient();
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
    const supabase = this.getClient();
    
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table,
          filter: Object.entries(filter)
            .map(([key, value]) => `${key}=eq.${value}`)
            .join(',')
        },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT':
              callbacks.onInsert?.(payload.new);
              break;
            case 'UPDATE':
              callbacks.onUpdate?.(payload.new);
              break;
            case 'DELETE':
              callbacks.onDelete?.(payload.old);
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  subscribeChannel(
    channel: string,
    callbacks: {
      onMessage?: (payload: any) => void;
      onPresence?: (payload: any) => void;
    }
  ): () => void {
    const supabase = this.getClient();
    
    const ch = supabase.channel(channel);
    
    if (callbacks.onMessage) {
      ch.on('broadcast', { event: 'message' }, ({ payload }) => {
        callbacks.onMessage?.(payload);
      });
    }

    if (callbacks.onPresence) {
      ch.on('presence', { event: 'sync' }, () => {
        callbacks.onPresence?.(ch.presenceState());
      });
    }

    ch.subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }

  async publish(channel: string, event: string, payload: any): Promise<void> {
    const supabase = this.getClient();
    
    const ch = supabase.channel(channel);
    await ch.send({
      type: 'broadcast',
      event,
      payload,
    });
  }
}

/**
 * INTL 存储服务 - 基于 Supabase Storage
 */
export class IntlStorageService implements IStorageService {
  private getClient() {
    return createClient();
  }

  async upload(bucket: string, path: string, file: File | Blob): Promise<QueryResult<{ url: string; path: string }>> {
    const supabase = this.getClient();
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true,
      });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { 
      data: { url: urlData.publicUrl, path: data.path }, 
      error: null 
    };
  }

  async getUrl(bucket: string, path: string): Promise<string> {
    const supabase = this.getClient();
    
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async delete(bucket: string, path: string): Promise<{ error: Error | null }> {
    const supabase = this.getClient();
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    return { error: error ? new Error(error.message) : null };
  }

  async list(bucket: string, path?: string): Promise<ListResult<{ name: string; url: string }>> {
    const supabase = this.getClient();
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path || '');

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const files = await Promise.all(
      (data || []).map(async (file) => {
        const url = await this.getUrl(bucket, path ? `${path}/${file.name}` : file.name);
        return { name: file.name, url };
      })
    );

    return { data: files, error: null };
  }
}

