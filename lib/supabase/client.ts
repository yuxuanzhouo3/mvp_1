import { createClient } from '@supabase/supabase-js';

// Check if we're in mock mode (for build/deployment without real Supabase)
const isMockMode = process.env.NODE_ENV === 'production' && 
  (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
   process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_url_here');

const supabaseUrl = isMockMode ? 'https://mock.supabase.co' : process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = isMockMode ? 'mock-key' : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          interests: string[] | null;
          communication_style: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          interests?: string[] | null;
          communication_style?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          interests?: string[] | null;
          communication_style?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          compatibility_score: number;
          match_reasons: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          compatibility_score: number;
          match_reasons?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          compatibility_score?: number;
          match_reasons?: string[] | null;
          created_at?: string;
        };
      };
      chats: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_id: string;
          content: string;
          message_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_id: string;
          content: string;
          message_type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          sender_id?: string;
          content?: string;
          message_type?: string;
          created_at?: string;
        };
      };
    };
  };
}; 