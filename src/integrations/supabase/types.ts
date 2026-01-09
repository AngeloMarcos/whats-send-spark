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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_error_reports: {
        Row: {
          component_stack: string | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          route: string
          source: string
          stack: string | null
          user_id: string
        }
        Insert: {
          component_stack?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          route: string
          source?: string
          stack?: string | null
          user_id: string
        }
        Update: {
          component_stack?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          route?: string
          source?: string
          stack?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      campaign_logs: {
        Row: {
          campaign_id: string
          contact_name: string | null
          contact_phone: string
          created_at: string | null
          error_message: string | null
          id: string
          is_test: boolean | null
          message_sent: string | null
          processing_time_ms: number | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          contact_name?: string | null
          contact_phone: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_test?: boolean | null
          message_sent?: string | null
          processing_time_ms?: number | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          contact_name?: string | null
          contact_phone?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_test?: boolean | null
          message_sent?: string | null
          processing_time_ms?: number | null
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      campaign_queue: {
        Row: {
          campaign_id: string
          contact_data: Json | null
          contact_name: string | null
          contact_phone: string
          created_at: string
          error_message: string | null
          id: string
          last_retry_at: string | null
          retry_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          contact_data?: Json | null
          contact_name?: string | null
          contact_phone: string
          created_at?: string
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          contact_data?: Json | null
          contact_name?: string | null
          contact_phone?: string
          created_at?: string
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "contact_send_history"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      campaigns: {
        Row: {
          completed_at: string | null
          contacts_failed: number | null
          contacts_sent: number | null
          contacts_total: number | null
          created_at: string
          error_message: string | null
          execution_id: string | null
          id: string
          is_test_mode: boolean | null
          list_id: string | null
          message: string
          name: string
          scheduled_at: string | null
          send_interval_minutes: number | null
          send_limit: number | null
          send_now: boolean | null
          status: Database["public"]["Enums"]["campaign_status"]
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          contacts_failed?: number | null
          contacts_sent?: number | null
          contacts_total?: number | null
          created_at?: string
          error_message?: string | null
          execution_id?: string | null
          id?: string
          is_test_mode?: boolean | null
          list_id?: string | null
          message: string
          name: string
          scheduled_at?: string | null
          send_interval_minutes?: number | null
          send_limit?: number | null
          send_now?: boolean | null
          status?: Database["public"]["Enums"]["campaign_status"]
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          contacts_failed?: number | null
          contacts_sent?: number | null
          contacts_total?: number | null
          created_at?: string
          error_message?: string | null
          execution_id?: string | null
          id?: string
          is_test_mode?: boolean | null
          list_id?: string | null
          message?: string
          name?: string
          scheduled_at?: string | null
          send_interval_minutes?: number | null
          send_limit?: number | null
          send_now?: boolean | null
          status?: Database["public"]["Enums"]["campaign_status"]
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          extra_data: Json | null
          id: string
          is_valid: boolean | null
          list_id: string
          name: string | null
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          extra_data?: Json | null
          id?: string
          is_valid?: boolean | null
          list_id: string
          name?: string | null
          phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          extra_data?: Json | null
          id?: string
          is_valid?: boolean | null
          list_id?: string
          name?: string | null
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          atividade: string | null
          atividades_secundarias: Json | null
          bairro: string | null
          capital_social: string | null
          cep: string | null
          cnpj: string | null
          complemento: string | null
          created_at: string | null
          data_abertura: string | null
          email: string | null
          endereco: string | null
          extra_data: Json | null
          id: string
          list_id: string | null
          lista_captura_id: string | null
          logradouro: string | null
          municipio: string | null
          nome: string | null
          nome_fantasia: string | null
          numero: string | null
          owner_name: string | null
          porte_empresa: string | null
          razao_social: string | null
          regime_tributario: string | null
          situacao: string | null
          socios: Json | null
          source: string | null
          status: string | null
          telefones: string
          telefones_array: Json | null
          tipo: string | null
          uf: string | null
          updated_at: string | null
          user_id: string
          whatsapp_links: Json | null
        }
        Insert: {
          atividade?: string | null
          atividades_secundarias?: Json | null
          bairro?: string | null
          capital_social?: string | null
          cep?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string | null
          data_abertura?: string | null
          email?: string | null
          endereco?: string | null
          extra_data?: Json | null
          id?: string
          list_id?: string | null
          lista_captura_id?: string | null
          logradouro?: string | null
          municipio?: string | null
          nome?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          owner_name?: string | null
          porte_empresa?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          situacao?: string | null
          socios?: Json | null
          source?: string | null
          status?: string | null
          telefones: string
          telefones_array?: Json | null
          tipo?: string | null
          uf?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp_links?: Json | null
        }
        Update: {
          atividade?: string | null
          atividades_secundarias?: Json | null
          bairro?: string | null
          capital_social?: string | null
          cep?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string | null
          data_abertura?: string | null
          email?: string | null
          endereco?: string | null
          extra_data?: Json | null
          id?: string
          list_id?: string | null
          lista_captura_id?: string | null
          logradouro?: string | null
          municipio?: string | null
          nome?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          owner_name?: string | null
          porte_empresa?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          situacao?: string | null
          socios?: Json | null
          source?: string | null
          status?: string | null
          telefones?: string
          telefones_array?: Json | null
          tipo?: string | null
          uf?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp_links?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_lista_captura_id_fkey"
            columns: ["lista_captura_id"]
            isOneToOne: false
            referencedRelation: "listas_captura"
            referencedColumns: ["id"]
          },
        ]
      }
      listas_captura: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          total_leads: number | null
          total_telefones: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          total_leads?: number | null
          total_telefones?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          total_leads?: number | null
          total_telefones?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lists: {
        Row: {
          contact_count: number | null
          created_at: string
          description: string | null
          id: string
          list_type: string | null
          name: string
          sheet_id: string | null
          sheet_tab_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_count?: number | null
          created_at?: string
          description?: string | null
          id?: string
          list_type?: string | null
          name: string
          sheet_id?: string | null
          sheet_tab_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_count?: number | null
          created_at?: string
          description?: string | null
          id?: string
          list_type?: string | null
          name?: string
          sheet_id?: string | null
          sheet_tab_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      send_rate_tracking: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          daily_count: number | null
          day_key: string
          hour_key: string
          hourly_count: number | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          daily_count?: number | null
          day_key: string
          hour_key: string
          hourly_count?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          daily_count?: number | null
          day_key?: string
          hour_key?: string
          hourly_count?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "send_rate_tracking_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "send_rate_tracking_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "contact_send_history"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      settings: {
        Row: {
          allowed_days: string[] | null
          allowed_end_time: string | null
          allowed_start_time: string | null
          auto_pause_on_limit: boolean | null
          created_at: string
          id: string
          max_messages_per_day: number | null
          max_messages_per_hour: number | null
          n8n_webhook_url: string | null
          randomize_interval: boolean | null
          send_interval_seconds: number | null
          send_profile: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_days?: string[] | null
          allowed_end_time?: string | null
          allowed_start_time?: string | null
          auto_pause_on_limit?: boolean | null
          created_at?: string
          id?: string
          max_messages_per_day?: number | null
          max_messages_per_hour?: number | null
          n8n_webhook_url?: string | null
          randomize_interval?: boolean | null
          send_interval_seconds?: number | null
          send_profile?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_days?: string[] | null
          allowed_end_time?: string | null
          allowed_start_time?: string | null
          auto_pause_on_limit?: boolean | null
          created_at?: string
          id?: string
          max_messages_per_day?: number | null
          max_messages_per_hour?: number | null
          n8n_webhook_url?: string | null
          randomize_interval?: boolean | null
          send_interval_seconds?: number | null
          send_profile?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          description: string | null
          id: string
          is_favorite: boolean | null
          name: string
          updated_at: string
          user_id: string
          variables: Json | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          name: string
          updated_at?: string
          user_id: string
          variables?: Json | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
          variables?: Json | null
        }
        Relationships: []
      }
      test_contacts: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          phone: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          phone: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          phone?: string
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
    }
    Views: {
      contact_send_history: {
        Row: {
          campaign_date: string | null
          campaign_id: string | null
          campaign_name: string | null
          contact_name: string | null
          contact_phone: string | null
          error_message: string | null
          sent_at: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role:
        | {
            Args: { _role: Database["public"]["Enums"]["app_role"] }
            Returns: boolean
          }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
    }
    Enums: {
      app_role: "admin" | "user"
      campaign_status:
        | "draft"
        | "scheduled"
        | "sending"
        | "completed"
        | "error"
        | "paused"
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
      app_role: ["admin", "user"],
      campaign_status: [
        "draft",
        "scheduled",
        "sending",
        "completed",
        "error",
        "paused",
      ],
    },
  },
} as const
