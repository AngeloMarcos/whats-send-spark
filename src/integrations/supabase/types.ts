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
      blacklist: {
        Row: {
          added_at: string | null
          added_by: string | null
          id: string
          phone_number: string
          reason: string | null
          user_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          id?: string
          phone_number: string
          reason?: string | null
          user_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          id?: string
          phone_number?: string
          reason?: string | null
          user_id?: string
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
      campaign_triggers: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          delay_minutes: number | null
          id: string
          is_active: boolean | null
          template_id: string | null
          trigger_condition: string | null
          trigger_type: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          template_id?: string | null
          trigger_condition?: string | null
          trigger_type: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          template_id?: string | null
          trigger_condition?: string | null
          trigger_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_triggers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_triggers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "contact_send_history"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_triggers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
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
      lead_responses: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string
          message_id: string | null
          responded_at: string | null
          response_text: string | null
          response_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id: string
          message_id?: string | null
          responded_at?: string | null
          response_text?: string | null
          response_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string
          message_id?: string | null
          responded_at?: string | null
          response_text?: string | null
          response_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_responses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          atividade: string | null
          atividades_secundarias: Json | null
          bairro: string | null
          bloqueado: boolean | null
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
          numero_tentativas: number | null
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
          ultimo_contato: string | null
          updated_at: string | null
          user_id: string
          whatsapp_links: Json | null
        }
        Insert: {
          atividade?: string | null
          atividades_secundarias?: Json | null
          bairro?: string | null
          bloqueado?: boolean | null
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
          numero_tentativas?: number | null
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
          ultimo_contato?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp_links?: Json | null
        }
        Update: {
          atividade?: string | null
          atividades_secundarias?: Json | null
          bairro?: string | null
          bloqueado?: boolean | null
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
          numero_tentativas?: number | null
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
          ultimo_contato?: string | null
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
      message_logs: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          lead_id: string
          message_id: string | null
          message_text: string | null
          phone_number: string | null
          read_at: string | null
          retry_count: number | null
          sent_at: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          lead_id: string
          message_id?: string | null
          message_text?: string | null
          phone_number?: string | null
          read_at?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string
          message_id?: string | null
          message_text?: string | null
          phone_number?: string | null
          read_at?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "contact_send_history"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "message_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisas_salvas: {
        Row: {
          created_at: string | null
          descricao: string | null
          filtros: Json
          id: string
          nome: string
          total_resultados: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          filtros?: Json
          id?: string
          nome: string
          total_resultados?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          filtros?: Json
          id?: string
          nome?: string
          total_resultados?: number | null
          updated_at?: string | null
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
      stella_onboarding: {
        Row: {
          business_name: string
          business_segment: string
          client_email: string
          client_name: string
          client_phone: string
          created_at: string
          form_data: Json
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          business_name: string
          business_segment: string
          client_email: string
          client_name: string
          client_phone: string
          created_at?: string
          form_data?: Json
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_name?: string
          business_segment?: string
          client_email?: string
          client_name?: string
          client_phone?: string
          created_at?: string
          form_data?: Json
          id?: string
          status?: string
          updated_at?: string
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
      webhook_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          lead_id: string | null
          request_payload: Json | null
          response_body: string | null
          status_code: number | null
          success: boolean | null
          user_id: string
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          request_payload?: Json | null
          response_body?: string | null
          status_code?: number | null
          success?: boolean | null
          user_id: string
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          request_payload?: Json | null
          response_body?: string | null
          status_code?: number | null
          success?: boolean | null
          user_id?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
