import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { getEventTypeBySlug, getAvailableSlots, createBooking } from '../api/index.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ HELPER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Generate time slots for a specific date (fallback if API fails)
const generateSlots = (date) => {
  const slots = [];
  const dow = dayjs(date).day();
  
  // No slots on weekends
  if (dow === 0 || dow === 6) return [];
  
  // Generate slots 9am-5pm, 30min intervals
  for (let h = 9; h < 17; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      slots.push({ time, available: true });
    }
  }
  return slots;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 STYLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const styles = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --blue-primary: #006bff;
  --blue-hover: #0059d9;
  --blue-light: #f0f5ff;
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafb;
  --bg-hover: #f0f0f0;
  --text-primary: #1a1a1a;
  --text-secondary: #637488;
  --text-muted: #999999;
  --border: #e5e7eb;
  --border-light: #f3f4f6;
  --red: #dc2626;
  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --radius-md: 8px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1a1a1a;
    --bg-secondary: #2a2a2a;
    --bg-hover: #333333;
    --text-primary: #ffffff;
    --text-secondary: #a8b5c2;
    --text-muted: #7a7a7a;
    --border: #333333;
    --border-light: #2a2a2a;
  }
}

body {
  font-family: var(--font);
  background: var(--bg-primary);
  color: var(--text-primary);
}

.booking-page {
  min-height: 100vh;
  background: var(--bg-primary);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0;
}

.booking-loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--blue-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.booking-card {
  display: flex;
  width: 100%;
  min-height: 100vh;
  background: var(--bg-primary);
}

/* Left Panel */
.booking-left {
  width: 280px;
  flex-shrink: 0;
  padding: 40px 28px;
  border-right: 1px solid var(--border);
  background: var(--bg-primary);
}

.booking-host-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--blue-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 12px;
}

.booking-host-name {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.booking-event-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 20px;
  line-height: 1.3;
}

.booking-meta-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.booking-meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.booking-meta-item svg {
  flex-shrink: 0;
  stroke: var(--text-secondary);
}

.selected-time {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.selected-time svg {
  stroke: var(--blue-primary);
}

.selected-time span {
  color: var(--blue-primary);
  font-weight: 500;
}

/* Right Panel */
.booking-right {
  flex: 1;
  padding: 40px 40px;
  overflow-y: auto;
  min-width: 0;
}

.booking-panel-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 28px;
}

.booking-calendar-panel {
  display: flex;
  gap: 40px;
  align-items: flex-start;
}

/* Calendar */
.mini-calendar {
  flex-shrink: 0;
  width: 320px;
}

.cal-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.cal-nav-btn {
  background: none;
  padding: 6px;
  border-radius: var(--radius-md);
  border: none;
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.12s;
  font-family: var(--font);
}

.cal-nav-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.cal-nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.cal-month {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 14px;
}

.cal-dow {
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  padding: 6px 0;
  letter-spacing: 0.5px;
}

.cal-day {
  aspect-ratio: 1;
  border-radius: 50%;
  background: none;
  border: 1.5px solid transparent;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  font-family: var(--font);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;
  width: 100%;
}

.cal-day.empty {
  pointer-events: none;
}

.cal-day.disabled {
  color: var(--text-muted);
  cursor: not-allowed;
}

.cal-day:not(.empty):not(.disabled):hover {
  background: var(--blue-light);
  color: var(--blue-primary);
}

.cal-day.selected {
  background: var(--blue-primary);
  color: white;
  font-weight: 700;
  border-color: transparent;
}

.cal-day.today {
  font-weight: 700;
  border-color: var(--blue-primary);
  color: var(--blue-primary);
}

.cal-day.today.selected {
  border-color: transparent;
}

.cal-timezone {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border-light);
}

.cal-timezone svg {
  stroke: var(--text-secondary);
}

/* Time Slots */
.time-slots-panel {
  flex: 1;
  min-width: 160px;
  max-width: 200px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.slots-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 14px;
}

