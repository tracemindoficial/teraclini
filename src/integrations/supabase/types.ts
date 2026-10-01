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
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
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
          color_key: string
          created_at: string
          default_duration_minutes: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          account_id?: string
          color_key?: string
          created_at?: string
          default_duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          color_key?: string
          created_at?: string
          default_duration_minutes?: number
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
          ends_at: string
          id: string
          location_id: string | null
          modality: Database["public"]["Enums"]["appointment_modality"]
          notes: string | null
          patient_id: string | null
          room_id: string | null
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
          ends_at: string
          id?: string
          location_id?: string | null
          modality?: Database["public"]["Enums"]["appointment_modality"]
          notes?: string | null
          patient_id?: string | null
          room_id?: string | null
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
          ends_at?: string
          id?: string
          location_id?: string | null
          modality?: Database["public"]["Enums"]["appointment_modality"]
          notes?: string | null
          patient_id?: string | null
          room_id?: string | null
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
      profiles: {
        Row: {
          account_id: string
          avatar_url: string | null
          care_mode: Database["public"]["Enums"]["care_mode"] | null
          city: string | null
          created_at: string
          full_name: string
          id: string
          onboarding_completed: boolean
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
          full_name?: string
          id: string
          onboarding_completed?: boolean
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
          full_name?: string
          id?: string
          onboarding_completed?: boolean
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
      approve_patient_registration: {
        Args: { _existing_patient_id?: string; _request_id: string }
        Returns: string
      }
      current_account_id: { Args: never; Returns: string }
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
      reject_patient_registration: {
        Args: { _reason: string; _request_id: string }
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
      document_category: "clinico" | "administrativo" | "anexo" | "outro"
      location_type:
        | "consultorio_proprio"
        | "clinica"
        | "instituicao"
        | "domiciliar"
        | "online"
        | "outro"
      patient_status: "ativo" | "inativo" | "alta" | "avaliacao"
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
      document_category: ["clinico", "administrativo", "anexo", "outro"],
      location_type: [
        "consultorio_proprio",
        "clinica",
        "instituicao",
        "domiciliar",
        "online",
        "outro",
      ],
      patient_status: ["ativo", "inativo", "alta", "avaliacao"],
    },
  },
} as const
