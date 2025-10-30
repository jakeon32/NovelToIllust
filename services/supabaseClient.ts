import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types (will be expanded as we build the schema)
export interface Database {
  public: {
    Tables: {
      stories: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          novel_text: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          novel_text: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          novel_text?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      scenes: {
        Row: {
          id: string;
          story_id: string;
          description: string;
          shot_type: string;
          aspect_ratio: string;
          image_url: string | null;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          description: string;
          shot_type?: string;
          aspect_ratio?: string;
          image_url?: string | null;
          order_index: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string;
          description?: string;
          shot_type?: string;
          aspect_ratio?: string;
          image_url?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      characters: {
        Row: {
          id: string;
          story_id: string;
          name: string;
          image_url: string | null;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          name: string;
          image_url?: string | null;
          order_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string;
          name?: string;
          image_url?: string | null;
          order_index?: number;
          created_at?: string;
        };
      };
      backgrounds: {
        Row: {
          id: string;
          story_id: string;
          name: string;
          image_url: string;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          name: string;
          image_url: string;
          order_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string;
          name?: string;
          image_url?: string;
          order_index?: number;
          created_at?: string;
        };
      };
    };
  };
}
