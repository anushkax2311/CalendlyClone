import React, { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { getPublicBooking, getAvailableSlots, rescheduleBooking } from '../api/index.js'
import './ReschedulePage.css'

function formatSlot(time) {
  const [h, m] = time.split(':').map(Number)
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${m.toString().padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`
}

function generateSlots(date) {
  const slots = []
  const dow = dayjs(date).day()
  if (dow === 0 || dow === 6) return []
  for (let h = 9; h < 17; h++)
    for (let m = 0; m < 60; m += 30)
      slots.push({ time:`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`, available:true })
  return slots
}

export default function ReschedulePage() {
  const { bookingId } = useParams()
  const { state }     = useLocation()
  const navigate      = useNavigate()

  const [booking,       setBooking]       = useState(state?.meeting || null)
  const [loading,       setLoading]       = useState(!state?.meeting)
  const [currentMonth,  setCurrentMonth]  = useState(dayjs().startOf('month'))
  const [selectedDate,  setSelectedDate]  = useState(null)
  const [slots,         setSlots]         = useState([])
  const [selectedSlot,  setSelectedSlot]  = useState(null)
  const [submitting,    setSubmitting]    = useState(false)
  const [done,          setDone]          = useState(false)
  const [error,         setError]         = useState('')

  // Load booking if not passed via state
  useEffect(()=>{
    if (booking) return
    getPublicBooking(bookingId)
      .then(r => setBooking(r.data))
      .catch(()=>navigate('/meetings'))
      .finally(()=>setLoading(false))
  },[])

  // Load slots when date selected
  useEffect(()=>{
    if (!selectedDate || !booking) return
    const slug = booking.event_slug || booking.event_type_slug || '30min'
    getAvailableSlots(slug, selectedDate.format('YYYY-MM-DD'))
  .then(r => setSlots(r.data))
  .catch(() => {
    setSlots([])
    setError('Unable to load available slots.')
  })
    setSelectedSlot(null)
  },[selectedDate])

  const handleConfirm = async () => {
    if (!selectedSlot || !selectedDate) return
    setSubmitting(true); setError('')
    try {
      const duration = booking.duration_minutes ||
        dayjs(booking.end_time).diff(dayjs(booking.start_time), 'minute') || 30
      const [h, m] = selectedSlot.split(':').map(Number)
      const newStart = selectedDate.hour(h).minute(m).second(0).format('YYYY-MM-DDTHH:mm:ss')

const newEnd = selectedDate
  .hour(h)
  .minute(m + duration)
  .second(0)
  .format('YYYY-MM-DDTHH:mm:ss')
      await rescheduleBooking(bookingId, { new_start_time: newStart, new_end_time: newEnd })
      setDone(true)
    } catch (e) {
      setError(e?.response?.data?.detail || 'That slot is no longer available. Please pick another.')
      setSelectedSlot(null)
    } finally { setSubmitting(false) }
  }

  // Calendar helpers
  const today    = dayjs()
  const firstDow = currentMonth.startOf('month').day()
  const calCells = []
  for (let i = 0; i < firstDow; i++) calCells.push(null)
  for (let d = 1; d <= currentMonth.daysInMonth(); d++) calCells.push(currentMonth.date(d))
  const isDisabled = (d) => !d || d.isBefore(today,'day') || d.day()===0 || d.day()===6

  if (loading) return <div className="rs-loading"><div className="spinner-blue" /></div>

  if (done) return (
    <div className="rs-page">
      <div className="rs-card fade-in">
        <div className="rs-done-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h1 className="rs-done-title">Meeting Rescheduled!</h1>
        <p className="rs-done-sub">
          Your meeting with <strong>{booking?.invitee_name}</strong> has been moved to{' '}
          <strong>{formatSlot(selectedSlot)}, {selectedDate.format('dddd, MMMM D, YYYY')}</strong>.
        </p>
        <p className="rs-done-email">A confirmation email has been sent to {booking?.invitee_email}.</p>
        <button className="btn-back-meetings" onClick={()=>navigate('/meetings')}>
          Back to Meetings
        </button>
      </div>
    </div>
  )

  return (
    <div className="rs-page">
      <div className="rs-topbar">
        <button className="rs-back-btn" onClick={()=>navigate('/meetings')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Meetings
        </button>
      </div>

      <div className="rs-body">
        {/* Left info panel */}
        <div className="rs-left">
          <div className="rs-avatar">{(booking?.invitee_name||'?')[0]}</div>
          <p className="rs-invitee-label">Rescheduling for</p>
          <h2 className="rs-invitee-name">{booking?.invitee_name}</h2>
          <p className="rs-invitee-email">{booking?.invitee_email}</p>

          <div className="rs-divider" />

          <p className="rs-current-label">Current time</p>
          <div className="rs-current-time">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>
              {dayjs(booking?.start_time).format('ddd, MMM D')} at{' '}
              {dayjs(booking?.start_time).format('h:mm A')}
            </span>
          </div>

          <p className="rs-event-name">{booking?.event_name}</p>

          {selectedDate && selectedSlot && (
            <>
              <div className="rs-divider" />
              <p className="rs-current-label">New time</p>
              <div className="rs-new-time">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#006bff" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>{formatSlot(selectedSlot)}, {selectedDate.format('MMM D, YYYY')}</span>
              </div>
            </>
          )}
        </div>

        {/* Center: calendar */}
        <div className="rs-center">
          <h2 className="rs-section-title">Pick a new date & time</h2>

          <div className="cal-nav">
            <button className="cal-nav-btn"
              onClick={()=>setCurrentMonth(m=>m.subtract(1,'month'))}
              disabled={currentMonth.isSame(today.startOf('month'),'month')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span className="cal-month">{currentMonth.format('MMMM YYYY')}</span>
            <button className="cal-nav-btn" onClick={()=>setCurrentMonth(m=>m.add(1,'month'))}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          <div className="cal-grid">
            {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d=><div key={d} className="cal-dow">{d}</div>)}
            {calCells.map((d,i)=>(
              <button key={i} disabled={!d||isDisabled(d)}
                className={`cal-day ${!d?'empty':''} ${d&&isDisabled(d)?'disabled':''} ${d&&selectedDate&&d.isSame(selectedDate,'day')?'selected':''} ${d&&d.isSame(today,'day')?'today':''}`}
                onClick={()=>d&&!isDisabled(d)&&setSelectedDate(d)}>
                {d?d.date():''}
              </button>
            ))}
          </div>
        </div>

        {/* Right: time slots */}
        <div className="rs-right">
          {!selectedDate ? (
            <div className="rs-no-date">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d0d9e8" strokeWidth="1">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <p>Select a date to see available times</p>
            </div>
          ) : (
            <>
              <h3 className="rs-slots-title">{selectedDate.format('dddd, MMMM D')}</h3>
              {error && <div className="rs-error">{error}</div>}
              <div className="rs-slots-list">
                {slots.filter(s=>s.available).length === 0 ? (
                  <p className="rs-no-slots">No available slots for this day.</p>
                ) : (
                  slots.filter(s=>s.available).map(slot=>(
                    <button key={slot.time}
                      className={`rs-slot-btn ${selectedSlot===slot.time?'selected':''}`}
                      onClick={()=>setSelectedSlot(slot.time)}>
                      {selectedSlot===slot.time ? (
                        <div className="slot-confirm-row">
                          <span>{formatSlot(slot.time)}</span>
                          <button className="btn-confirm-reschedule"
                            onClick={e=>{e.stopPropagation();handleConfirm()}}
                            disabled={submitting}>
                            {submitting ? '...' : 'Confirm'}
                          </button>
                        </div>
                      ) : formatSlot(slot.time)}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
