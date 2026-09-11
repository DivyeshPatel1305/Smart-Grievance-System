import { useState } from 'react'
import toast from 'react-hot-toast'
import { Settings, Save } from '@mui/icons-material'

export default function SystemSettings() {
  const [settings, setSettings] = useState({
    support_threshold: 10,
    max_upload_size_mb: 10,
    allow_anonymous: true,
    email_notifications: true,
    auto_assign: false,
    sla_warning_hours: 48,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setTimeout(() => {
      toast.success('Settings saved successfully')
      setSaving(false)
    }, 800)
  }

  const Field = ({ label, desc, children }) => (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        {desc && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings /> System Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Configure platform-wide settings</p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Complaint Settings</h3>
        <Field label="Support Threshold" desc="Number of supports to auto-escalate priority">
          <input type="number" className="input-field w-24 text-sm" value={settings.support_threshold}
            onChange={e => setSettings(p => ({ ...p, support_threshold: +e.target.value }))} />
        </Field>
        <Field label="Max Upload Size (MB)" desc="Maximum file size for uploads">
          <input type="number" className="input-field w-24 text-sm" value={settings.max_upload_size_mb}
            onChange={e => setSettings(p => ({ ...p, max_upload_size_mb: +e.target.value }))} />
        </Field>
        <Field label="SLA Warning (hours)" desc="Hours before SLA breach to send warning">
          <input type="number" className="input-field w-24 text-sm" value={settings.sla_warning_hours}
            onChange={e => setSettings(p => ({ ...p, sla_warning_hours: +e.target.value }))} />
        </Field>
        <Field label="Allow Anonymous Complaints" desc="Citizens can submit complaints anonymously">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={settings.allow_anonymous}
              onChange={e => setSettings(p => ({ ...p, allow_anonymous: e.target.checked }))} />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </Field>
        <Field label="Email Notifications" desc="Send email notifications to citizens">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={settings.email_notifications}
              onChange={e => setSettings(p => ({ ...p, email_notifications: e.target.checked }))} />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </Field>
        <Field label="Auto-assign Complaints" desc="Automatically assign complaints to available officers">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={settings.auto_assign}
              onChange={e => setSettings(p => ({ ...p, auto_assign: e.target.checked }))} />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </Field>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
        <Save fontSize="small" /> {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}
