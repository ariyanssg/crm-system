export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'customer'
export type ProductType = 'shared' | 'individual'
export type ProductStatus = 'active' | 'disabled' | 'out_of_stock'
export type SubscriptionStatus = 'active' | 'expired' | 'suspended' | 'pending'
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          role: UserRole
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          role?: UserRole
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          role?: UserRole
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          product_type: ProductType
          max_slots: number | null
          price: number
          billing_cycle_days: number
          status: ProductStatus
          icon_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          product_type: ProductType
          max_slots?: number | null
          price: number
          billing_cycle_days?: number
          status?: ProductStatus
          icon_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          product_type?: ProductType
          max_slots?: number | null
          price?: number
          billing_cycle_days?: number
          status?: ProductStatus
          icon_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      master_accounts: {
        Row: {
          id: string
          product_id: string
          account_email: string
          account_password: string
          recovery_email: string | null
          recovery_phone: string | null
          security_questions: Json | null
          authenticator_secret: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          account_email: string
          account_password: string
          recovery_email?: string | null
          recovery_phone?: string | null
          security_questions?: Json | null
          authenticator_secret?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          account_email?: string
          account_password?: string
          recovery_email?: string | null
          recovery_phone?: string | null
          security_questions?: Json | null
          authenticator_secret?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          customer_id: string
          product_id: string
          master_account_id: string | null
          status: SubscriptionStatus
          start_date: string
          end_date: string
          renewal_date: string | null
          auto_renew: boolean
          individual_email: string | null
          individual_password: string | null
          individual_recovery_info: Json | null
          invited_email: string | null
          slot_number: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          product_id: string
          master_account_id?: string | null
          status?: SubscriptionStatus
          start_date: string
          end_date: string
          renewal_date?: string | null
          auto_renew?: boolean
          individual_email?: string | null
          individual_password?: string | null
          individual_recovery_info?: Json | null
          invited_email?: string | null
          slot_number?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          product_id?: string
          master_account_id?: string | null
          status?: SubscriptionStatus
          start_date?: string
          end_date?: string
          renewal_date?: string | null
          auto_renew?: boolean
          individual_email?: string | null
          individual_password?: string | null
          individual_recovery_info?: Json | null
          invited_email?: string | null
          slot_number?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      issues: {
        Row: {
          id: string
          subscription_id: string
          customer_id: string
          title: string
          description: string
          status: IssueStatus
          priority: IssuePriority
          admin_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          customer_id: string
          title: string
          description: string
          status?: IssueStatus
          priority?: IssuePriority
          admin_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          customer_id?: string
          title?: string
          description?: string
          status?: IssueStatus
          priority?: IssuePriority
          admin_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      issue_comments: {
        Row: {
          id: string
          issue_id: string
          user_id: string
          message: string
          is_internal: boolean
          created_at: string
        }
        Insert: {
          id?: string
          issue_id: string
          user_id: string
          message: string
          is_internal?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          issue_id?: string
          user_id?: string
          message?: string
          is_internal?: boolean
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          is_read: boolean
          link: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          is_read?: boolean
          link?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          is_read?: boolean
          link?: string | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string
          record_id: string | null
          old_data: Json | null
          new_data: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          table_name: string
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          table_name?: string
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      product_type: ProductType
      product_status: ProductStatus
      subscription_status: SubscriptionStatus
      issue_status: IssueStatus
      issue_priority: IssuePriority
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type MasterAccount = Database['public']['Tables']['master_accounts']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type Issue = Database['public']['Tables']['issues']['Row']
export type IssueComment = Database['public']['Tables']['issue_comments']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']

export type SubscriptionWithRelations = Subscription & {
  product: Product
  customer: Profile
  master_account?: MasterAccount
}

export type IssueWithRelations = Issue & {
  subscription: Subscription & { product: Product }
  customer: Profile
  comments?: IssueComment[]
}