.slots-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 460px;
  overflow-y: auto;
  padding-right: 4px;
}

.no-slots {
  font-size: 13px;
  color: var(--text-muted);
  padding: 20px 0;
}

.slot-btn {
  width: 100%;
  border: 1.5px solid var(--blue-primary);
  border-radius: var(--radius-md);
  padding: 11px 12px;
  background: var(--bg-primary);
  font-size: 14px;
  font-weight: 500;
  color: var(--blue-primary);
  cursor: pointer;
  font-family: var(--font);
  transition: all 0.12s;
  text-align: center;
}

.slot-btn:hover:not(.selected) {
  background: var(--blue-light);
}

.slot-btn.selected {
  background: var(--blue-primary);
  color: white;
}

.slot-confirm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.btn-confirm-slot {
  background: white;
  color: var(--blue-primary);
  border: 1px solid white;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--font);
  transition: all 0.12s;
  white-space: nowrap;
}

.slot-btn.selected .btn-confirm-slot {
  background: white;
  color: var(--blue-primary);
}

.btn-confirm-slot:hover {
  background: var(--blue-light);
}

/* Form Panel */
.booking-form-panel {
  max-width: 440px;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: var(--font);
  margin-bottom: 20px;
  transition: color 0.12s;
  padding: 6px 10px;
  border-radius: var(--radius-md);
}

.btn-back:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.form-time-display {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
}

.booking-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.required {
  color: var(--red);
}

.form-group input,
.form-group textarea {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-size: 14px;
  color: var(--text-primary);
  font-family: var(--font);
  transition: border-color 0.15s;
  background: var(--bg-primary);
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--blue-primary);
  outline: none;
}

.input-error {
  border-color: var(--red) !important;
}

.field-error {
  font-size: 11px;
  color: var(--red);
  margin-top: 2px;
}

.custom-questions {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.custom-questions-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 4px 0;
}

.custom-questions-divider::before,
.custom-questions-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.question-textarea {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-size: 14px;
  font-family: var(--font);
  color: var(--text-primary);
  resize: vertical;
  min-height: 64px;
  width: 100%;
  transition: border-color 0.15s;
  background: var(--bg-primary);
}

.question-textarea:focus {
  border-color: var(--blue-primary);
  outline: none;
}

.btn-schedule {
  background: var(--blue-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  padding: 13px 24px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--font);
  transition: all 0.15s;
  margin-top: 4px;
}

.btn-schedule:hover:not(:disabled) {
  background: var(--blue-hover);
}

.btn-schedule:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.booking-notice {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.5;
  margin-top: 12px;
}

.booking-notice a {
  color: var(--blue-primary);
  text-decoration: none;
}

