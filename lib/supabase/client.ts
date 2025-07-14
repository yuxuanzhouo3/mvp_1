import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bamratexknmqvdbalzen.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbXJhdGV4a25tcXZkYmFsemVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MTM4NzEsImV4cCI6MjA2ODA4OTg3MX0.yYa98ioJLLouUgHWITGb7U_VjNCTUuM-5NcraM7f3zA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// 数据库类型定义
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          location: string | null
          age: number | null
          gender: 'male' | 'female' | 'other' | null
          interests: string[] | null
          industry: string | null
          communication_style: 'introvert' | 'extrovert' | 'ambivert' | null
          personality_traits: string[] | null
          credits: number
          membership_level: 'free' | 'premium' | 'vip'
          is_verified: boolean
          is_online: boolean
          last_seen: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          location?: string | null
          age?: number | null
          gender?: 'male' | 'female' | 'other' | null
          interests?: string[] | null
          industry?: string | null
          communication_style?: 'introvert' | 'extrovert' | 'ambivert' | null
          personality_traits?: string[] | null
          credits?: number
          membership_level?: 'free' | 'premium' | 'vip'
          is_verified?: boolean
          is_online?: boolean
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          location?: string | null
          age?: number | null
          gender?: 'male' | 'female' | 'other' | null
          interests?: string[] | null
          industry?: string | null
          communication_style?: 'introvert' | 'extrovert' | 'ambivert' | null
          personality_traits?: string[] | null
          credits?: number
          membership_level?: 'free' | 'premium' | 'vip'
          is_verified?: boolean
          is_online?: boolean
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          user_id: string
          match_id: string
          score: number | null
          reasons: string[] | null
          status: 'pending' | 'accepted' | 'rejected' | 'expired'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          match_id: string
          score?: number | null
          reasons?: string[] | null
          status?: 'pending' | 'accepted' | 'rejected' | 'expired'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          match_id?: string
          score?: number | null
          reasons?: string[] | null
          status?: 'pending' | 'accepted' | 'rejected' | 'expired'
          created_at?: string
          updated_at?: string
        }
      }
      user_likes: {
        Row: {
          id: string
          user_id: string
          liked_user_id: string
          action: 'like' | 'pass' | 'super_like'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          liked_user_id: string
          action: 'like' | 'pass' | 'super_like'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          liked_user_id?: string
          action?: 'like' | 'pass' | 'super_like'
          created_at?: string
        }
      }
      chats: {
        Row: {
          id: string
          participants: string[]
          last_message: string | null
          last_message_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participants: string[]
          last_message?: string | null
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          participants?: string[]
          last_message?: string | null
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          sender_id: string
          content: string
          type: 'text' | 'image' | 'file' | 'audio' | 'video'
          status: 'sending' | 'sent' | 'delivered' | 'read'
          metadata: any | null
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          sender_id: string
          content: string
          type?: 'text' | 'image' | 'file' | 'audio' | 'video'
          status?: 'sending' | 'sent' | 'delivered' | 'read'
          metadata?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          sender_id?: string
          content?: string
          type?: 'text' | 'image' | 'file' | 'audio' | 'video'
          status?: 'sending' | 'sent' | 'delivered' | 'read'
          metadata?: any | null
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: 'purchase' | 'refund' | 'bonus' | 'consumption'
          amount: number
          currency: string
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          payment_method: string | null
          reference: string | null
          metadata: any | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'purchase' | 'refund' | 'bonus' | 'consumption'
          amount: number
          currency?: string
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          payment_method?: string | null
          reference?: string | null
          metadata?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'purchase' | 'refund' | 'bonus' | 'consumption'
          amount?: number
          currency?: string
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          payment_method?: string | null
          reference?: string | null
          metadata?: any | null
          created_at?: string
        }
      }
      user_activities: {
        Row: {
          id: string
          user_id: string
          type: 'login' | 'logout' | 'profile_update' | 'match' | 'message' | 'payment'
          title: string
          description: string | null
          metadata: any | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'login' | 'logout' | 'profile_update' | 'match' | 'message' | 'payment'
          title: string
          description?: string | null
          metadata?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'login' | 'logout' | 'profile_update' | 'match' | 'message' | 'payment'
          title?: string
          description?: string | null
          metadata?: any | null
          created_at?: string
        }
      }
      system_settings: {
        Row: {
          id: string
          key: string
          value: any | null
          description: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value?: any | null
          description?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: any | null
          description?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_stats: {
        Args: {
          user_id: string
        }
        Returns: any
      }
      get_match_recommendations: {
        Args: {
          user_id: string
          limit_count?: number
        }
        Returns: {
          id: string
          full_name: string | null
          avatar_url: string | null
          age: number | null
          location: string | null
          bio: string | null
          compatibility: number
        }[]
      }
      get_chat_stats: {
        Args: {
          user_id: string
        }
        Returns: any
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T] 