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
            niche_record: {
                Row: {
                    niche_id: string
                    cemetery_id: string
                    niche_number: string
                    status: string
                    burial_schedule_date: string | null
                    assigned_document: string | null
                }
            }
            deceased: {
                Row: {
                    deceased_id: string
                    full_name: string
                    date_of_death: string
                    place_of_death: string | null
                    death_certificate_no: string | null
                }
            }
            online_burial_application: {
                Row: {
                    application_id: string
                    person_id: string
                    deceased_id: string
                    submission_date: string
                    document_validation_status: string
                    application_status: string
                    payment_id: string | null
                    received_by_employee: string | null
                    approved_by_employee: string | null
                }
            }
        }
    }
}
