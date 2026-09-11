import { useState, useEffect } from 'react'
import { complaintService } from '../../services/complaintService'
import ComplaintsMap from '../../components/maps/ComplaintsMap'
import { StatusBadge, PriorityBadge } from '../../components/common/StatusBadge'
import { PageLoader } from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import toast from 'react-hot-toast'
import { LocationOn, MyLocation } from '@mui/icons-material'
import { Link } from 'react-router-dom'

export default function NearbyComplaints() {
  const [complaints, setComplaints] = useState([])
  const [location, setLocation] = useState(null)
  const [radius, setRadius] = useState(5)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)

  const fetchNearby = async (lat, lng, r) => {
    setLoading(true)
    try {
      const { data } = await complaintService.getNearbyComplaints({ lat, lng, radius: r })
      setComplaints(Array.isArray(data) ? data : (data.results || []))
    } catch { toast.error('Failed to fetch nearby complaints') }
    finally { setLoading(false) }
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocation(loc)
        fetchNearby(loc.lat, loc.lng, radius)
        setLocating(false)
      },
      () => { toast.error('Could not get location'); setLocating(false) }
    )
  }

  useEffect(() => {
    if (location) fetchNearby(location.lat, location.lng, radius)
  }, [radius])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nearby Complaints</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">View civic issues reported near your location</p>
      </div>

      <div className="card flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <button onClick={handleGetLocation} disabled={locating}
          className="btn-primary flex items-center gap-2 text-sm">
          <MyLocation fontSize="small" />
          {locating ? 'Getting location...' : 'Use My Location'}
        </button>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Radius:</label>
          <select className="input-field w-32 text-sm" value={radius} onChange={e => setRadius(Number(e.target.value))}>
            {[1, 2, 5, 10, 20].map(r => <option key={r} value={r}>{r} km</option>)}
          </select>
        </div>
        {location && (
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <LocationOn style={{ fontSize: 14 }} />
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </p>
        )}
      </div>

      {!location ? (
        <EmptyState
          title="Share your location"
          description="Click 'Use My Location' to see complaints reported near you."
          action={
            <button onClick={handleGetLocation} className="btn-primary text-sm flex items-center gap-2 mx-auto">
              <MyLocation fontSize="small" /> Get My Location
            </button>
          }
        />
      ) : loading ? <PageLoader /> : (
        <>
          <ComplaintsMap
            complaints={complaints}
            center={[location.lat, location.lng]}
            zoom={13}
            height="400px"
            selectedLocation={location}
            showRadius
            radius={radius * 1000}
          />
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
              {complaints.length} complaint{complaints.length !== 1 ? 's' : ''} within {radius} km
            </h2>
            {complaints.length === 0 ? (
              <EmptyState title="No complaints nearby" description="No issues reported in this area." />
            ) : (
              <div className="space-y-3">
                {complaints.map(c => (
                  <Link key={c.id} to={`/citizen/complaints/${c.id}`}
                    className="card block hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{c.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {c.category_name} · {c.area || c.city}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge status={c.status} />
                        <PriorityBadge priority={c.priority} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
