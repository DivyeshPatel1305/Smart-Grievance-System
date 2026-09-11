export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
export const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || 'http://localhost:8000'

export const ROLES = {
  CITIZEN: 'citizen',
  OFFICER: 'officer',
  DEPARTMENT_HEAD: 'department_head',
  SUPER_ADMIN: 'super_admin',
}

export const STATUS_LABELS = {
  submitted: 'Submitted',
  verified: 'Verified',
  assigned: 'Assigned',
  accepted: 'Accepted',
  work_started: 'Work Started',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  citizen_verification: 'Citizen Verification',
  closed: 'Closed',
  rejected: 'Rejected',
  reopened: 'Reopened',
}

export const STATUS_COLORS = {
  submitted: 'bg-blue-100 text-blue-800',
  verified: 'bg-cyan-100 text-cyan-800',
  assigned: 'bg-purple-100 text-purple-800',
  accepted: 'bg-indigo-100 text-indigo-800',
  work_started: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  citizen_verification: 'bg-teal-100 text-teal-800',
  closed: 'bg-gray-100 text-gray-800',
  rejected: 'bg-red-100 text-red-800',
  reopened: 'bg-pink-100 text-pink-800',
}

export const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  emergency: 'bg-red-100 text-red-800',
}

export const PRIORITY_DOT_COLORS = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  emergency: 'bg-red-500',
}

export const CATEGORY_ICONS = {
  road_damage: '🛣️',
  garbage: '🗑️',
  street_light: '💡',
  water_supply: '💧',
  drainage: '🌊',
  electricity: '⚡',
  traffic: '🚦',
  illegal_parking: '🚗',
  public_transport: '🚌',
  government_office: '🏛️',
  healthcare: '🏥',
  education: '🎓',
  environment: '🌿',
  others: '📋',
}

export const COMPLAINT_STATUSES = Object.keys(STATUS_LABELS)
export const PRIORITIES = ['low', 'medium', 'high', 'emergency']
