import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('缺少 Supabase 環境變數');
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    realtime: {
      log_level: 'info',
    },
  }
);

// 資料庫類型定義
export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string;
          name: string;
          organizer_address: string;
          token_address: string;
          token_symbol: string;
          token_reward_per_question: number;
          total_staked: number;
          status: 'waiting' | 'active' | 'completed';
          current_question_index: number;
          start_time: string | null;
          end_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          organizer_address: string;
          token_address: string;
          token_symbol?: string;
          token_reward_per_question: number;
          total_staked: number;
          status?: 'waiting' | 'active' | 'completed';
          current_question_index?: number;
          start_time?: string | null;
          end_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          organizer_address?: string;
          token_address?: string;
          token_symbol?: string;
          token_reward_per_question?: number;
          total_staked?: number;
          status?: 'waiting' | 'active' | 'completed';
          current_question_index?: number;
          start_time?: string | null;
          end_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          game_id: string;
          question_text: string;
          options: string[];
          correct_answer: number;
          time_limit: number;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          question_text: string;
          options: string[];
          correct_answer: number;
          time_limit?: number;
          order_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          question_text?: string;
          options?: string[];
          correct_answer?: number;
          time_limit?: number;
          order_index?: number;
          created_at?: string;
        };
      };
      participants: {
        Row: {
          id: string;
          game_id: string;
          wallet_address: string;
          name: string;
          score: number;
          tokens_earned: number;
          joined_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          wallet_address: string;
          name: string;
          score?: number;
          tokens_earned?: number;
          joined_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          wallet_address?: string;
          name?: string;
          score?: number;
          tokens_earned?: number;
          joined_at?: string;
        };
      };
      answers: {
        Row: {
          id: string;
          participant_id: string;
          question_id: string;
          selected_option: number;
          time_to_answer: number;
          is_correct: boolean;
          answered_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          question_id: string;
          selected_option: number;
          time_to_answer: number;
          is_correct?: boolean;
          answered_at?: string;
        };
        Update: {
          id?: string;
          participant_id?: string;
          question_id?: string;
          selected_option?: number;
          time_to_answer?: number;
          is_correct?: boolean;
          answered_at?: string;
        };
      };
      token_transactions: {
        Row: {
          id: string;
          game_id: string;
          participant_id: string | null;
          transaction_hash: string | null;
          amount: number;
          transaction_type: 'stake' | 'reward';
          status: 'pending' | 'confirmed' | 'failed';
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          participant_id?: string | null;
          transaction_hash?: string | null;
          amount: number;
          transaction_type: 'stake' | 'reward';
          status?: 'pending' | 'confirmed' | 'failed';
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          participant_id?: string | null;
          transaction_hash?: string | null;
          amount?: number;
          transaction_type?: 'stake' | 'reward';
          status?: 'pending' | 'confirmed' | 'failed';
          created_at?: string;
        };
      };
    };
  };
}

// 輔助函數
export const getGameWithDetails = async (gameId: string) => {
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      questions (*),
      participants (*),
      token_transactions (*)
    `)
    .eq('id', gameId)
    .single();

  if (error) throw error;
  return data;
};

export const subscribeToGameUpdates = (gameId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`game-updates-${gameId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`,
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `game_id=eq.${gameId}`,
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'answers',
      },
      callback
    )
    .subscribe();
};