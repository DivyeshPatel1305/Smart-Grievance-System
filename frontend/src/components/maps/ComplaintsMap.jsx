import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { StatusBadge, PriorityBadge } from '../common/StatusBadge'
import { Link } from 'react-router-dom'

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const categoryColors = {
  road_damage: '#ef4444',
  garbage: '#84cc16',
  street_light: '#f59e0b',
  water_supply: '#3b82f6',
  drainage: '#06b6d4',
  electricity: '#f97316',
  traffic: '#8b5cf6',
  illegal_parking: '#ec4899',
  public_transport: '#14b8a6',
  government_office: '#6366f1',
  healthcare: '#22c55e',
  education: '#a855f7',
  environment: '#10b981',
  others: '#6b7280',
}

function createColoredIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${color};border:3px solid white;
      transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  })
}

function LocationPicker({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect && onLocationSelect(e.latlng)
    },
  })
  return null
}

export default function ComplaintsMap({
  complaints = [],
  center = [20.5937, 78.9629],
  zoom = 5,
  height = '400px',
  onLocationSelect,
  selectedLocation,
  showRadius = false,
  radius = 5000,
}) {
  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {onLocationSelect && <LocationPicker onLocationSelect={onLocationSelect} />}

        {selectedLocation && (
          <>
            <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
            {showRadius && (
              <Circle
                center={[selectedLocation.lat, selectedLocation.lng]}
                radius={radius}
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }}
              />
            )}
          </>
        )}

        {complaints.map((complaint) => {
          if (!complaint.latitude || !complaint.longitude) return null
          const color = categoryColors[complaint.category?.slug] || '#6b7280'
          return (
            <Marker
              key={complaint.id}
              position={[parseFloat(complaint.latitude), parseFloat(complaint.longitude)]}
              icon={createColoredIcon(color)}
            >
              <Popup maxWidth={280}>
                <div className="p-1">
                  <p className="font-semibold text-sm text-gray-900 mb-1">{complaint.title}</p>
                  <p className="text-xs text-gray-500 mb-2">{complaint.address}</p>
                  <div className="flex gap-1 flex-wrap mb-2">
                    <StatusBadge status={complaint.status} />
                    <PriorityBadge priority={complaint.priority} />
                  </div>
                  {complaint.category_name && (
                    <p className="text-xs text-gray-500">📁 {complaint.category_name}</p>
                  )}
                  <Link
                    to={`/citizen/complaints/${complaint.id}`}
                    className="mt-2 block text-xs text-primary-600 hover:underline font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
