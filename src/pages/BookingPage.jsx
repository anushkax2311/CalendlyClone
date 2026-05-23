import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { getEventTypeBySlug, getAvailableSlots, createBooking } from '../api/index.js'
import './BookingPage.css'

const SEED_EVENT = {
  id: 1, name: '30 Minute Meeting', duration_minutes: 30,
  slug: '30min', color: '#006bff', location: 'Google Meet',
  host_name: 'Anushka Patel', host_timezone: 'Asia/Kolkata',
  buffer_before: 0, buffer_after: 5,
  questions: [
    { id: 'q1', label: 'What would you like to discuss?', required: false },
    { id: 'q2', label: 'Please share any relevant links or docs', required: false },
  ],
}

function generateSlots(date) {
  const slots = []
  const dow = dayjs(date).day()
  if (dow === 0 || dow === 6) return []
  for (let h = 9; h < 17; h++)
    for (let m = 0; m < 60; m += 30)
      slots.push({ time: `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`, available: true })
  return slots
}

function formatSlot(time) {
  const [h, m] = time.split(':').map(Number)
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${m.toString().padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`
}

export default function BookingPage() {
  const { slug } = useParams()
  const navigate  = useNavigate()

  const [event,        setEvent]        = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'))
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots,        setSlots]        = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [step,         setStep]         = useState('calendar')
  const [form,         setForm]         = useState({ name: '', email: '' })
  const [answers,      setAnswers]      = useState({})
  const [submitting,   setSubmitting]   = useState(false)
  const [errors,       setErrors]       = useState({})

  useEffect(() => {
    getEventTypeBySlug(slug)
      .then(r => setEvent(r.data))
      .catch(() => setEvent(SEED_EVENT))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!selectedDate) return
    setSlotsLoading(true)
    setSelectedSlot(null)
    getAvailableSlots(slug, selectedDate.format('YYYY-MM-DD'))
      .then(r => setSlots(r.data))
      .catch(() => setSlots(generateSlots(selectedDate)))
      .finally(() => setSlotsLoading(false))
  }, [selectedDate])

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    event?.questions?.forEach(q => {
      if (q.required && !answers[q.id]?.trim()) e[q.id] = 'This field is required'
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const [h, m] = selectedSlot.split(':').map(Number)
      const startTime = selectedDate.hour(h).minute(m).second(0).toISOString()
      const endTime   = selectedDate.hour(h).minute(m + (event?.duration_minutes || 30)).second(0).toISOString()
      const answersArray = (event?.questions || []).map(q => ({
        question: q.label, answer: answers[q.id] || '',
      }))
      await createBooking({
        event_type_slug: slug, invitee_name: form.name,
        invitee_email: form.email, start_time: startTime,
        end_time: endTime, answers: answersArray,
      })
    } catch {}
    navigate(`/book/${slug}/confirmed`, {
      state: {
        event,
        date: selectedDate.format('dddd, MMMM D, YYYY'),
        time: formatSlot(selectedSlot),
        invitee: form,
        answers: (event?.questions || [])
          .map(q => ({ question: q.label, answer: answers[q.id] || '' }))
          .filter(a => a.answer),
      },
    })
  }

  // Calendar helpers
  const today    = dayjs()
  const firstDow = currentMonth.startOf('month').day()
  const calCells = []
  for (let i = 0; i < firstDow; i++) calCells.push(null)
  for (let d = 1; d <= currentMonth.daysInMonth(); d++) calCells.push(currentMonth.date(d))
  const isDisabled = d => !d || d.isBefore(today, 'day') || d.day() === 0 || d.day() === 6

  if (loading) return <div className="booking-loading"><div className="spinner-blue" /></div>

  return (
    <div className="booking-page">
      <div className="booking-card">

        {/* ── Left: event info ──────────────────────────────── */}
        <div className="booking-left">
          <div className="booking-host-avatar">{(event?.host_name || 'A')[0]}</div>
          <p className="booking-host-name">{event?.host_name || 'Anushka Patel'}</p>
          <h1 className="booking-event-name">{event?.name}</h1>

          <div className="booking-meta-list">
            <div className="booking-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>{event?.duration_minutes} min</span>
            </div>
            {event?.location && (
              <div className="booking-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
                  <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                  <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0z"/>
                </svg>
                <span>{event?.location}</span>
              </div>
            )}
            {(event?.buffer_before > 0 || event?.buffer_after > 0) && (
              <div className="booking-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                <span>
                  {event?.buffer_before > 0 && `${event.buffer_before}m prep`}
                  {event?.buffer_before > 0 && event?.buffer_after > 0 && ' · '}
                  {event?.buffer_after > 0 && `${event.buffer_after}m wrap-up`}
                </span>
              </div>
            )}
            {selectedDate && selectedSlot && (
              <div className="booking-meta-item selected-time">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#006bff" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span style={{ color:'var(--blue-primary)', fontWeight:500 }}>
                  {formatSlot(selectedSlot)}, {selectedDate.format('ddd, MMM D, YYYY')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: calendar + slots OR form ───────────────── */}
        <div className="booking-right">

          {step === 'calendar' && (
            <>
              {/* Heading always on top */}
              <h2 className="booking-panel-title">Select a Date &amp; Time</h2>

              <div className="booking-calendar-panel">
                {/* Calendar */}
                <div className="mini-calendar">
                  <div className="cal-nav">
                    <button className="cal-nav-btn"
                      onClick={() => setCurrentMonth(m => m.subtract(1,'month'))}
                      disabled={currentMonth.isSame(today.startOf('month'),'month')}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6"/>
                      </svg>
                    </button>
                    <span className="cal-month">{currentMonth.format('MMMM YYYY')}</span>
                    <button className="cal-nav-btn" onClick={() => setCurrentMonth(m => m.add(1,'month'))}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  </div>

                  <div className="cal-grid">
                    {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                      <div key={d} className="cal-dow">{d}</div>
                    ))}
                    {calCells.map((d, i) => (
                      <button key={i} disabled={!d || isDisabled(d)}
                        className={[
                          'cal-day',
                          !d ? 'empty' : '',
                          d && isDisabled(d) ? 'disabled' : '',
                          d && selectedDate && d.isSame(selectedDate,'day') ? 'selected' : '',
                          d && d.isSame(today,'day') ? 'today' : '',
                        ].join(' ')}
                        onClick={() => d && !isDisabled(d) && setSelectedDate(d)}>
                        {d ? d.date() : ''}
                      </button>
                    ))}
                  </div>

                  <div className="cal-timezone">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    <span>{event?.host_timezone || 'Asia/Kolkata'}</span>
                  </div>
                </div>

                {/* Time slots — only shown after date selected */}
                {selectedDate && (
                  <div className="time-slots-panel">
                    <h3 className="slots-title">{selectedDate.format('dddd, MMMM D')}</h3>

                    {slotsLoading ? (
                      <div style={{ display:'flex', justifyContent:'center', padding:'24px' }}>
                        <div className="spinner-blue" style={{ width:24, height:24 }} />
                      </div>
                    ) : slots.filter(s => s.available).length === 0 ? (
                      <p className="no-slots">No available slots for this day.</p>
                    ) : (
                      <div className="slots-list">
                        {slots.filter(s => s.available).map(slot => (
                          <button key={slot.time}
                            className={`slot-btn ${selectedSlot === slot.time ? 'selected' : ''}`}
                            onClick={() => setSelectedSlot(slot.time)}>
                            {selectedSlot === slot.time ? (
                              <div className="slot-confirm-row">
                                <span>{formatSlot(slot.time)}</span>
                                <button className="btn-confirm-slot"
                                  onClick={e => { e.stopPropagation(); setStep('form') }}>
                                  Confirm
                                </button>
                              </div>
                            ) : formatSlot(slot.time)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 'form' && (
            <div className="booking-form-panel fade-in">
              <button className="btn-back" onClick={() => setStep('calendar')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Back
              </button>
              <h2 className="booking-panel-title">Enter Details</h2>
              <p className="form-time-display">
                {formatSlot(selectedSlot)} · {selectedDate.format('dddd, MMMM D, YYYY')}
              </p>

              <div className="booking-form">
                <div className="form-group">
                  <label>Name <span className="required">*</span></label>
                  <input type="text" placeholder="Your full name" value={form.name}
                    className={errors.name ? 'input-error' : ''}
                    onChange={e => { setForm(f=>({...f,name:e.target.value})); setErrors(er=>({...er,name:''})) }} />
                  {errors.name && <span className="field-error">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label>Email <span className="required">*</span></label>
                  <input type="email" placeholder="you@example.com" value={form.email}
                    className={errors.email ? 'input-error' : ''}
                    onChange={e => { setForm(f=>({...f,email:e.target.value})); setErrors(er=>({...er,email:''})) }} />
                  {errors.email && <span className="field-error">{errors.email}</span>}
                </div>

                {event?.questions?.length > 0 && (
                  <div className="custom-questions">
                    <div className="custom-questions-divider"><span>Additional Information</span></div>
                    {event.questions.map(q => (
                      <div key={q.id} className="form-group">
                        <label>
                          {q.label}
                          {q.required && <span className="required"> *</span>}
                        </label>
                        <textarea rows={2} placeholder="Your answer..."
                          className={`question-textarea ${errors[q.id] ? 'input-error' : ''}`}
                          value={answers[q.id] || ''}
                          onChange={e => { setAnswers(a=>({...a,[q.id]:e.target.value})); setErrors(er=>({...er,[q.id]:''})) }} />
                        {errors[q.id] && <span className="field-error">{errors[q.id]}</span>}
                      </div>
                    ))}
                  </div>
                )}

                <button className="btn-schedule" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Scheduling...' : 'Schedule Event'}
                </button>
                <p className="booking-notice">
                  By proceeding, you agree to our <a href="#">Terms of Use</a> and <a href="#">Privacy Notice</a>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
