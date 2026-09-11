import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
)

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
    tooltip: { cornerRadius: 8, padding: 10 },
  },
}

export function BarChart({ labels, datasets, title, height = 300 }) {
  return (
    <div style={{ height }}>
      <Bar
        data={{ labels, datasets }}
        options={{
          ...defaultOptions,
          plugins: { ...defaultOptions.plugins, title: { display: !!title, text: title } },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
          },
        }}
      />
    </div>
  )
}

export function LineChart({ labels, datasets, title, height = 300, fill = false }) {
  return (
    <div style={{ height }}>
      <Line
        data={{ labels, datasets: datasets.map(d => ({ ...d, fill, tension: 0.4 })) }}
        options={{
          ...defaultOptions,
          plugins: { ...defaultOptions.plugins, title: { display: !!title, text: title } },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
          },
        }}
      />
    </div>
  )
}

export function PieChart({ labels, data, colors, height = 280 }) {
  return (
    <div style={{ height }}>
      <Pie
        data={{
          labels,
          datasets: [{
            data,
            backgroundColor: colors || [
              '#3b82f6','#22c55e','#f59e0b','#ef4444',
              '#8b5cf6','#06b6d4','#f97316','#84cc16',
            ],
            borderWidth: 2,
            borderColor: '#fff',
          }],
        }}
        options={defaultOptions}
      />
    </div>
  )
}

export function DoughnutChart({ labels, data, colors, height = 280 }) {
  return (
    <div style={{ height }}>
      <Doughnut
        data={{
          labels,
          datasets: [{
            data,
            backgroundColor: colors || [
              '#3b82f6','#22c55e','#f59e0b','#ef4444',
              '#8b5cf6','#06b6d4','#f97316','#84cc16',
            ],
            borderWidth: 2,
            borderColor: '#fff',
          }],
        }}
        options={{ ...defaultOptions, cutout: '65%' }}
      />
    </div>
  )
}
