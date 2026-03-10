// types/supabase.ts
// This is a placeholder for your generated types
// You should generate complete types from your Supabase schema
// using the Supabase CLI: npx supabase gen types typescript --project-id your-project-id

export type Database = {
  public: {
    Tables: {
      messages: {
        Row: {
          id: string;
          channel_id: string;
          sender_id: string;
          content: string | null;
          created_at: string;
          updated_at: string | null;
          is_edited: boolean;
          attachments: any[] | null;
        };
        Insert: {
          id?: string;
          channel_id: string;
          sender_id: string;
          content?: string | null;
          created_at?: string;
          updated_at?: string | null;
          is_edited?: boolean;
          attachments?: any[] | null;
        };
        Update: {
          id?: string;
          channel_id?: string;
          sender_id?: string;
          content?: string | null;
          created_at?: string;
          updated_at?: string | null;
          is_edited?: boolean;
          attachments?: any[] | null;
        };
      };
      // Add other tables as needed
    };
    Views: {
      // Add views here if you have any
    };
    Functions: {
      get_channel_messages: {
        Args: {
          p_channel_id: string;
          p_user_id: string;
          p_limit: number;
          p_before_id: string | null;
        };
        Returns: {
          message_id: string;
          content: string | null;
          created_at: string;
          sender_id: string;
          sender_name: string;
          sender_email: string;
          sender_avatar_url: string | null;
          is_edited: boolean;
          reactions: any[] | null;
          attachments: any[] | null;
        }[];
      };
      // Add other functions as needed
    };
    Enums: {
      // Add enums here if you have any
    };
  };
};