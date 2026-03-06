import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
    public: {
        Tables: {
            citizen_account: {
                Row: {
                    account_id: string
                    email: string
                    password_hash: string
                    is_verified: boolean
                    is_active: boolean
                    created_at: string
                }
            }
            person: {
                Row: {
                    person_id: string
                    account_id: string | null
                    full_name: string
                    date_of_birth: string | null
                    address: string | null
                    contact_number: string | null
                    valid_id_number: string | null
                    created_at: string
                }
            }
            employee: {
                Row: {
                    employee_id: string
                    office_id: string
                    person_id: string
                    position: string
                    is_active: boolean
                    created_at: string
                }
            }
            government_office: {
                Row: {
                    office_id: string
                    office_name: string
                    office_code: string
                    address: string | null
                    contact: string | null
                }
            }
        }
    }
}
