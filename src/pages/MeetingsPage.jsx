import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { getBookings, cancelBooking } from '../api/index.js'
import './MeetingsPage.css'

const SEED = [
  { id:1, invitee_name:'Riya Sharma', invitee_email:'riya@example.com',
    start_time: dayjs().add(1,'day').hour(10).minute(0).toISOString(),
    end_time: dayjs().add(1,'day').hour(10).minute(30).toISOString(),
    event_name:'30 Minute Meeting', event_slug:'30min', status:'active', location:'Google Meet' },
  { id:2, invitee_name:'Arjun Mehta', invitee_email:'arjun@example.com',
    start_time: dayjs().add(3,'day').hour(14).minute(0).toISOString(),
    end_time: dayjs().add(3,'day').hour(14).minute(30).toISOString(),
    event_name:'30 Minute Meeting', event_slug:'30min', status:'active', location:'Zoom' },
  { id:3, invitee_name:'Priya Nair', invitee_email:'priya@example.com',
    start_time: dayjs().subtract(2,'day').hour(11).minute(0).toISOString(),
    end_time: dayjs().subtract(2,'day').hour(11).minute(15).toISOString(),
    event_name:'Coffee Chat', event_slug:'coffee-chat', status:'active', location:'Zoom' },
  { id:4, invitee_name:'Dev Patel', invitee_email:'dev@example.com',
    start_time: dayjs().subtract(5,'day').hour(9).minute(0).toISOString(),
    end_time: dayjs().subtract(5,'day').hour(10).minute(0).toISOString(),
    event_name:'Strategy Call', event_slug:'strategy-call', status:'cancelled', location:'Google Meet' },
]

function MeetingRow({ meeting, onCancel, onReschedule }) {
  const start      = dayjs(meeting.start_time)
  const end        = dayjs(meeting.end_time)
  const isPast     = start.isBefore(dayjs())
  const isCancelled = meeting.status === 'cancelled'

  return (
    <div className={`meeting-row ${isCancelled ? 'cancelled' : ''}`}>
      <div className="meeting-datetime">
        <span className="meeting-date">{start.format('ddd, MMM D, YYYY')}</span>
        <span className="meeting-time">{start.format('h:mm A')} – {end.format('h:mm A')}</span>
      </div>

      <div className="meeting-info">
        <span className="meeting-event-name">{meeting.event_name}</span>
        <div className="meeting-invitee">
          <div className="meeting-avatar">{meeting.invitee_name[0]}</div>
          <div>
            <p className="invitee-name">{meeting.invitee_name}</p>
            <p className="invitee-email">{meeting.invitee_email}</p>
          </div>
        </div>
        {meeting.location && (
          <span className="meeting-location">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            {meeting.location}
          </span>
        )}
      </div>

      <div className="meeting-actions">
        {isCancelled ? (
          <span className="badge cancelled">Cancelled</span>
        ) : isPast ? (
          <span className="badge past">Completed</span>
        ) : (
          <div className="meeting-action-btns">
            <button className="btn-reschedule-meeting" onClick={() => onReschedule(meeting)}>
              Reschedule
            </button>
            <button className="btn-cancel-meeting" onClick={() => onCancel(meeting.id)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MeetingsPage() {
  const navigate = useNavigate()
  const [meetings,   setMeetings]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState('upcoming')
  const [toast,      setToast]      = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 3000) }

  useEffect(()=>{
    getBookings()
      .then(r=>setMeetings(r.data))
      .catch(()=>setMeetings(SEED))
      .finally(()=>setLoading(false))
  },[])

  const handleCancel = async (id) => {
    if (!confirm('Cancel this meeting?')) return
    setMeetings(ms=>ms.map(m=>m.id===id?{...m,status:'cancelled'}:m))
    try { await cancelBooking(id) } catch {}
    showToast('Meeting cancelled')
  }

  const handleReschedule = (meeting) => {
    navigate(`/reschedule/${meeting.id}`, { state: { meeting } })
  }

  const now      = dayjs()
  const upcoming = meetings.filter(m => dayjs(m.start_time).isAfter(now) && m.status !== 'cancelled')
  const past     = meetings.filter(m => dayjs(m.start_time).isBefore(now) || m.status === 'cancelled')
  const displayed = activeTab === 'upcoming' ? upcoming : past

  return (
    <div className="meetings-page fade-in">
      <div className="notice-banner">
        <div><strong>Review our updated Terms of Use</strong><span> — We've updated our Terms of Use.</span></div>
        <div className="notice-actions">
          <button className="btn-review">Review terms</button>
          <button className="btn-accept-terms">Accept terms</button>
        </div>
      </div>

      <div className="page-inner">
        <div className="page-header">
          <h1 className="page-title">
            Meetings
            <button className="help-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
          </h1>
          <div className="meetings-filter">
            <div className="filter-select">
              <span>My Calendly</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="page-tabs">
          <button className={`tab-btn ${activeTab==='upcoming'?'active':''}`} onClick={()=>setActiveTab('upcoming')}>
            Upcoming {upcoming.length > 0 && <span className="tab-count">{upcoming.length}</span>}
          </button>
          <button className={`tab-btn ${activeTab==='past'?'active':''}`} onClick={()=>setActiveTab('past')}>
            Past
          </button>
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner" /></div>
        ) : displayed.length === 0 ? (
          <div className="empty-state-meetings">
            <div className="empty-calendar-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d0d9e8" strokeWidth="1">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <div className="empty-badge">0</div>
            </div>
            <p className="empty-msg">No {activeTab} meetings</p>
          </div>
        ) : (
          <div className="meetings-list">
            {displayed.map(m=>(
              <MeetingRow key={m.id} meeting={m} onCancel={handleCancel} onReschedule={handleReschedule} />
            ))}
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
