import React, { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import './AdminLayout.css'

const CalendlyLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="#006bff"/>
    <path d="M16 7C11.03 7 7 11.03 7 16s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 15.5c-3.59 0-6.5-2.91-6.5-6.5S12.41 9.5 16 9.5 22.5 12.41 22.5 16 19.59 22.5 16 22.5z" fill="white"/>
    <path d="M16.5 12h-1.5v5l4.25 2.55.75-1.23-3.5-2.08V12z" fill="white"/>
  </svg>
)

const navItems = [
  {
    path: '/scheduling',
    label: 'Scheduling',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#006bff' : '#637488'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
      </svg>
    )
  },
  {
    path: '/meetings',
    label: 'Meetings',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#006bff' : '#637488'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    )
  },
  {
    path: '/availability',
    label: 'Availability',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#006bff' : '#637488'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    )
  },
  {
    path: '#contacts',
    label: 'Contacts',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    )
  },
  {
    path: '#workflows',
    label: 'Workflows',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="3"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="12" x2="6" y2="20"/>
        <line x1="12" y1="12" x2="18" y2="20"/>
        <circle cx="6" cy="20" r="2"/>
        <circle cx="18" cy="20" r="2"/>
      </svg>
    )
  },
  {
    path: '#integrations',
    label: 'Integrations & apps',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="9" height="9" rx="1"/>
        <rect x="13" y="2" width="9" height="9" rx="1"/>
        <rect x="13" y="13" width="9" height="9" rx="1"/>
        <rect x="2" y="13" width="9" height="9" rx="1"/>
      </svg>
    )
  },
  {
    path: '#routing',
    label: 'Routing',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 3 21 3 21 8"/>
        <line x1="4" y1="20" x2="21" y2="3"/>
        <polyline points="21 16 21 21 16 21"/>
        <line x1="15" y1="15" x2="21" y2="21"/>
      </svg>
    )
  }
]

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const createRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e) => {
      if (createRef.current && !createRef.current.contains(e.target))
        setCreateOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
}, [])
  return (
    <div className={`admin-layout ${collapsed ? 'collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-area">
            <CalendlyLogo />
            {!collapsed && <span className="logo-text">Calendly</span>}
          </div>
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {collapsed
                ? <polyline points="9 18 15 12 9 6"/>
                : <polyline points="15 18 9 12 15 6"/>
              }
            </svg>
          </button>
        </div>

        <div ref={createRef} style={{position:'relative', margin:'12px'}}>
  <button className="create-btn" style={{margin:0, width:'100%'}}
    onClick={() => setCreateOpen(o => !o)}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
    {!collapsed && <span>Create</span>}
  </button>

  {createOpen && (
    <div className="create-dropdown">
      <div className="create-dropdown-title">New</div>
      <button className="create-dropdown-item" onClick={() => {
        setCreateOpen(false)
        navigate('/scheduling', { state: { openCreate: true } })
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        Event type
        <span className="create-dropdown-sub">Set up a new meeting type</span>
      </button>
      <button className="create-dropdown-item" onClick={() => {
        setCreateOpen(false)
        navigate('/availability', { state: { openCreate: true } })
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        Availability schedule
        <span className="create-dropdown-sub">Add a new schedule</span>
      </button>
    </div>
  )}
</div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            item.path.startsWith('#') ? (
              <div key={item.path} className="nav-item disabled">
                {item.icon(false)}
                {!collapsed && <span>{item.label}</span>}
              </div>
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                {({ isActive }) => (
                  <>
                    {item.icon(isActive)}
                    {!collapsed && <span>{item.label}</span>}
                  </>
                )}
              </NavLink>
            )
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink to="#upgrade" className="upgrade-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {!collapsed && <span>Upgrade plan</span>}
          </NavLink>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <div className="topbar">
          <div className="topbar-right">
            <button className="topbar-icon-btn" title="Invite">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
            </button>
            <div className="avatar">A</div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
