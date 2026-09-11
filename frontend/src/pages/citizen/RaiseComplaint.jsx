import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { complaintService } from '../../services/complaintService'
import { departmentService } from '../../services/index'
import ComplaintsMap from '../../components/maps/ComplaintsMap'
import { CloudUpload, LocationOn, Warning, Close, ContentCopy, OpenInNew } from '@mui/icons-material'
import { CATEGORY_ICONS } from '../../constants'
import { safeFormat } from '../../utils/dateUtils'

const AVAILABLE_CITIES = ['Ahmedabad', 'Surat', 'Surendranagar', 'Baroda']
const BUILTIN_CATEGORIES = [
  { id: 'road_damage', name: 'Road Damage', slug: 'road_damage' },
  { id: 'garbage', name: 'Garbage Collection', slug: 'garbage' },
  { id: 'street_light', name: 'Street Light', slug: 'street_light' },
  { id: 'water_supply', name: 'Water Supply', slug: 'water_supply' },
  { id: 'drainage', name: 'Drainage', slug: 'drainage' },
  { id: 'electricity', name: 'Electricity', slug: 'electricity' },
  { id: 'traffic', name: 'Traffic', slug: 'traffic' },
  { id: 'others', name: 'Others', slug: 'others' },
]

export default function RaiseComplaint() {
  const navigate = useNavigate()
  const [categories, setCategories]       = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [images, setImages]               = useState([])
  const [videos, setVideos]               = useState([])
  const [isSubmitting, setIsSubmitting]   = useState(false)
  const [step, setStep]                   = useState(1)

  // ── Duplicate detection state ─────────────────────────────────────────────
  const [duplicates,    setDuplicates]    = useState([])
  const [checkingDups,  setCheckingDups]  = useState(false)
  const [showDupBanner, setShowDupBanner] = useState(true)
  const dupTimerRef = useRef(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { priority: 'medium', is_emergency: false, is_anonymous: false }
  })

  const isEmergency = watch('is_emergency')
  const watchedTitle = watch('title')
  const watchedDesc  = watch('description')
  const watchedCity  = watch('city')

  // Debounced duplicate check — fires 1.5s after user stops typing
  useEffect(() => {
    const title = watchedTitle || ''
    const desc  = watchedDesc  || ''

    // Only check if we have meaningful text (>= 10 chars combined)
    if (title.length + desc.length < 10) {
      setDuplicates([])
      return
    }

    if (dupTimerRef.current) clearTimeout(dupTimerRef.current)

    dupTimerRef.current = setTimeout(async () => {
      setCheckingDups(true)
      try {
        const { data } = await complaintService.findDuplicates({
          title,
          description: desc,
          city: watchedCity || '',
        })
        setDuplicates(data.duplicates || [])
        setShowDupBanner(true)
      } catch {
        // silently ignore — duplicate check is optional
      } finally {
        setCheckingDups(false)
      }
    }, 1500)

    return () => { if (dupTimerRef.current) clearTimeout(dupTimerRef.current) }
  }, [watchedTitle, watchedDesc, watchedCity])

  useEffect(() => {
    departmentService.getCategories().then(({ data }) => {
      const list = Array.isArray(data) ? data : (data.results || [])
      // Only set API categories if we got results — otherwise BUILTIN_CATEGORIES is used as fallback
      if (list.length > 0) {
        setCategories(list)
      }
    }).catch(() => {})
  }, [])

  const handleLocationSelect = (latlng) => {
    setSelectedLocation(latlng)
    setValue('latitude', latlng.lat)
    setValue('longitude', latlng.lng)
    // Reverse geocode using Nominatim
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`)
      .then(r => r.json())
      .then(data => {
        const addr = data.display_name || ''
        const detectedCity = data.address?.city || data.address?.town || data.address?.village || ''
        const normalizedCity = AVAILABLE_CITIES.find(
          city => city.toLowerCase() === detectedCity.toLowerCase()
        ) || detectedCity

        setValue('address', addr)
        setValue('city', normalizedCity)
        setValue('pincode', data.address?.postcode || '')
      })
      .catch(() => {})
  }

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported')
    navigator.geolocation.getCurrentPosition(
      (pos) => handleLocationSelect({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast.error('Could not get location')
    )
  }

  const onSubmit = async (data) => {
    if (!data.category) return toast.error('Please select a category')
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') formData.append(k, v)
      })
      images.forEach(img => formData.append('images', img))
      videos.forEach(vid => formData.append('videos', vid))

      const { data: complaint } = await complaintService.createComplaint(formData)
      const prediction = complaint.prediction
      const approvalPercent = prediction?.approval_chance_percent ?? prediction?.confidence ? Math.round((prediction?.confidence ?? 0) * 100) : null
      toast.success(
        `Complaint ${complaint.complaint_id} submitted successfully! Approval chance: ${approvalPercent ?? 'N/A'}%. Estimated completion: ${prediction?.estimated_resolution_hours ?? prediction?.resolution_time_hours ?? 'N/A'} hours.`
      )
      navigate(`/citizen/complaints/${complaint.id}`)
    } catch (err) {
      const errors = err.response?.data
      if (typeof errors === 'object') {
        Object.values(errors).flat().forEach(msg => toast.error(msg))
      } else {
        toast.error('Failed to submit complaint')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Raise a Complaint</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Fill in the details to submit your civic complaint</p>
      </div>

      {/* Emergency Toggle */}
      <motion.div
        animate={{ backgroundColor: isEmergency ? 'rgb(254 242 242)' : 'rgb(249 250 251)' }}
        className="rounded-xl p-4 border-2 transition-colors"
        style={{ borderColor: isEmergency ? '#ef4444' : '#e5e7eb' }}
      >
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" {...register('is_emergency')} className="w-5 h-5 accent-red-500" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Warning className={isEmergency ? 'text-red-500' : 'text-gray-400'} fontSize="small" />
              Mark as Emergency
            </p>
            <p className="text-xs text-gray-500">Use only for urgent issues requiring immediate attention</p>
          </div>
        </label>
      </motion.div>

      {/* ── Duplicate Detection Banner ─────────────────────────────────────── */}
      <AnimatePresence>
        {checkingDups && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-50 border border-neutral-200 rounded px-4 py-2"
          >
            <span className="w-3 h-3 border-2 border-neutral-300 border-t-primary-600 rounded-full animate-spin flex-shrink-0" />
            Checking for similar complaints...
          </motion.div>
        )}

        {!checkingDups && duplicates.length > 0 && showDupBanner && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="border border-amber-300 bg-amber-50 rounded p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
                <div>
                  <p className="font-semibold text-amber-800 text-sm">
                    {duplicates.length} similar complaint{duplicates.length > 1 ? 's' : ''} already filed
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Please check if your issue was already reported. You can support an existing complaint instead of filing a new one.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowDupBanner(false)}
                className="text-amber-500 hover:text-amber-700 flex-shrink-0">
                <Close fontSize="small" />
              </button>
            </div>

            {/* Duplicate list */}
            <div className="mt-3 space-y-2">
              {duplicates.map((dup, i) => (
                <div key={i} className="bg-white border border-amber-200 rounded p-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">{dup.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-neutral-500 font-mono">{dup.complaint_id}</span>
                      <span className={`badge text-xs ${
                        dup.status === 'resolved' || dup.status === 'closed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {dup.status.replace(/_/g, ' ')}
                      </span>
                      {dup.city && <span className="text-xs text-neutral-400">{dup.area || dup.city}</span>}
                      <span className="text-xs text-neutral-400">{safeFormat(dup.submitted_at, 'dd MMM yyyy')}</span>
                      <span className="text-xs font-semibold text-amber-600">
                        {dup.similarity_pct}% match
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/citizen/complaints/${dup.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium flex-shrink-0 hover:underline"
                  >
                    View <OpenInNew style={{ fontSize: 12 }} />
                  </Link>
                </div>
              ))}
            </div>

            <p className="text-xs text-amber-600 mt-2">
              Still want to file a new complaint? Continue filling the form below.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Complaint Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input className="input-field" placeholder="Brief title of the issue"
              {...register('title', { required: 'Title is required', minLength: { value: 10, message: 'Min 10 characters' } })} />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
            <select className="input-field" {...register('category', { required: 'Category is required' })}>
              <option value="">Select category</option>
              {(categories.length > 0 ? categories : BUILTIN_CATEGORIES).map(cat => (
                <option key={cat.id} value={cat.slug || cat.id}>
                  {CATEGORY_ICONS[cat.slug] || '📋'} {cat.name}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {['low', 'medium', 'high', 'emergency'].map(p => (
                <label key={p} className="cursor-pointer">
                  <input type="radio" value={p} {...register('priority')} className="sr-only" />
                  <div className={`text-center py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all
                    ${watch('priority') === p
                      ? p === 'emergency' ? 'border-red-500 bg-red-50 text-red-700'
                        : p === 'high' ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : p === 'medium' ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <textarea rows={4} className="input-field resize-none" placeholder="Describe the issue in detail..."
              {...register('description', { required: 'Description is required', minLength: { value: 20, message: 'Min 20 characters' } })} />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('is_anonymous')} className="w-4 h-4 accent-primary-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Submit anonymously</span>
          </label>
        </div>

        {/* Location */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Location</h2>
            <button type="button" onClick={handleGetCurrentLocation}
              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium">
              <LocationOn fontSize="small" /> Use My Location
            </button>
          </div>
          <p className="text-xs text-gray-500">Click on the map to pin the exact location of the issue</p>
          <ComplaintsMap
            center={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : [20.5937, 78.9629]}
            zoom={selectedLocation ? 15 : 5}
            height="300px"
            onLocationSelect={handleLocationSelect}
            selectedLocation={selectedLocation}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
              <input className="input-field" placeholder="Street address" {...register('address')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City *</label>
              <select className="input-field" {...register('city', { required: 'City is required' })}>
                <option value="">Select city</option>
                {AVAILABLE_CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ward Number</label>
              <input className="input-field" placeholder="Ward no." {...register('ward_number')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pincode</label>
              <input className="input-field" placeholder="Pincode" {...register('pincode')} />
            </div>
          </div>
        </div>

        {/* Media Upload */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Photos & Videos</h2>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload Images (max 10MB each)
            </label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-primary-400 transition-colors bg-gray-50 dark:bg-gray-700/30">
              <CloudUpload className="text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Click to upload images</span>
              <span className="text-xs text-gray-400">JPG, PNG, WEBP</span>
              <input type="file" multiple accept="image/*" className="hidden"
                onChange={e => setImages(Array.from(e.target.files))} />
            </label>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={URL.createObjectURL(img)} alt="" className="w-16 h-16 object-cover rounded-lg" />
                    <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                      <Close style={{ fontSize: 12 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Videos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload Video (max 50MB)
            </label>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-primary-400 transition-colors bg-gray-50 dark:bg-gray-700/30">
              <span className="text-sm text-gray-500">Click to upload video</span>
              <span className="text-xs text-gray-400">MP4, AVI, MOV</span>
              <input type="file" accept="video/*" className="hidden"
                onChange={e => setVideos(Array.from(e.target.files))} />
            </label>
            {videos.length > 0 && (
              <p className="text-xs text-green-600 mt-1">✓ {videos[0].name}</p>
            )}
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 text-base">
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </span>
          ) : '🚀 Submit Complaint'}
        </button>
      </form>
    </div>
  )
}
