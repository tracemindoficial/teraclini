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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_access_events: {
        Row: {
          account_id: string
          actor_user_id: string | null
          created_at: string
          details: Json
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          account_id: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          account_id?: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_access_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_members: {
        Row: {
          account_id: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_subscriptions: {
        Row: {
          account_id: string
          billing_period: string
          cancellation_requested_at: string | null
          cancelled_at: string | null
          contracted_price_cents: number
          created_at: string
          currency: string
          id: string
          next_due_on: string
          plan_id: string
          provider_subscription_id: string | null
          restricted_at: string | null
          starts_on: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          account_id: string
          billing_period: string
          cancellation_requested_at?: string | null
          cancelled_at?: string | null
          contracted_price_cents: number
          created_at?: string
          currency?: string
          id?: string
          next_due_on: string
          plan_id: string
          provider_subscription_id?: string | null
          restricted_at?: string | null
          starts_on: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          billing_period?: string
          cancellation_requested_at?: string | null
          cancelled_at?: string | null
          contracted_price_cents?: number
          created_at?: string
          currency?: string
          id?: string
          next_due_on?: string
          plan_id?: string
          provider_subscription_id?: string | null
          restricted_at?: string | null
          starts_on?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          access_state_changed_at: string
          access_state_changed_by: string | null
          block_reason: string | null
          blocked_at: string | null
          blocked_by: string | null
          created_at: string
          deleted_identity_at: string | null
          deletion_started_at: string | null
          id: string
          name: string
          owner_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          access_state_changed_at?: string
          access_state_changed_by?: string | null
          block_reason?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string
          deleted_identity_at?: string | null
          deletion_started_at?: string | null
          id?: string
          name?: string
          owner_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          access_state_changed_at?: string
          access_state_changed_by?: string | null
          block_reason?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string
          deleted_identity_at?: string | null
          deletion_started_at?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          account_id: string
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          account_id?: string
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          account_id?: string
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_client_deletions: {
        Row: {
          account_id: string
          actor_user_id: string
          completed_at: string | null
          created_at: string
          stage: string
          user_id: string
        }
        Insert: {
          account_id: string
          actor_user_id: string
          completed_at?: string | null
          created_at?: string
          stage?: string
          user_id: string
        }
        Update: {
          account_id?: string
          actor_user_id?: string
          completed_at?: string | null
          created_at?: string
          stage?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_client_deletions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notes: {
        Row: {
          account_id: string
          author_user_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          author_user_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          author_user_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notification_reads: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          notification_key: string
          read_at: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          notification_key: string
          read_at?: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          notification_key?: string
          read_at?: string
        }
        Relationships: []
      }
      anamneses: {
        Row: {
          account_id: string
          appointment_id: string | null
          content: Json
          created_at: string
          id: string
          is_completed: boolean
          patient_id: string
          template_key: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string
          appointment_id?: string | null
          content?: Json
          created_at?: string
          id?: string
          is_completed?: boolean
          patient_id: string
          template_key?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          appointment_id?: string | null
          content?: Json
          created_at?: string
          id?: string
          is_completed?: boolean
          patient_id?: string
          template_key?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamneses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamneses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamneses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_events: {
        Row: {
          account_id: string
          actor_user_id: string | null
          appointment_id: string
          changed_fields: string[]
          created_at: string
          event_type: string
          id: string
          new_ends_at: string | null
          new_starts_at: string | null
          previous_ends_at: string | null
          previous_starts_at: string | null
          reason: string | null
        }
        Insert: {
          account_id: string
          actor_user_id?: string | null
          appointment_id: string
          changed_fields?: string[]
          created_at?: string
          event_type: string
          id?: string
          new_ends_at?: string | null
          new_starts_at?: string | null
          previous_ends_at?: string | null
          previous_starts_at?: string | null
          reason?: string | null
        }
        Update: {
          account_id?: string
          actor_user_id?: string | null
          appointment_id?: string
          changed_fields?: string[]
          created_at?: string
          event_type?: string
          id?: string
          new_ends_at?: string | null
          new_starts_at?: string | null
          previous_ends_at?: string | null
          previous_starts_at?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_types: {
        Row: {
          account_id: string
          category: string
          color_key: string
          created_at: string
          default_duration_minutes: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          account_id?: string
          category?: string
          color_key?: string
          created_at?: string
          default_duration_minutes?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          category?: string
          color_key?: string
          created_at?: string
          default_duration_minutes?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_types_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          account_id: string
          appointment_type_id: string | null
          cancellation_reason: string | null
          completed_at: string | null
          created_at: string
          duration_minutes_snapshot: number | null
          ends_at: string
          id: string
          location_id: string | null
          modality: Database["public"]["Enums"]["appointment_modality"]
          notes: string | null
          package_id: string | null
          package_scheduling_key: string | null
          package_session_value: number | null
          patient_id: string | null
          price_cents_snapshot: number | null
          room_id: string | null
          service_name_snapshot: string | null
          service_price_id: string | null
          started_at: string | null
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          type: Database["public"]["Enums"]["appointment_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string
          appointment_type_id?: string | null
          cancellation_reason?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes_snapshot?: number | null
          ends_at: string
          id?: string
          location_id?: string | null
          modality?: Database["public"]["Enums"]["appointment_modality"]
          notes?: string | null
          package_id?: string | null
          package_scheduling_key?: string | null
          package_session_value?: number | null
          patient_id?: string | null
          price_cents_snapshot?: number | null
          room_id?: string | null
          service_name_snapshot?: string | null
          service_price_id?: string | null
          started_at?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          appointment_type_id?: string | null
          cancellation_reason?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes_snapshot?: number | null
          ends_at?: string
          id?: string
          location_id?: string | null
          modality?: Database["public"]["Enums"]["appointment_modality"]
          notes?: string | null
          package_id?: string | null
          package_scheduling_key?: string | null
          package_session_value?: number | null
          patient_id?: string | null
          price_cents_snapshot?: number | null
          room_id?: string | null
          service_name_snapshot?: string | null
          service_price_id?: string | null
          started_at?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "care_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_price_id_fkey"
            columns: ["service_price_id"]
            isOneToOne: false
            referencedRelation: "service_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          account_id: string
          action: string
          actor_user_id: string | null
          changed_fields: string[]
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          account_id: string
          action: string
          actor_user_id?: string | null
          changed_fields?: string[]
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          account_id?: string
          action?: string
          actor_user_id?: string | null
          changed_fields?: string[]
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_rules: {
        Row: {
          account_id: string
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          location_id: string | null
          modality: Database["public"]["Enums"]["appointment_modality"] | null
          room_id: string | null
          start_time: string
          timezone: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          weekday: number
        }
        Insert: {
          account_id?: string
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          modality?: Database["public"]["Enums"]["appointment_modality"] | null
          room_id?: string | null
          start_time: string
          timezone?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          weekday: number
        }
        Update: {
          account_id?: string
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          modality?: Database["public"]["Enums"]["appointment_modality"] | null
          room_id?: string | null
          start_time?: string
          timezone?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_rules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_rules_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      care_package_events: {
        Row: {
          account_id: string
          actor_user_id: string | null
          changed_fields: string[]
          created_at: string
          event_type: string
          id: string
          package_id: string
          related_package_id: string | null
        }
        Insert: {
          account_id: string
          actor_user_id?: string | null
          changed_fields?: string[]
          created_at?: string
          event_type: string
          id?: string
          package_id: string
          related_package_id?: string | null
        }
        Update: {
          account_id?: string
          actor_user_id?: string | null
          changed_fields?: string[]
          created_at?: string
          event_type?: string
          id?: string
          package_id?: string
          related_package_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_package_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_package_events_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "care_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_package_events_related_package_id_fkey"
            columns: ["related_package_id"]
            isOneToOne: false
            referencedRelation: "care_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      care_packages: {
        Row: {
          account_id: string
          appointment_type_id: string | null
          contracted_duration_minutes: number | null
          contracted_unit_cents: number | null
          created_at: string
          discount_cents: number
          end_date: string | null
          finance_mode: string
          id: string
          lifecycle_status: Database["public"]["Enums"]["care_package_lifecycle"]
          notes: string | null
          parent_package_id: string | null
          patient_id: string
          periodicity: Database["public"]["Enums"]["care_package_periodicity"]
          quantity: number
          renewal_alert_threshold: number
          scheduled_modality:
            | Database["public"]["Enums"]["appointment_modality"]
            | null
          scheduling_key: string | null
          service_name_snapshot: string | null
          service_price_id: string | null
          start_date: string
          total_value: number | null
          total_value_cents: number | null
          updated_at: string
          user_id: string
          value_per_session: number | null
          value_per_session_cents: number | null
        }
        Insert: {
          account_id?: string
          appointment_type_id?: string | null
          contracted_duration_minutes?: number | null
          contracted_unit_cents?: number | null
          created_at?: string
          discount_cents?: number
          end_date?: string | null
          finance_mode?: string
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["care_package_lifecycle"]
          notes?: string | null
          parent_package_id?: string | null
          patient_id: string
          periodicity?: Database["public"]["Enums"]["care_package_periodicity"]
          quantity: number
          renewal_alert_threshold?: number
          scheduled_modality?:
            | Database["public"]["Enums"]["appointment_modality"]
            | null
          scheduling_key?: string | null
          service_name_snapshot?: string | null
          service_price_id?: string | null
          start_date: string
          total_value?: number | null
          total_value_cents?: number | null
          updated_at?: string
          user_id: string
          value_per_session?: number | null
          value_per_session_cents?: number | null
        }
        Update: {
          account_id?: string
          appointment_type_id?: string | null
          contracted_duration_minutes?: number | null
          contracted_unit_cents?: number | null
          created_at?: string
          discount_cents?: number
          end_date?: string | null
          finance_mode?: string
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["care_package_lifecycle"]
          notes?: string | null
          parent_package_id?: string | null
          patient_id?: string
          periodicity?: Database["public"]["Enums"]["care_package_periodicity"]
          quantity?: number
          renewal_alert_threshold?: number
          scheduled_modality?:
            | Database["public"]["Enums"]["appointment_modality"]
            | null
          scheduling_key?: string | null
          service_name_snapshot?: string | null
          service_price_id?: string | null
          start_date?: string
          total_value?: number | null
          total_value_cents?: number | null
          updated_at?: string
          user_id?: string
          value_per_session?: number | null
          value_per_session_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "care_packages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_packages_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_packages_parent_package_id_fkey"
            columns: ["parent_package_id"]
            isOneToOne: false
            referencedRelation: "care_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_packages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_packages_service_price_id_fkey"
            columns: ["service_price_id"]
            isOneToOne: false
            referencedRelation: "service_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_conversion_events: {
        Row: {
          event_type: string
          id: string
          occurred_at: string
          page_path: string
          plan_code: string | null
        }
        Insert: {
          event_type: string
          id?: string
          occurred_at?: string
          page_path: string
          plan_code?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          occurred_at?: string
          page_path?: string
          plan_code?: string | null
        }
        Relationships: []
      }
      commercial_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      documents: {
        Row: {
          account_id: string
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          id: string
          mime_type: string | null
          patient_id: string | null
          size_bytes: number | null
          storage_path: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          id?: string
          mime_type?: string | null
          patient_id?: string | null
          size_bytes?: number | null
          storage_path: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          id?: string
          mime_type?: string | null
          patient_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      evolutions: {
        Row: {
          account_id: string
          appointment_id: string
          content: string
          created_at: string
          id: string
          patient_id: string
          recorded_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string
          appointment_id: string
          content: string
          created_at?: string
          id?: string
          patient_id: string
          recorded_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          appointment_id?: string
          content?: string
          created_at?: string
          id?: string
          patient_id?: string
          recorded_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolutions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolutions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolutions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          account_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_primary: boolean
          patient_id: string
          phone: string | null
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean
          patient_id: string
          phone?: string | null
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          patient_id?: string
          phone?: string | null
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardians_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardians_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      help_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          order_index: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      help_events: {
        Row: {
          event_type: Database["public"]["Enums"]["help_event_type"]
          has_results: boolean | null
          id: string
          occurred_at: string
          search_term: string | null
          tutorial_id: string | null
          user_id: string
        }
        Insert: {
          event_type: Database["public"]["Enums"]["help_event_type"]
          has_results?: boolean | null
          id?: string
          occurred_at?: string
          search_term?: string | null
          tutorial_id?: string | null
          user_id: string
        }
        Update: {
          event_type?: Database["public"]["Enums"]["help_event_type"]
          has_results?: boolean | null
          id?: string
          occurred_at?: string
          search_term?: string | null
          tutorial_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_events_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "help_tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      help_progress: {
        Row: {
          completed_at: string | null
          current_step: number
          id: string
          introduction_seen: boolean
          tutorial_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_step?: number
          id?: string
          introduction_seen?: boolean
          tutorial_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_step?: number
          id?: string
          introduction_seen?: boolean
          tutorial_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_progress_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "help_tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      help_tutorial_steps: {
        Row: {
          created_at: string
          id: string
          instruction: string
          order_index: number
          target_selector: string | null
          title: string
          tutorial_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instruction: string
          order_index: number
          target_selector?: string | null
          title: string
          tutorial_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instruction?: string
          order_index?: number
          target_selector?: string | null
          title?: string
          tutorial_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_tutorial_steps_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "help_tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      help_tutorials: {
        Row: {
          category_id: string
          content: string
          created_at: string
          expected_result: string
          id: string
          is_active: boolean
          keywords: string[]
          media_url: string | null
          objective: string
          order_index: number
          route_path: string | null
          short_description: string
          slug: string
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["help_visibility"]
        }
        Insert: {
          category_id: string
          content?: string
          created_at?: string
          expected_result?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          media_url?: string | null
          objective: string
          order_index?: number
          route_path?: string | null
          short_description: string
          slug: string
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["help_visibility"]
        }
        Update: {
          category_id?: string
          content?: string
          created_at?: string
          expected_result?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          media_url?: string | null
          objective?: string
          order_index?: number
          route_path?: string | null
          short_description?: string
          slug?: string
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["help_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "help_tutorials_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "help_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          account_id: string
          address: string | null
          city: string | null
          contact: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          state: string | null
          type: Database["public"]["Enums"]["location_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string
          address?: string | null
          city?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          state?: string | null
          type?: Database["public"]["Enums"]["location_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          address?: string | null
          city?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          state?: string | null
          type?: Database["public"]["Enums"]["location_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tasks: {
        Row: {
          account_id: string
          completed_at: string | null
          created_at: string
          id: string
          task_key: string
          updated_at: string
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          task_key: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          task_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_registration_links: {
        Row: {
          account_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          label: string | null
          max_uses: number
          revoked_at: string | null
          token_hash: string
          updated_at: string
          uses_count: number
        }
        Insert: {
          account_id?: string
          created_at?: string
          created_by?: string
          expires_at: string
          id?: string
          label?: string | null
          max_uses?: number
          revoked_at?: string | null
          token_hash: string
          updated_at?: string
          uses_count?: number
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          label?: string | null
          max_uses?: number
          revoked_at?: string | null
          token_hash?: string
          updated_at?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "patient_registration_links_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_registration_rate_limits: {
        Row: {
          attempts: number
          bucket_key: string
          updated_at: string
          window_started_at: string
        }
        Insert: {
          attempts?: number
          bucket_key: string
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          attempts?: number
          bucket_key?: string
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      patient_registration_requests: {
        Row: {
          account_id: string
          address_complement: string | null
          address_number: string | null
          age_group: Database["public"]["Enums"]["age_group"]
          approved_at: string | null
          birth_date: string
          city: string
          cpf: string
          created_at: string
          education: string | null
          email: string
          emergency_name: string | null
          emergency_notes: string | null
          emergency_phone: string | null
          emergency_relationship: string | null
          family_mental_health: string
          family_mental_health_details: string | null
          full_name: string
          gender: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          id: string
          link_id: string
          marital_status: string | null
          medical_diagnosis: string
          medical_diagnosis_details: string | null
          medication_details: string | null
          medication_use: string
          neighborhood: string | null
          occupation: string | null
          original_data: Json | null
          patient_id: string | null
          payment_preference: string | null
          phone: string | null
          postal_code: string
          previous_therapy: string
          previous_therapy_details: string | null
          privacy_consent_at: string
          referral_source: string | null
          referral_source_other: string | null
          rejected_at: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_data: Json | null
          state: string
          status: string
          street: string | null
          submitted_at: string
          therapy_reason: string
          updated_at: string
        }
        Insert: {
          account_id: string
          address_complement?: string | null
          address_number?: string | null
          age_group?: Database["public"]["Enums"]["age_group"]
          approved_at?: string | null
          birth_date: string
          city: string
          cpf: string
          created_at?: string
          education?: string | null
          email: string
          emergency_name?: string | null
          emergency_notes?: string | null
          emergency_phone?: string | null
          emergency_relationship?: string | null
          family_mental_health: string
          family_mental_health_details?: string | null
          full_name: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          link_id: string
          marital_status?: string | null
          medical_diagnosis: string
          medical_diagnosis_details?: string | null
          medication_details?: string | null
          medication_use: string
          neighborhood?: string | null
          occupation?: string | null
          original_data?: Json | null
          patient_id?: string | null
          payment_preference?: string | null
          phone?: string | null
          postal_code: string
          previous_therapy: string
          previous_therapy_details?: string | null
          privacy_consent_at: string
          referral_source?: string | null
          referral_source_other?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_data?: Json | null
          state: string
          status?: string
          street?: string | null
          submitted_at?: string
          therapy_reason: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          address_complement?: string | null
          address_number?: string | null
          age_group?: Database["public"]["Enums"]["age_group"]
          approved_at?: string | null
          birth_date?: string
          city?: string
          cpf?: string
          created_at?: string
          education?: string | null
          email?: string
          emergency_name?: string | null
          emergency_notes?: string | null
          emergency_phone?: string | null
          emergency_relationship?: string | null
          family_mental_health?: string
          family_mental_health_details?: string | null
          full_name?: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          link_id?: string
          marital_status?: string | null
          medical_diagnosis?: string
          medical_diagnosis_details?: string | null
          medication_details?: string | null
          medication_use?: string
          neighborhood?: string | null
          occupation?: string | null
          original_data?: Json | null
          patient_id?: string | null
          payment_preference?: string | null
          phone?: string | null
          postal_code?: string
          previous_therapy?: string
          previous_therapy_details?: string | null
          privacy_consent_at?: string
          referral_source?: string | null
          referral_source_other?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_data?: Json | null
          state?: string
          status?: string
          street?: string | null
          submitted_at?: string
          therapy_reason?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_registration_requests_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_registration_requests_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "patient_registration_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_registration_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          account_id: string
          address: string | null
          address_complement: string | null
          address_number: string | null
          age_group: Database["public"]["Enums"]["age_group"]
          birth_date: string | null
          city: string | null
          cpf: string | null
          created_at: string
          education: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          marital_status: string | null
          neighborhood: string | null
          notes: string | null
          occupation: string | null
          phone: string | null
          postal_code: string | null
          registration_source: string
          state: string | null
          status: Database["public"]["Enums"]["patient_status"]
          street: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          age_group?: Database["public"]["Enums"]["age_group"]
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          education?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          marital_status?: string | null
          neighborhood?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          postal_code?: string | null
          registration_source?: string
          state?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          street?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          age_group?: Database["public"]["Enums"]["age_group"]
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          education?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          marital_status?: string | null
          neighborhood?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          postal_code?: string | null
          registration_source?: string
          state?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          street?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          account_id: string
          actor_user_id: string | null
          amount_cents: number | null
          created_at: string
          event_type: string
          id: string
          new_status: Database["public"]["Enums"]["payment_status"] | null
          note: string | null
          payment_id: string
          previous_status: Database["public"]["Enums"]["payment_status"] | null
        }
        Insert: {
          account_id: string
          actor_user_id?: string | null
          amount_cents?: number | null
          created_at?: string
          event_type: string
          id?: string
          new_status?: Database["public"]["Enums"]["payment_status"] | null
          note?: string | null
          payment_id: string
          previous_status?: Database["public"]["Enums"]["payment_status"] | null
        }
        Update: {
          account_id?: string
          actor_user_id?: string | null
          amount_cents?: number | null
          created_at?: string
          event_type?: string
          id?: string
          new_status?: Database["public"]["Enums"]["payment_status"] | null
          note?: string | null
          payment_id?: string
          previous_status?: Database["public"]["Enums"]["payment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          account_id: string
          amount_cents: number
          billing_period: string
          charge_id: string | null
          confirmation_source: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string
          due_on: string
          id: string
          method: string
          paid_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount_cents: number
          billing_period: string
          charge_id?: string | null
          confirmation_source?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          due_on: string
          id?: string
          method?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount_cents?: number
          billing_period?: string
          charge_id?: string | null
          confirmation_source?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          due_on?: string
          id?: string
          method?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "account_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["platform_admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["platform_admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["platform_admin_role"]
          user_id?: string
        }
        Relationships: []
      }
      platform_audit_events: {
        Row: {
          account_id: string | null
          action: string
          actor_user_id: string | null
          changed_fields: string[]
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
          result: string
        }
        Insert: {
          account_id?: string | null
          action: string
          actor_user_id?: string | null
          changed_fields?: string[]
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          result?: string
        }
        Update: {
          account_id?: string | null
          action?: string
          actor_user_id?: string | null
          changed_fields?: string[]
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_audit_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_financial_events: {
        Row: {
          account_id: string
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          new_values: Json
          previous_values: Json
          receipt_id: string | null
          receivable_id: string
        }
        Insert: {
          account_id: string
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          new_values?: Json
          previous_values?: Json
          receipt_id?: string | null
          receivable_id: string
        }
        Update: {
          account_id?: string
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          new_values?: Json
          previous_values?: Json
          receipt_id?: string | null
          receivable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_financial_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_financial_events_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "professional_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_financial_events_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "professional_receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_receipts: {
        Row: {
          account_id: string
          amount_cents: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string
          id: string
          method: string
          note: string | null
          receivable_id: string
          received_on: string
          request_key: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount_cents: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by: string
          id?: string
          method: string
          note?: string | null
          receivable_id: string
          received_on: string
          request_key: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount_cents?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          method?: string
          note?: string | null
          receivable_id?: string
          received_on?: string
          request_key?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_receipts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_receipts_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "professional_receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_receivables: {
        Row: {
          account_id: string
          amount_cents: number
          appointment_id: string | null
          appointment_type_id: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string
          due_on: string
          id: string
          modality: string | null
          origin: string
          package_id: string | null
          patient_id: string
          service_name_snapshot: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount_cents: number
          appointment_id?: string | null
          appointment_type_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by: string
          due_on: string
          id?: string
          modality?: string | null
          origin: string
          package_id?: string | null
          patient_id: string
          service_name_snapshot: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount_cents?: number
          appointment_id?: string | null
          appointment_type_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string
          due_on?: string
          id?: string
          modality?: string | null
          origin?: string
          package_id?: string | null
          patient_id?: string
          service_name_snapshot?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_receivables_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_receivables_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_receivables_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_receivables_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "care_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_receivables_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_specialties: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_primary: boolean
          profile_id: string
          specialty_id: string
        }
        Insert: {
          account_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          profile_id: string
          specialty_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          profile_id?: string
          specialty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_specialties_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_specialties_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_specialties_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_id: string
          avatar_url: string | null
          care_mode: Database["public"]["Enums"]["care_mode"] | null
          city: string | null
          created_at: string
          force_password_reset: boolean
          full_name: string
          id: string
          onboarding_completed: boolean
          password_reset_required_at: string | null
          phone: string | null
          profession: string | null
          professional_registry: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string
          avatar_url?: string | null
          care_mode?: Database["public"]["Enums"]["care_mode"] | null
          city?: string | null
          created_at?: string
          force_password_reset?: boolean
          full_name?: string
          id: string
          onboarding_completed?: boolean
          password_reset_required_at?: string | null
          phone?: string | null
          profession?: string | null
          professional_registry?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          avatar_url?: string | null
          care_mode?: Database["public"]["Enums"]["care_mode"] | null
          city?: string | null
          created_at?: string
          force_password_reset?: boolean
          full_name?: string
          id?: string
          onboarding_completed?: boolean
          password_reset_required_at?: string | null
          phone?: string | null
          profession?: string | null
          professional_registry?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_active: boolean
          location_id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_blocks: {
        Row: {
          account_id: string
          category: string
          created_at: string
          ends_at: string
          id: string
          location_id: string | null
          reason: string
          room_id: string | null
          starts_at: string
          updated_at: string
        }
        Insert: {
          account_id?: string
          category?: string
          created_at?: string
          ends_at: string
          id?: string
          location_id?: string | null
          reason: string
          room_id?: string | null
          starts_at: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          category?: string
          created_at?: string
          ends_at?: string
          id?: string
          location_id?: string | null
          reason?: string
          room_id?: string | null
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      service_prices: {
        Row: {
          account_id: string
          appointment_type_id: string
          billing_type: string
          created_at: string
          duration_minutes: number
          id: string
          is_active: boolean
          modality: string
          package_quantity: number | null
          parent_price_id: string | null
          price_cents: number
          updated_at: string
          valid_from: string
        }
        Insert: {
          account_id?: string
          appointment_type_id: string
          billing_type: string
          created_at?: string
          duration_minutes: number
          id?: string
          is_active?: boolean
          modality: string
          package_quantity?: number | null
          parent_price_id?: string | null
          price_cents: number
          updated_at?: string
          valid_from?: string
        }
        Update: {
          account_id?: string
          appointment_type_id?: string
          billing_type?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          modality?: string
          package_quantity?: number | null
          parent_price_id?: string | null
          price_cents?: number
          updated_at?: string
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_prices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_prices_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_prices_parent_price_id_fkey"
            columns: ["parent_price_id"]
            isOneToOne: false
            referencedRelation: "service_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      specialties: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialties_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          account_id: string
          actor_user_id: string | null
          changed_fields: string[]
          created_at: string
          event_type: string
          id: string
          new_status: Database["public"]["Enums"]["subscription_status"] | null
          note: string | null
          previous_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_id: string
        }
        Insert: {
          account_id: string
          actor_user_id?: string | null
          changed_fields?: string[]
          created_at?: string
          event_type: string
          id?: string
          new_status?: Database["public"]["Enums"]["subscription_status"] | null
          note?: string | null
          previous_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_id: string
        }
        Update: {
          account_id?: string
          actor_user_id?: string | null
          changed_fields?: string[]
          created_at?: string
          event_type?: string
          id?: string
          new_status?: Database["public"]["Enums"]["subscription_status"] | null
          note?: string | null
          previous_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "account_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_interval_months: number
          code: string
          created_at: string
          currency: string
          first_payment_days: number
          grace_period_days: number
          id: string
          is_active: boolean
          name: string
          price_cents: number
          promotional_until: string | null
          updated_at: string
        }
        Insert: {
          billing_interval_months?: number
          code: string
          created_at?: string
          currency?: string
          first_payment_days?: number
          grace_period_days?: number
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          promotional_until?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval_months?: number
          code?: string
          created_at?: string
          currency?: string
          first_payment_days?: number
          grace_period_days?: number
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          promotional_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          account_id: string
          author_type: Database["public"]["Enums"]["support_message_author"]
          author_user_id: string
          created_at: string
          id: string
          message: string
          ticket_id: string
        }
        Insert: {
          account_id: string
          author_type?: Database["public"]["Enums"]["support_message_author"]
          author_user_id: string
          created_at?: string
          id?: string
          message: string
          ticket_id: string
        }
        Update: {
          account_id?: string
          author_type?: Database["public"]["Enums"]["support_message_author"]
          author_user_id?: string
          created_at?: string
          id?: string
          message?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          account_id: string
          assigned_admin_user_id: string | null
          closed_at: string | null
          created_at: string
          id: string
          last_message_at: string
          priority: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          assigned_admin_user_id?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          priority?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          assigned_admin_user_id?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          priority?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          account_id: string
          action: string
          id: string
          module: string
          occurred_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          action: string
          id?: string
          module: string
          occurred_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          action?: string
          id?: string
          module?: string
          occurred_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          account_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_change_account_status: {
        Args: {
          _account_id: string
          _actor_user_id: string
          _reason: string
          _status: string
        }
        Returns: boolean
      }
      admin_client_dependency_counts: {
        Args: { _actor_user_id: string; _target_user_id: string }
        Returns: Json
      }
      admin_client_directory: {
        Args: {
          _actor_user_id: string
          _page?: number
          _page_size?: number
          _payment?: string
          _role?: string
          _search?: string
          _sort?: string
          _status?: string
        }
        Returns: Json
      }
      admin_confirm_payment: {
        Args: { _actor_user_id: string; _payment_id: string }
        Returns: boolean
      }
      admin_finalize_client_deletion: {
        Args: { _actor_user_id: string; _target_user_id: string }
        Returns: boolean
      }
      admin_manage_subscription: {
        Args: {
          _account_id: string
          _action: string
          _actor_user_id: string
          _days?: number
          _plan_id?: string
        }
        Returns: string
      }
      admin_overview_summary: {
        Args: { _actor_user_id: string }
        Returns: Json
      }
      admin_prepare_client_deletion: {
        Args: {
          _actor_user_id: string
          _confirmation: string
          _target_user_id: string
        }
        Returns: string
      }
      admin_record_email_change: {
        Args: {
          _actor_user_id: string
          _new_email_domain: string
          _previous_email_domain: string
          _target_user_id: string
        }
        Returns: undefined
      }
      admin_set_account_block: {
        Args: {
          _account_id: string
          _actor_user_id: string
          _blocked: boolean
          _reason: string
        }
        Returns: boolean
      }
      admin_set_account_status: {
        Args: { _account_id: string; _actor_user_id: string; _status: string }
        Returns: boolean
      }
      admin_set_platform_role: {
        Args: {
          _actor_user_id: string
          _role: Database["public"]["Enums"]["platform_admin_role"]
          _target_user_id: string
        }
        Returns: boolean
      }
      admin_set_platform_role_v2: {
        Args: { _actor_user_id: string; _role: string; _target_user_id: string }
        Returns: boolean
      }
      admin_update_user_profile: {
        Args: {
          _actor_user_id: string
          _care_mode: Database["public"]["Enums"]["care_mode"]
          _city: string
          _full_name: string
          _phone: string
          _profession: string
          _professional_registry: string
          _state: string
          _target_user_id: string
        }
        Returns: boolean
      }
      approve_patient_registration: {
        Args: { _existing_patient_id?: string; _request_id: string }
        Returns: string
      }
      can_manage_professional_finance: {
        Args: { _account_id: string }
        Returns: boolean
      }
      create_professional_receivable: {
        Args: { _appointment_id?: string; _package_id?: string }
        Returns: string
      }
      create_support_ticket: {
        Args: { _message: string; _subject: string }
        Returns: string
      }
      current_account_id: { Args: never; Returns: string }
      finance_cancel_title: { Args: { _id: string }; Returns: undefined }
      finance_import_contract: {
        Args: { _appointment_id?: string; _mode?: string; _package_id?: string }
        Returns: string
      }
      finance_lookup: {
        Args: { _kind: string; _search?: string }
        Returns: Json
      }
      finance_query: { Args: { _filters?: Json }; Returns: Json }
      finance_receipt_action: { Args: { _payload: Json }; Returns: string }
      has_account_role: {
        Args: {
          _account_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id?: string
        }
        Returns: boolean
      }
      is_account_member: {
        Args: { _account_id: string; _user_id?: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      patient_registration_duplicates: {
        Args: { _request_id: string }
        Returns: {
          birth_date: string
          email: string
          full_name: string
          id: string
          phone: string
          reasons: string[]
        }[]
      }
      platform_admin_role_for: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["platform_admin_role"]
      }
      reject_patient_registration: {
        Args: { _reason: string; _request_id: string }
        Returns: undefined
      }
      reply_support_ticket: {
        Args: { _message: string; _ticket_id: string }
        Returns: string
      }
      save_complete_patient: {
        Args: { _patient_id?: string; _payload: Json }
        Returns: string
      }
      save_patient_registration_review: {
        Args: { _payload: Json; _request_id: string }
        Returns: string
      }
      save_service_price: {
        Args: {
          _appointment_type_id: string
          _billing_type: string
          _duration_minutes: number
          _is_active: boolean
          _modality: string
          _package_quantity: number
          _price_cents: number
          _price_id: string
        }
        Returns: string
      }
      schedule_care_package: { Args: { _payload: Json }; Returns: string }
      seed_basic_registrations: {
        Args: { target_account_id: string }
        Returns: undefined
      }
      set_profile_specialties: {
        Args: {
          _primary_specialty_id: string
          _profile_id: string
          _specialty_ids: string[]
        }
        Returns: undefined
      }
      submit_patient_registration: {
        Args: { _bucket_key: string; _payload: Json; _token_hash: string }
        Returns: string
      }
    }
    Enums: {
      age_group: "crianca" | "adolescente" | "adulto"
      app_role: "owner" | "assistant" | "finance"
      appointment_modality: "presencial" | "online" | "domiciliar" | "outro"
      appointment_status:
        | "agendado"
        | "confirmado"
        | "em_andamento"
        | "realizado"
        | "falta"
        | "cancelado"
      appointment_type:
        | "atendimento_clinico"
        | "devolutiva"
        | "reuniao_responsaveis"
        | "reuniao_escolar"
        | "anamnese"
        | "outro"
      care_mode: "presencial" | "online" | "ambos"
      care_package_lifecycle: "ativo" | "cancelado" | "encerrado"
      care_package_periodicity:
        | "semanal"
        | "quinzenal"
        | "mensal"
        | "personalizada"
        | "sem_periodicidade"
      document_category: "clinico" | "administrativo" | "anexo" | "outro"
      help_event_type:
        | "view"
        | "search"
        | "no_results"
        | "completed"
        | "guide_started"
        | "guide_skipped"
        | "support_view"
      help_visibility: "all" | "professional" | "admin"
      location_type:
        | "consultorio_proprio"
        | "clinica"
        | "instituicao"
        | "domiciliar"
        | "online"
        | "outro"
      patient_status: "ativo" | "inativo" | "alta" | "avaliacao"
      payment_status:
        | "pending"
        | "under_review"
        | "confirmed"
        | "rejected"
        | "overdue"
        | "refunded"
        | "cancelled"
      platform_admin_role:
        | "super_admin"
        | "support_admin"
        | "analyst"
        | "finance_admin"
        | "content_admin"
      subscription_status:
        | "awaiting_first_payment"
        | "active"
        | "payment_pending"
        | "grace_period"
        | "restricted"
        | "cancellation_requested"
        | "cancelled"
      support_message_author: "professional" | "admin"
      support_ticket_status:
        | "open"
        | "in_progress"
        | "waiting_user"
        | "resolved"
        | "closed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      age_group: ["crianca", "adolescente", "adulto"],
      app_role: ["owner", "assistant", "finance"],
      appointment_modality: ["presencial", "online", "domiciliar", "outro"],
      appointment_status: [
        "agendado",
        "confirmado",
        "em_andamento",
        "realizado",
        "falta",
        "cancelado",
      ],
      appointment_type: [
        "atendimento_clinico",
        "devolutiva",
        "reuniao_responsaveis",
        "reuniao_escolar",
        "anamnese",
        "outro",
      ],
      care_mode: ["presencial", "online", "ambos"],
      care_package_lifecycle: ["ativo", "cancelado", "encerrado"],
      care_package_periodicity: [
        "semanal",
        "quinzenal",
        "mensal",
        "personalizada",
        "sem_periodicidade",
      ],
      document_category: ["clinico", "administrativo", "anexo", "outro"],
      help_event_type: [
        "view",
        "search",
        "no_results",
        "completed",
        "guide_started",
        "guide_skipped",
        "support_view",
      ],
      help_visibility: ["all", "professional", "admin"],
      location_type: [
        "consultorio_proprio",
        "clinica",
        "instituicao",
        "domiciliar",
        "online",
        "outro",
      ],
      patient_status: ["ativo", "inativo", "alta", "avaliacao"],
      payment_status: [
        "pending",
        "under_review",
        "confirmed",
        "rejected",
        "overdue",
        "refunded",
        "cancelled",
      ],
      platform_admin_role: [
        "super_admin",
        "support_admin",
        "analyst",
        "finance_admin",
        "content_admin",
      ],
      subscription_status: [
        "awaiting_first_payment",
        "active",
        "payment_pending",
        "grace_period",
        "restricted",
        "cancellation_requested",
        "cancelled",
      ],
      support_message_author: ["professional", "admin"],
      support_ticket_status: [
        "open",
        "in_progress",
        "waiting_user",
        "resolved",
        "closed",
      ],
    },
  },
} as const
