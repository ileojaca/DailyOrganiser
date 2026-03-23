import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Check if we're in a static build or development without env vars
const isMissingConfig = !supabaseUrl || !supabaseAnonKey || supabaseUrl === ''

// Create a mock client for static builds
const createMockClient = (): SupabaseClient => {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: 'mock-user-id', email: 'mock@example.com' } }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ data: null, error: null }),
      signUp: async () => ({ data: null, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ error: null }),
      update: () => ({ error: null }),
      delete: () => ({ error: null }),
      eq: () => ({ data: [], error: null }),
      single: () => ({ data: null, error: null }),
    }),
  } as unknown as SupabaseClient
}

// Export the client (real or mock)
export const supabase: SupabaseClient = isMissingConfig
  ? createMockClient()
  : createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          timezone: string
          chronotype: string
          energy_pattern: Record<string, unknown>
          preferences: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string
          chronotype?: string
          energy_pattern?: Record<string, unknown>
          preferences?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string
          chronotype?: string
          energy_pattern?: Record<string, unknown>
          preferences?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          category: string
          priority: number
          ai_adjusted_priority: boolean
          adjustment_reason: string | null
          estimated_duration: number | null
          deadline: string | null
          status: string
          context: Record<string, unknown>
          energy_required: number | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          category?: string
          priority?: number
          ai_adjusted_priority?: boolean
          adjustment_reason?: string | null
          estimated_duration?: number | null
          deadline?: string | null
          status?: string
          context?: Record<string, unknown>
          energy_required?: number | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          category?: string
          priority?: number
          ai_adjusted_priority?: boolean
          adjustment_reason?: string | null
          estimated_duration?: number | null
          deadline?: string | null
          status?: string
          context?: Record<string, unknown>
          energy_required?: number | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      time_blocks: {
        Row: {
          id: string
          user_id: string
          name: string
          block_type: string
          start_time: string
          end_time: string
          duration_minutes: number
          days_of_week: number[]
          energy_level: string
          preferred_task_types: string[] | null
          is_protected: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          block_type?: string
          start_time: string
          end_time: string
          duration_minutes?: number
          days_of_week?: number[]
          energy_level?: string
          preferred_task_types?: string[] | null
          is_protected?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          block_type?: string
          start_time?: string
          end_time?: string
          duration_minutes?: number
          days_of_week?: number[]
          energy_level?: string
          preferred_task_types?: string[] | null
          is_protected?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      accomplishment_logs: {
        Row: {
          id: string
          user_id: string
          goal_id: string | null
          scheduled_date: string
          scheduled_hour: number
          actual_duration: number | null
          completion_status: string
          energy_level_at_start: number | null
          context_snapshot: Record<string, unknown>
          efficiency_score: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          goal_id?: string | null
          scheduled_date: string
          scheduled_hour?: number
          actual_duration?: number | null
          completion_status: string
          energy_level_at_start?: number | null
          context_snapshot?: Record<string, unknown>
          efficiency_score?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal_id?: string | null
          scheduled_date?: string
          scheduled_hour?: number
          actual_duration?: number | null
          completion_status?: string
          energy_level_at_start?: number | null
          context_snapshot?: Record<string, unknown>
          efficiency_score?: number
          created_at?: string
        }
      }
    }
  }
}
