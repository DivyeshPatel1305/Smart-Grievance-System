import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const STATS = [
  { label: 'Complaints Registered', value: '10,000+' },
  { label: 'Resolved', value: '8,500+' },
  { label: 'Departments', value: '7' },
  { label: 'Cities Covered', value: '4' },
]

const FEATURES = [
  { icon: '📝', title: 'Lodge Grievance', desc: 'Submit civic complaints online 24×7 with photo/video evidence and location pin.' },
  { icon: '📍', title: 'Track Status', desc: 'Get real-time updates at every stage from submission to resolution.' },
  { icon: '💬', title: 'Direct Chat', desc: 'Communicate directly with the assigned officer for quick resolution.' },
  { icon: '📊', title: 'Transparency', desc: 'View public complaint feed and department performance reports.' },
  { icon: '🔔', title: 'Notifications', desc: 'Receive instant email and in-app alerts on every status change.' },
  { icon: '🤖', title: 'AI Routing', desc: 'ML-powered category detection automatically routes complaints to the right department.' },
]

const HOW = [
  { step: '1', title: 'Register & Login', desc: 'Create a citizen account using your email.' },
  { step: '2', title: 'Lodge Complaint', desc: 'Fill the complaint form with category, location and attachments.' },
  { step: '3', title: 'Track & Chat', desc: 'Monitor progress and chat with the assigned officer.' },
  { step: '4', title: 'Resolve & Rate', desc: 'Confirm resolution and rate the service.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans">

      {/* ── Top utility bar ── */}
      <div className="gov-strip">
        <span>Government of India &nbsp;|&nbsp; भारत सरकार</span>
        <span className="hidden sm:block">Screen Reader Access &nbsp;|&nbsp; Skip to Main Content</span>
      </div>

      {/* ── Header ── */}
      <header className="gov-header">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Emblem placeholder */}
          <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
            <img src="/emblem.png" alt="Emblem of India"
              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
              className="w-14 h-14 object-contain" />
            <div className="w-14 h-14 bg-primary-600 rounded-full hidden items-center justify-center">
              <span className="text-white text-xs font-bold text-center leading-tight">GOV<br/>IN</span>
            </div>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-primary-700 leading-tight">
              Smart Public Grievance &amp; Service Delivery Portal
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Department of Administrative Reforms &amp; Public Grievances
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/login" className="btn-secondary text-xs py-2 px-4 hidden sm:inline-flex">
              Citizen Login
            </Link>
            <Link to="/officer-login" className="btn-primary text-xs py-2 px-4">
              Officer / Admin
            </Link>
          </div>
        </div>
        {/* Tricolor bar */}
        <div className="tricolor-bar" />
      </header>

      <main id="main-content">

        {/* ── Hero ── */}
        <section className="bg-primary-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="inline-block bg-saffron-500 text-white text-xs font-semibold px-3 py-1 rounded-sm mb-4 uppercase tracking-wider">
                Online Grievance Redressal System
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
                Your Voice Matters.<br />We Are Listening.
              </h2>
              <p className="text-primary-100 text-base leading-relaxed mb-8 max-w-lg">
                Lodge civic complaints, track their status in real time, and get them resolved
                by the concerned department — all from one platform.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/register" className="btn-saffron px-6 py-3 text-sm font-semibold">
                  Register as Citizen
                </Link>
                <Link to="/login" className="bg-white text-primary-700 hover:bg-primary-50 font-semibold px-6 py-3 rounded text-sm transition-colors">
                  Login to Portal
                </Link>
              </div>
              <p className="text-primary-200 text-xs mt-4">
                Already registered? &nbsp;
                <Link to="/login" className="text-white underline">Sign in here</Link>
              </p>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 gap-4"
            >
              {STATS.map((s, i) => (
                <div key={i} className="bg-white/10 border border-white/20 rounded p-5 text-center">
                  <p className="text-3xl font-bold text-saffron-400">{s.value}</p>
                  <p className="text-primary-100 text-sm mt-1">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Quick links ── */}
        <section className="bg-white border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 py-6 flex flex-wrap gap-4 justify-center">
            {[
              { to: '/register',    label: '📝 Lodge a Grievance' },
              { to: '/login',       label: '🔍 Track Grievance Status' },
              { to: '/officer-login', label: '👮 Officer Portal' },
            ].map((q, i) => (
              <Link key={i} to={q.to}
                className="flex items-center gap-2 border border-primary-200 text-primary-700
                           hover:bg-primary-50 rounded px-5 py-2.5 text-sm font-medium transition-colors">
                {q.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="section-title text-xl mb-8">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW.map((h, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative"
              >
                {i < HOW.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-neutral-200 z-0" style={{ width: 'calc(100% - 4rem)', left: '4rem' }} />
                )}
                <div className="card text-center relative z-10">
                  <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3">
                    {h.step}
                  </div>
                  <h3 className="font-semibold text-neutral-800 mb-1">{h.title}</h3>
                  <p className="text-neutral-500 text-sm leading-relaxed">{h.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="bg-neutral-100 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="section-title text-xl mb-8">Portal Features</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="card flex gap-4"
                >
                  <span className="text-3xl flex-shrink-0">{f.icon}</span>
                  <div>
                    <h3 className="font-semibold text-neutral-800 mb-1">{f.title}</h3>
                    <p className="text-neutral-500 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-primary-600 text-white py-12 text-center">
          <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-3">Have a Civic Issue?</h2>
            <p className="text-primary-100 mb-6 text-sm">
              Register on the portal and lodge your complaint. Our officers will act on it within the stipulated SLA.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/register" className="btn-saffron px-8 py-3">Register Now</Link>
              <Link to="/login" className="bg-white text-primary-700 hover:bg-primary-50 px-8 py-3 rounded font-semibold text-sm transition-colors">
                Login
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-primary-900 text-primary-200 text-xs py-6">
        <div className="tricolor-bar mb-4" />
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="font-semibold text-white mb-1">Smart Grievance Portal</p>
            <p className="leading-relaxed text-primary-300">
              An initiative by the Department of Administrative Reforms &amp; Public Grievances,
              Government of India.
            </p>
          </div>
          <div>
            <p className="font-semibold text-white mb-2">Quick Links</p>
            <ul className="space-y-1">
              <li><Link to="/register" className="hover:text-white transition-colors">Register</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Citizen Login</Link></li>
              <li><Link to="/officer-login" className="hover:text-white transition-colors">Officer Login</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white mb-2">Contact</p>
            <p>Helpdesk: 1800-XXX-XXXX</p>
            <p>Email: support@grievance.gov.in</p>
            <p className="mt-2">Mon – Sat: 9 AM – 6 PM</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-6 pt-4 border-t border-primary-700 flex flex-wrap gap-2 justify-between">
          <span>© {new Date().getFullYear()} Government of India. All rights reserved.</span>
          <span>Best viewed in Chrome 90+, Firefox 88+, Edge 90+</span>
        </div>
      </footer>
    </div>
  )
}
