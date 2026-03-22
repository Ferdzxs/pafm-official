import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Sun, Moon, Bell, Shield, Globe, Save, CheckCircle, Loader2, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { logAudit, updateSystemSetting } from '@/lib/admin'

export default function SettingsPage() {
 const { user } = useAuth()
 const { theme, toggleTheme, isDark } = useTheme()
 const [saved, setSaved] = useState(false)
 const [saving, setSaving] = useState(false)
 const [notifSettings, setNotifSettings] = useState({
  email_notifications: true,
  sms_notifications: false,
  in_app_notifications: true,
  weekly_digest: true,
  system_alerts: true,
 })
 const [privacySettings, setPrivacySettings] = useState({
  show_full_name: true,
  show_office: true,
  show_contact: false,
 })
 const [language, setLanguage] = useState('en-PH')

 const storageKey = useMemo(() => (user ? `bpm_user_settings:${user.id}` : 'bpm_user_settings:anon'), [user])

 useEffect(() => {
  if (!user) return
  try {
   const raw = localStorage.getItem(storageKey)
   if (!raw) return
   const parsed = JSON.parse(raw)
   if (parsed?.notifications) setNotifSettings((prev: any) => ({ ...prev, ...parsed.notifications }))
   if (parsed?.privacy) setPrivacySettings((prev: any) => ({ ...prev, ...parsed.privacy }))
   if (parsed?.language) setLanguage(parsed.language)
  } catch {
   // ignore
  }
 }, [storageKey, user])

 const handleSave = async () => {
  if (!user) return
  setSaving(true)
  try {
   const payload = {
    notifications: notifSettings,
    privacy: privacySettings,
    language,
    theme,
    updated_at: new Date().toISOString(),
   }
   localStorage.setItem(storageKey, JSON.stringify(payload))

   // If system admin, also persist as a system setting (optional / best-effort)
   if (user.role === 'system_admin') {
    await updateSystemSetting(`user_settings:${user.id}`, payload, `User settings for ${user.email}`)
   }

   await logAudit({
    action: 'settings_updated',
    module: 'settings',
    performed_by: user.email,
    subject: user.id,
    details: { language, theme, notifications: notifSettings, privacy: privacySettings },
   })

   setSaved(true)
   toast.success('Settings saved.')
   setTimeout(() => setSaved(false), 3000)
  } catch (err: any) {
   console.error('Failed to save settings', err)
   toast.error(err?.message ?? 'Failed to save settings.')
  } finally {
   setSaving(false)
  }
 }

 if (!user) return null

 return (
  <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in ">
   <div className="mb-6">
    <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Settings</h1>
    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Manage your preferences and system settings</p>
   </div>

   {/* ─── Appearance ─── */}
   <div className="rounded-2xl p-6 mb-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
    <h2 className="text-sm font-bold mb-5 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Appearance</h2>

    {/* Theme toggle */}
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
     <div className="flex items-center gap-3">
      {isDark ? <Moon size={18} style={{ color: '#a78bfa' }} /> : <Sun size={18} style={{ color: '#fbbf24' }} />}
      <div>
       <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Theme</div>
       <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{isDark ? 'Dark mode active' : 'Light mode active'}</div>
      </div>
     </div>
     <button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full transition-all duration-300 flex items-center px-1"
      style={{ background: isDark ? '#6366f1' : '#e2e8f0' }}
     >
      <span
       className="w-5 h-5 rounded-full shadow transition-transform duration-300 flex items-center justify-center text-[10px]"
       style={{
        background: isDark ? '#fff' : '#334155',
        transform: isDark ? 'translateX(28px)' : 'translateX(0)',
       }}
      >
       {isDark ? <Moon size={10} /> : <Sun size={10} />}
      </span>
     </button>
    </div>

    {/* Theme cards */}
    <div className="flex gap-3 mt-4">
     {[
      { id: 'dark', label: 'Dark', preview: 'bg-slate-900', text: 'text-slate-300', active: isDark },
      { id: 'light', label: 'Light', preview: 'bg-slate-100', text: 'text-slate-700', active: !isDark },
     ].map(opt => (
      <button
       key={opt.id}
       onClick={() => { if ((opt.id === 'dark') !== isDark) toggleTheme() }}
       className="flex-1 rounded-xl p-3 text-sm font-semibold transition-all"
       style={{
        border: opt.active ? '2px solid #6366f1' : '1px solid var(--color-border)',
        background: opt.active ? 'var(--color-bg-secondary)' : 'var(--color-bg-hover)',
        color: 'var(--color-text-primary)',
       }}
      >
       <div className={`w-full h-8 rounded-lg mb-2 ${opt.preview} flex items-center justify-center gap-1`}>
        <div className="w-2 h-2 rounded-full bg-current opacity-40" />
        <div className="w-8 h-1.5 rounded bg-current opacity-40" />
       </div>
       {opt.label}
       {opt.active && <Check className="ml-2 h-3.5 w-3.5 text-indigo-400 inline" />}
      </button>
     ))}
    </div>

    {/* Language */}
    <div className="flex items-center justify-between py-3 mt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
     <div className="flex items-center gap-3">
      <Globe size={18} style={{ color: 'var(--color-text-muted)' }} />
      <div>
       <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Language</div>
       <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Select display language</div>
      </div>
     </div>
     <select className="input-field w-auto" value={language} onChange={e => setLanguage(e.target.value)}>
      <option value="en-PH">English (Philippines)</option>
      <option value="fil">Filipino (Tagalog)</option>
     </select>
    </div>
   </div>

   {/* ─── Notifications ─── */}
   <div className="rounded-2xl p-6 mb-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
    <div className="flex items-center gap-2 mb-5">
     <Bell size={16} style={{ color: 'var(--color-text-muted)' }} />
     <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Notifications</h2>
    </div>
    <div className="space-y-4">
     {[
      { key: 'email_notifications', label: 'Email Notifications', desc: 'Receive updates via your registered email' },
      { key: 'sms_notifications', label: 'SMS Notifications', desc: 'Receive SMS alerts for critical updates' },
      { key: 'in_app_notifications', label: 'In-App Notifications', desc: 'Show bell icon notifications inside the app' },
      { key: 'weekly_digest', label: 'Weekly Digest', desc: 'Weekly summary of all activities' },
      { key: 'system_alerts', label: 'System Alerts', desc: 'Important system maintenance and security alerts' },
     ].map(setting => (
      <div key={setting.key} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
       <div>
        <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{setting.label}</div>
        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{setting.desc}</div>
       </div>
       <button
        onClick={() => setNotifSettings(prev => ({ ...prev, [setting.key]: !prev[setting.key as keyof typeof prev] }))}
        className="relative w-11 h-6 rounded-full transition-all duration-200 flex items-center px-0.5"
        style={{ background: notifSettings[setting.key as keyof typeof notifSettings] ? '#22c55e' : 'var(--color-border)' }}
       >
        <span className="w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
         style={{ transform: notifSettings[setting.key as keyof typeof notifSettings] ? 'translateX(20px)' : 'translateX(0)' }} />
       </button>
      </div>
     ))}
    </div>
   </div>

   {/* ─── Privacy ─── */}
   <div className="rounded-2xl p-6 mb-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
    <div className="flex items-center gap-2 mb-5">
     <Shield size={16} style={{ color: 'var(--color-text-muted)' }} />
     <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Privacy</h2>
    </div>
    <div className="space-y-4">
     {[
      { key: 'show_full_name', label: 'Show Full Name', desc: 'Display your full name to other system users' },
      { key: 'show_office', label: 'Show Office', desc: 'Display your office/department in your profile' },
      { key: 'show_contact', label: 'Show Contact No.', desc: 'Allow other users to see your contact number' },
     ].map(setting => (
      <div key={setting.key} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
       <div>
        <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{setting.label}</div>
        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{setting.desc}</div>
       </div>
       <button
        onClick={() => setPrivacySettings(prev => ({ ...prev, [setting.key]: !prev[setting.key as keyof typeof prev] }))}
        className="relative w-11 h-6 rounded-full transition-all duration-200 flex items-center px-0.5"
        style={{ background: privacySettings[setting.key as keyof typeof privacySettings] ? '#6366f1' : 'var(--color-border)' }}
       >
        <span className="w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
         style={{ transform: privacySettings[setting.key as keyof typeof privacySettings] ? 'translateX(20px)' : 'translateX(0)' }} />
       </button>
      </div>
     ))}
    </div>
   </div>

   <button className="btn-primary" onClick={handleSave} disabled={saving}>
    {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
     : saved ? <><CheckCircle size={14} /> Saved!</>
      : <><Save size={14} /> Save Settings</>}
   </button>
  </div>
 )
}
