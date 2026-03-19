import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types'

export interface SystemUserRow {
  user_id: string
  full_name: string
  email: string
  role: string
  department?: string | null
  contact_no?: string | null
  is_active: boolean
  created_at: string
}

export interface GovernmentOfficeRow {
  office_id: string
  office_name: string
  office_type?: string | null
  location?: string | null
}

export interface EmployeeRow {
  employee_id: string
  office_id: string | null
  full_name: string
  position_title?: string | null
  department?: string | null
  employee_no?: string | null
  contact_number?: string | null
  is_active: boolean
  email?: string | null
  system_user_id?: string | null
}

export interface AuditLogInput {
  action: string
  module: string
  status?: string
  subject?: string
  performed_by?: string
  details?: any
  ip_address?: string | null
}

export async function logAudit(entry: AuditLogInput) {
  const payload = {
    action: entry.action,
    module: entry.module,
    status: entry.status ?? 'success',
    subject: entry.subject ?? null,
    performed_by: entry.performed_by ?? null,
    ip_address: entry.ip_address ?? null,
    details: entry.details ? JSON.stringify(entry.details) : null,
  }
  await supabase.from('audit_logs').insert(payload)
}

export async function fetchSystemUsers(): Promise<SystemUserRow[]> {
  const { data, error } = await supabase
    .from('system_users')
    .select('user_id, full_name, email, role, department, contact_no, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as SystemUserRow[]
}

export async function createSystemUser(input: {
  full_name: string
  email: string
  role: UserRole | string
  department?: string
  contact_no?: string
  password?: string
}) {
  const { error } = await supabase.from('system_users').insert({
    full_name: input.full_name,
    email: input.email,
    role: input.role,
    department: input.department ?? null,
    contact_no: input.contact_no ?? null,
    is_active: true,
    password_hash: input.password ?? null,
  })
  if (error) throw error
}

export async function updateSystemUser(userId: string, patch: Partial<Omit<SystemUserRow, 'user_id' | 'created_at'>>) {
  const { error } = await supabase
    .from('system_users')
    .update(patch)
    .eq('user_id', userId)
  if (error) throw error
}

export async function toggleSystemUserActive(userId: string, nextActive: boolean) {
  await updateSystemUser(userId, { is_active: nextActive } as any)
}

export async function fetchGovernmentOffices(): Promise<GovernmentOfficeRow[]> {
  const { data, error } = await supabase
    .from('government_office')
    .select('office_id, office_name, office_type, location')
    .order('office_name', { ascending: true })
  if (error) throw error
  return (data ?? []) as GovernmentOfficeRow[]
}

export async function upsertGovernmentOffice(row: Partial<GovernmentOfficeRow>) {
  const { error } = await supabase.from('government_office').upsert(row, { onConflict: 'office_id' })
  if (error) throw error
}

export async function fetchEmployees(): Promise<EmployeeRow[]> {
  const { data, error } = await supabase
    .from('employee')
    .select('employee_id, office_id, full_name, position_title, department, employee_no, contact_number, is_active, email, system_user_id')
    .order('full_name', { ascending: true })
  if (error) throw error
  return (data ?? []) as EmployeeRow[]
}

export async function upsertEmployee(row: Partial<EmployeeRow>) {
  const { error } = await supabase.from('employee').upsert(row, { onConflict: 'employee_id' })
  if (error) throw error
}

export async function linkEmployeeToSystemUser(employeeId: string, systemUserId: string | null) {
  const { error } = await supabase
    .from('employee')
    .update({ system_user_id: systemUserId })
    .eq('employee_id', employeeId)
  if (error) throw error
}

export async function fetchSystemSettings() {
  const { data, error } = await supabase.from('system_settings').select('key, value, description')
  if (error) throw error
  return data ?? []
}

export async function updateSystemSetting(key: string, value: any, description?: string) {
  const { error } = await supabase
    .from('system_settings')
    .upsert(
      {
        key,
        value,
        description: description ?? null,
      },
      { onConflict: 'key' },
    )
  if (error) throw error
}

export async function fetchBackups() {
  const { data, error } = await supabase
    .from('system_backups')
    .select('id, filename, date, type, size, status')
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function logBackupRow(row: { filename: string; type?: string; size?: string | null; status?: string }) {
  const { error } = await supabase.from('system_backups').insert({
    filename: row.filename,
    type: row.type ?? 'Manual',
    size: row.size ?? null,
    status: row.status ?? 'Completed',
  })
  if (error) throw error
}

export async function fetchAuditLogs(params: {
  module?: string
  status?: string
  from?: string
  to?: string
  limit?: number
}) {
  let query = supabase
    .from('audit_logs')
    .select('id, action, subject, performed_by, timestamp, status, module, ip_address, details')
    .order('timestamp', { ascending: false })

  if (params.module) query = query.eq('module', params.module)
  if (params.status) query = query.eq('status', params.status)
  if (params.from) query = query.gte('timestamp', params.from)
  if (params.to) query = query.lte('timestamp', params.to)
  if (params.limit) query = query.limit(params.limit)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

