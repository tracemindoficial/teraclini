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
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      anamneses: {
        Row: {
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
      appointments: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          location_id: string | null
          modality: Database["public"]["Enums"]["appointment_modality"]
          notes: string | null
          patient_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          type: Database["public"]["Enums"]["appointment_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          location_id?: string | null
          modality?: Database["public"]["Enums"]["appointment_modality"]
          notes?: string | null
          patient_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          location_id?: string | null
          modality?: Database["public"]["Enums"]["appointment_modality"]
          notes?: string | null
          patient_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
        ]
      }
      documents: {
        Row: {
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
        Relationships: []
      }
      patients: {
        Row: {
          address: string | null
          age_group: Database["public"]["Enums"]["age_group"]
          birth_date: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string
          gender: string | null
          id: string
          notes: string | null
          phone: string | null
          state: string | null
          status: Database["public"]["Enums"]["patient_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          age_group?: Database["public"]["Enums"]["age_group"]
          birth_date?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          age_group?: Database["public"]["Enums"]["age_group"]
          birth_date?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      age_group: "crianca" | "adolescente" | "adulto"
      appointment_modality: "presencial" | "online" | "domiciliar" | "outro"
      appointment_status:
        | "agendado"
        | "confirmado"
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
      appointment_modality: ["presencial", "online", "domiciliar", "outro"],
      appointment_status: [
        "agendado",
        "confirmado",
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
