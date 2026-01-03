export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      campaigns: {
        Row: {
          actions: Json | null
          body: string
          click_url: string | null
          clicked_count: number
          created_at: string
          delivered_count: number
          failed_count: number
          icon_url: string | null
          id: string
          image_url: string | null
          is_recurring: boolean
          name: string
          next_send_at: string | null
          recurrence_config: Json | null
          recurrence_pattern: string | null
          scheduled_at: string | null
          segment: string | null
          sent_count: number
          status: string
          target_browsers: string[] | null
          target_countries: string[] | null
          target_devices: string[] | null
          title: string
          updated_at: string
          user_id: string | null
          website_id: string
        }
        Insert: {
          actions?: Json | null
          body: string
          click_url?: string | null
          clicked_count?: number
          created_at?: string
          delivered_count?: number
          failed_count?: number
          icon_url?: string | null
          id?: string
          image_url?: string | null
          is_recurring?: boolean
          name: string
          next_send_at?: string | null
          recurrence_config?: Json | null
          recurrence_pattern?: string | null
          scheduled_at?: string | null
          segment?: string | null
          sent_count?: number
          status?: string
          target_browsers?: string[] | null
          target_countries?: string[] | null
          target_devices?: string[] | null
          title: string
          updated_at?: string
          user_id?: string | null
          website_id: string
        }
        Update: {
          actions?: Json | null
          body?: string
          click_url?: string | null
          clicked_count?: number
          created_at?: string
          delivered_count?: number
          failed_count?: number
          icon_url?: string | null
          id?: string
          image_url?: string | null
          is_recurring?: boolean
          name?: string
          next_send_at?: string | null
          recurrence_config?: Json | null
          recurrence_pattern?: string | null
          scheduled_at?: string | null
          segment?: string | null
          sent_count?: number
          status?: string
          target_browsers?: string[] | null
          target_countries?: string[] | null
          target_devices?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string | null
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          campaign_id: string | null
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          error_code: string | null
          error_message: string | null
          id: string
          platform: string | null
          retry_count: number
          sent_at: string | null
          status: string
          subscriber_id: string | null
          website_id: string
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          platform?: string | null
          retry_count?: number
          sent_at?: string | null
          status: string
          subscriber_id?: string | null
          website_id: string
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          platform?: string | null
          retry_count?: number
          sent_at?: string | null
          status?: string
          subscriber_id?: string | null
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          apns_token: string | null
          auth_key: string
          browser: string | null
          browser_version: string | null
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string
          custom_data: Json | null
          device_type: string | null
          endpoint: string
          fcm_token: string | null
          id: string
          language: string | null
          last_active_at: string | null
          os: string | null
          p256dh_key: string
          platform: string | null
          status: string
          tags: string[] | null
          timezone: string | null
          updated_at: string
          website_id: string
        }
        Insert: {
          apns_token?: string | null
          auth_key: string
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          custom_data?: Json | null
          device_type?: string | null
          endpoint: string
          fcm_token?: string | null
          id?: string
          language?: string | null
          last_active_at?: string | null
          os?: string | null
          p256dh_key: string
          platform?: string | null
          status?: string
          tags?: string[] | null
          timezone?: string | null
          updated_at?: string
          website_id: string
        }
        Update: {
          apns_token?: string | null
          auth_key?: string
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          custom_data?: Json | null
          device_type?: string | null
          endpoint?: string
          fcm_token?: string | null
          id?: string
          language?: string | null
          last_active_at?: string | null
          os?: string | null
          p256dh_key?: string
          platform?: string | null
          status?: string
          tags?: string[] | null
          timezone?: string | null
          updated_at?: string
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_limits: {
        Row: {
          billing_cycle_start: string
          created_at: string
          current_notifications_this_month: number
          current_recurring_notifications: number
          id: string
          max_notifications_per_month: number
          max_recurring_notifications: number
          max_subscribers_per_website: number
          max_websites: number
          plan: string
          plan_price_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle_start?: string
          created_at?: string
          current_notifications_this_month?: number
          current_recurring_notifications?: number
          id?: string
          max_notifications_per_month?: number
          max_recurring_notifications?: number
          max_subscribers_per_website?: number
          max_websites?: number
          plan?: string
          plan_price_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle_start?: string
          created_at?: string
          current_notifications_this_month?: number
          current_recurring_notifications?: number
          id?: string
          max_notifications_per_month?: number
          max_recurring_notifications?: number
          max_subscribers_per_website?: number
          max_websites?: number
          plan?: string
          plan_price_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      websites: {
        Row: {
          api_token: string
          created_at: string
          description: string | null
          id: string
          is_verified: boolean
          name: string
          notifications_sent: number
          status: string
          subscriber_count: number
          updated_at: string
          url: string
          user_id: string
          vapid_private_key: string
          vapid_public_key: string
        }
        Insert: {
          api_token: string
          created_at?: string
          description?: string | null
          id: string
          is_verified?: boolean
          name: string
          notifications_sent?: number
          status?: string
          subscriber_count?: number
          updated_at?: string
          url: string
          user_id: string
          vapid_private_key: string
          vapid_public_key: string
        }
        Update: {
          api_token?: string
          created_at?: string
          description?: string | null
          id?: string
          is_verified?: boolean
          name?: string
          notifications_sent?: number
          status?: string
          subscriber_count?: number
          updated_at?: string
          url?: string
          user_id?: string
          vapid_private_key?: string
          vapid_public_key?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_create_recurring_notification: {
        Args: { _user_id: string }
        Returns: boolean
      }
      get_recurring_notification_count: {
        Args: { _user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "admin" | "editor" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "editor", "viewer"],
    },
  },
} as const