.booking-notice a:hover {
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 860px) {
  .booking-card {
    flex-direction: column;
  }
  .booking-left {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 24px;
  }
  .booking-right {
    padding: 24px;
  }
  .booking-calendar-panel {
    flex-direction: column;
    gap: 24px;
  }
  .mini-calendar {
    width: 100%;
  }
  .time-slots-panel {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .booking-right {
    padding: 16px;
  }
  .booking-left {
    padding: 20px;
  }
  .cal-dow {
    font-size: 9px;
    padding: 4px 0;
  }
  .slot-btn {
    padding: 13px 12px;
  }
}
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚛️ REACT COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function BookingPage({ eventSlug = '30min' }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [step, setStep] = useState('calendar');
  const [form, setForm] = useState({ name: '', email: '' });
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmationData, setConfirmationData] = useState(null);

  useEffect(() => {
    getEventTypeBySlug(eventSlug)
      .then(r => setEvent(r.data))
      .catch(err => {
        console.error('Failed to fetch event:', err);
        setEvent(null);
      })
      .finally(() => setLoading(false));
  }, [eventSlug]);

  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    setSelectedSlot(null);
    
    getAvailableSlots(eventSlug, selectedDate.format('YYYY-MM-DD'))
      .then(r => {
        if (r.data && Array.isArray(r.data)) {
          setSlots(r.data);
        } else {
          console.warn('Invalid slots response:', r);
          setSlots([]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch slots:', err);
        // Fallback: generate slots locally
        const generated = generateSlots(selectedDate);
        setSlots(generated);
      })
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, eventSlug]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    event?.questions?.forEach(q => {
      if (q.required && !answers[q.id]?.trim()) e[q.id] = 'This field is required';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const [h, m] = selectedSlot.split(':').map(Number);
      const startTime = selectedDate.hour(h).minute(m).second(0).toISOString();
      const endTime = selectedDate
        .hour(h)
        .minute(m + (event?.duration_minutes || 30))
        .second(0)
        .toISOString();
      const answersArray = (event?.questions || []).map(q => ({
        question: q.label,
        answer: answers[q.id] || '',
      }));

      await createBooking({
        event_type_slug: eventSlug,
        invitee_name: form.name,
        invitee_email: form.email,
        start_time: startTime,
        end_time: endTime,
        answers: answersArray,
      });

      setConfirmationData({
        event,
        date: selectedDate.format('dddd, MMMM D, YYYY'),
        time: formatSlot(selectedSlot),
        invitee: form,
        answers: (event?.questions || [])
          .map(q => ({ question: q.label, answer: answers[q.id] || '' }))
          .filter(a => a.answer),
      });

      setStep('confirmed');
    } catch (error) {
      console.error('Booking failed:', error);
      alert('Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatSlot = (time) => {
    const [h, m] = time.split(':').map(Number);
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  };

  const today = dayjs();
  const firstDow = currentMonth.startOf('month').day();
  const calCells = [];
  for (let i = 0; i < firstDow; i++) calCells.push(null);
  for (let d = 1; d <= currentMonth.daysInMonth(); d++) calCells.push(currentMonth.date(d));
  const isDisabled = d => !d || d.isBefore(today, 'day') || d.day() === 0 || d.day() === 6;

  if (loading) {
    return (
      <div className="booking-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="booking-loading">
        <p style={{ color: 'var(--text-muted)' }}>Event not found</p>
      </div>
    );
  }

  if (step === 'confirmed' && confirmationData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>✓</div>
        <h1 style={{ fontSize: '28px', marginBottom: '12px' }}>Booking confirmed!</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          {confirmationData.time} • {confirmationData.date}
        </p>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          A confirmation has been sent to {confirmationData.invitee.email}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            background: 'var(--blue-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontFamily: 'var(--font)',
            fontSize: '14px',
            fontWeight: 700,
          }}
        >
          Schedule another event
        </button>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <style>{styles}</style>
      <div className="booking-card">
        {/* Left Panel */}
        <div className="booking-left">
          <div className="booking-host-avatar">{(event?.host_name || 'A')[0]}</div>
          <p className="booking-host-name">{event?.host_name}</p>
          <h1 className="booking-event-name">{event?.name}</h1>

          <div className="booking-meta-list">
            <div className="booking-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{event?.duration_minutes} min</span>
            </div>
            {event?.location && (
              <div className="booking-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                  <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0z" />
                </svg>
                <span>{event?.location}</span>
              </div>
            )}
            {selectedDate && selectedSlot && (
              <div className="booking-meta-item selected-time">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>{formatSlot(selectedSlot)}, {selectedDate.format('ddd, MMM D')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="booking-right">
          {step === 'calendar' && (
            <>
              <h2 className="booking-panel-title">Select a Date &amp; Time</h2>
              <div className="booking-calendar-panel">
                {/* Calendar */}
                <div className="mini-calendar">
                  <div className="cal-nav">
                    <button
                      className="cal-nav-btn"
                      onClick={() => setCurrentMonth(m => m.subtract(1, 'month'))}
                      disabled={currentMonth.isSame(today.startOf('month'), 'month')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <span className="cal-month">{currentMonth.format('MMMM YYYY')}</span>
                    <button
                      className="cal-nav-btn"
                      onClick={() => setCurrentMonth(m => m.add(1, 'month'))}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>

                  <div className="cal-grid">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                      <div key={d} className="cal-dow">
                        {d}
                      </div>
                    ))}
                    {calCells.map((d, i) => (
                      <button
                        key={i}
                        disabled={!d || isDisabled(d)}
                        className={[
                          'cal-day',
                          !d ? 'empty' : '',
                          d && isDisabled(d) ? 'disabled' : '',
                          d && selectedDate && d.isSame(selectedDate, 'day') ? 'selected' : '',
                          d && d.isSame(today, 'day') ? 'today' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => d && !isDisabled(d) && setSelectedDate(d)}
                      >
                        {d ? d.date() : ''}
                      </button>
                    ))}
                  </div>

                  <div className="cal-timezone">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <span>{event?.host_timezone}</span>
                  </div>
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div className="time-slots-panel">
                    <h3 className="slots-title">{selectedDate.format('dddd, MMMM D')}</h3>
                    {slotsLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                        <div className="spinner" style={{ width: 24, height: 24 }} />
                      </div>
                    ) : slots.filter(s => s.available).length === 0 ? (
                      <p className="no-slots">No available slots for this day.</p>
                    ) : (
                      <div className="slots-list">
                        {slots.filter(s => s.available).map(slot => (
                          <button
                            key={slot.time}
                            className={`slot-btn ${selectedSlot === slot.time ? 'selected' : ''}`}
                            onClick={() => setSelectedSlot(slot.time)}
                          >
                            {selectedSlot === slot.time ? (
                              <div className="slot-confirm-row">
                                <span>{formatSlot(slot.time)}</span>
                                <button
                                  className="btn-confirm-slot"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setStep('form');
                                  }}
                                >
                                  Confirm
                                </button>
                              </div>
                            ) : (
                              formatSlot(slot.time)
                            )}
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
            <div className="booking-form-panel" style={{ animation: 'fadeIn 0.2s ease' }}>
              <button className="btn-back" onClick={() => setStep('calendar')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </button>
              <h2 className="booking-panel-title">Enter Details</h2>
              <p className="form-time-display">
                {formatSlot(selectedSlot)} · {selectedDate.format('dddd, MMMM D, YYYY')}
              </p>

              <div className="booking-form">
                <div className="form-group">
                  <label>
                    Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={form.name}
                    className={errors.name ? 'input-error' : ''}
                    onChange={e => {
                      setForm(f => ({ ...f, name: e.target.value }));
                      setErrors(er => ({ ...er, name: '' }));
                    }}
                  />
                  {errors.name && <span className="field-error">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label>
                    Email <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    className={errors.email ? 'input-error' : ''}
                    onChange={e => {
                      setForm(f => ({ ...f, email: e.target.value }));
                      setErrors(er => ({ ...er, email: '' }));
                    }}
                  />
                  {errors.email && <span className="field-error">{errors.email}</span>}
                </div>

                {event?.questions?.length > 0 && (
                  <div className="custom-questions">
                    <div className="custom-questions-divider">
                      <span>Additional Information</span>
                    </div>
                    {event.questions.map(q => (
                      <div key={q.id} className="form-group">
                        <label>
                          {q.label}
                          {q.required && <span className="required"> *</span>}
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Your answer..."
                          className={`question-textarea ${errors[q.id] ? 'input-error' : ''}`}
                          value={answers[q.id] || ''}
                          onChange={e => {
                            setAnswers(a => ({ ...a, [q.id]: e.target.value }));
                            setErrors(er => ({ ...er, [q.id]: '' }));
                          }}
                        />
                        {errors[q.id] && <span className="field-error">{errors[q.id]}</span>}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="btn-schedule"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Scheduling...' : 'Schedule Event'}
                </button>
                <p className="booking-notice">
                  By proceeding, you agree to our <a href="#">Terms of Use</a> and{' '}
                  <a href="#">Privacy Notice</a>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookingPage;
