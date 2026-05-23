import React, { useState, useEffect ,useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { getEventTypes, createEventType, updateEventType, deleteEventType } from '../api/index.js'
import './SchedulingPage.css'

const DURATIONS = [15, 30, 45, 60, 90, 120]
const COLORS = ['#006bff', '#6c3fc5', '#00a86b', '#e53935', '#ff6d00', '#0097a7']
const BUFFERS = [0, 5, 10, 15, 30]

function EventCard({
  event,
  onEdit,
  onDelete,
  onCopyLink,
  openMenuId,
  setOpenMenuId
}) {
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef(null)

  const bookingUrl = `${window.location.origin}/book/${event.slug}`

  const openMenu = () => {
    const rect = btnRef.current.getBoundingClientRect()

    setMenuPos({
      top: rect.bottom + 4,
      left: rect.right - 160
    })

    setOpenMenuId(prev =>
      prev === event.id ? null : event.id
    )
  }

  useEffect(() => {
    if (openMenuId !== event.id) return

    const close = () => setOpenMenuId(null)

    document.addEventListener('click', close)

    return () => {
      document.removeEventListener('click', close)
    }
  }, [openMenuId, event.id, setOpenMenuId])

  return (
    <div className={`event-card ${!event.is_active ? 'inactive' : ''}`}>
      <div
        className="event-card-color-bar"
        style={{ background: event.color || '#006bff' }}
      />

      <div className="event-card-body">
        <div className="event-card-header">
          <div>
            <h3 className="event-card-name">{event.name}</h3>

            <p className="event-card-meta">
              {event.duration_minutes} min
              {event.location && ` · ${event.location}`}
              {' · One-on-One'}

              {(event.buffer_before > 0 ||
                event.buffer_after > 0) && (
                <span className="buffer-badge">
                  {event.buffer_before > 0 &&
                    ` · ${event.buffer_before}m before`}

                  {event.buffer_after > 0 &&
                    ` · ${event.buffer_after}m after`}
                </span>
              )}
            </p>

            {event.questions?.length > 0 && (
              <p className="event-card-questions">
                {event.questions.length} custom question
                {event.questions.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="event-card-actions">
            <a
              className="event-share-label"
              href={bookingUrl}
              target="_blank"
              rel="noreferrer"
            >
              View booking page
            </a>

            <button
              ref={btnRef}
              className="icon-btn"
              onClick={(e) => {
                e.stopPropagation()
                openMenu()
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="#637488"
              >
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="event-card-footer">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={event.is_active}
              onChange={() =>
                onEdit({
                  ...event,
                  is_active: !event.is_active,
                  _toggle: true
                })
              }
            />

            <span className="toggle-slider" />
          </label>

          <span className="toggle-label">
            {event.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {openMenuId === event.id &&
        createPortal(
          <div
            className="event-dropdown"
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              zIndex: 9999
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                onEdit(event)
                setOpenMenuId(null)
              }}
            >
              Edit
            </button>

            <button
              onClick={() => {
                onCopyLink(bookingUrl)
                setOpenMenuId(null)
              }}
            >
              Copy link
            </button>

            <button
              onClick={() => {
                onEdit({
                  ...event,
                  is_active: !event.is_active,
                  _toggle: true
                })

                setOpenMenuId(null)
              }}
            >
              {event.is_active ? 'Deactivate' : 'Activate'}
            </button>

            <button
              className="danger"
              onClick={() => {
                onDelete(event.id)
                setOpenMenuId(null)
              }}
            >
              Delete
            </button>
          </div>,
          document.body
        )}
    </div>
  )
}

function EventModal({ event, onClose, onSave }) {
  const [form, setForm] = useState({
    name: event?.name || '',
    duration_minutes: event?.duration_minutes || 30,
    slug: event?.slug || '',
    color: event?.color || '#006bff',
    location: event?.location || '',
    buffer_before: event?.buffer_before ?? 0,
    buffer_after: event?.buffer_after ?? 0,
    questions: event?.questions || [],
    is_active: event?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('basic') // 'basic' | 'buffer' | 'questions'

  const handleNameChange = (name) => {
    setForm(f => ({
      ...f, name,
      slug: f.slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    }))
  }

  // ── Question helpers ──
  const addQuestion = () => {
    setForm(f => ({
      ...f,
      questions: [...f.questions, { id: `q${Date.now()}`, label: '', required: false }],
    }))
  }

  const updateQuestion = (idx, field, value) => {
    setForm(f => ({
      ...f,
      questions: f.questions.map((q, i) => i === idx ? { ...q, [field]: value } : q),
    }))
  }

  const removeQuestion = (idx) => {
    setForm(f => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }))
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try { await onSave(form); onClose() } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <h2>{event?.id ? 'Edit event type' : 'New event type'}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Modal tabs */}
        <div className="modal-tabs">
          {[['basic','Details'], ['buffer','Buffer Time'], ['questions','Questions']].map(([t, l]) => (
            <button key={t} className={`modal-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
              {l}
              {t === 'questions' && form.questions.length > 0 && (
                <span className="modal-tab-badge">{form.questions.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {/* ── Basic tab ── */}
          {activeTab === 'basic' && (
            <>
              <div className="form-group">
                <label>Event name</label>
                <input type="text" placeholder="e.g. 30 Minute Meeting" value={form.name}
                  onChange={e => handleNameChange(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Duration</label>
                <div className="duration-options">
                  {DURATIONS.map(d => (
                    <button key={d} className={`duration-chip ${form.duration_minutes === d ? 'selected' : ''}`}
                      onClick={() => setForm(f => ({ ...f, duration_minutes: d }))}>
                      {d} min
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>URL slug</label>
                <div className="slug-input">
                  <span className="slug-prefix">calendly.com/anushka/</span>
                  <input type="text" value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Location</label>
                <select value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}>
                  <option value="">None</option>
                  <option value="Zoom">Zoom</option>
                  <option value="Google Meet">Google Meet</option>
                  <option value="Phone call">Phone call</option>
                  <option value="In-person">In-person</option>
                  <option value="Microsoft Teams">Microsoft Teams</option>
                </select>
              </div>
              <div className="form-group">
                <label>Color</label>
                <div className="color-options">
                  {COLORS.map(c => (
                    <button key={c} className={`color-chip ${form.color === c ? 'selected' : ''}`}
                      style={{ background: c }} onClick={() => setForm(f => ({ ...f, color: c }))} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Buffer tab ── */}
          {activeTab === 'buffer' && (
            <div className="buffer-section">
              <p className="buffer-desc">
                Buffer time adds a gap before and/or after each meeting so you have time to prepare or wrap up. Blocked slots won't appear as available to invitees.
              </p>
              <div className="form-group">
                <label>Buffer before event</label>
                <div className="duration-options">
                  {BUFFERS.map(b => (
                    <button key={b} className={`duration-chip ${form.buffer_before === b ? 'selected' : ''}`}
                      onClick={() => setForm(f => ({ ...f, buffer_before: b }))}>
                      {b === 0 ? 'None' : `${b} min`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Buffer after event</label>
                <div className="duration-options">
                  {BUFFERS.map(b => (
                    <button key={b} className={`duration-chip ${form.buffer_after === b ? 'selected' : ''}`}
                      onClick={() => setForm(f => ({ ...f, buffer_after: b }))}>
                      {b === 0 ? 'None' : `${b} min`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="buffer-preview">
                <div className="bp-row">
                  {form.buffer_before > 0 && <div className="bp-block buffer">{form.buffer_before}m buffer</div>}
                  <div className="bp-block meeting">{form.duration_minutes}m meeting</div>
                  {form.buffer_after > 0 && <div className="bp-block buffer">{form.buffer_after}m buffer</div>}
                </div>
                <p className="bp-label">Total time blocked: {form.buffer_before + form.duration_minutes + form.buffer_after} min</p>
              </div>
            </div>
          )}

          {/* ── Questions tab ── */}
          {activeTab === 'questions' && (
            <div className="questions-section">
              <p className="buffer-desc">
                Add questions that invitees must answer when booking. Their answers will appear in the meeting details.
              </p>
              {form.questions.length === 0 ? (
                <div className="questions-empty">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d0d9e8" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <p>No custom questions yet</p>
                </div>
              ) : (
                <div className="questions-list">
                  {form.questions.map((q, idx) => (
                    <div key={q.id} className="question-item">
                      <div className="question-number">{idx + 1}</div>
                      <div className="question-fields">
                        <input
                          type="text"
                          placeholder="e.g. What would you like to discuss?"
                          value={q.label}
                          onChange={e => updateQuestion(idx, 'label', e.target.value)}
                        />
                        <label className="required-toggle">
                          <input type="checkbox" checked={q.required}
                            onChange={e => updateQuestion(idx, 'required', e.target.checked)} />
                          <span>Required</span>
                        </label>
                      </div>
                      <button className="remove-question-btn" onClick={() => removeQuestion(idx)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button className="btn-add-question" onClick={addQuestion}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add a question
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving || !form.name.trim()}>
            {saving ? 'Saving...' : (event?.id ? 'Update' : 'Create event type')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SchedulingPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('event-types')
  const [openMenuId, setOpenMenuId] = useState(null)


  const location = useLocation()

 useEffect(() => {
  if (location.state?.openCreate) {
    setEditing(null)
    setModalOpen(true)
  }
}, [location.state])


  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadEvents = async () => {
    try {
      const res = await getEventTypes()
      console.log(res.data)
      setEvents(res.data)

    } catch {
      setEvents([
        { id: 1, name: '30 Minute Meeting', duration_minutes: 30, slug: '30min', color: '#006bff', location: 'Google Meet', is_active: true, buffer_before: 0, buffer_after: 5, questions: [{ id: 'q1', label: 'What would you like to discuss?', required: false }] },
        { id: 2, name: 'Coffee Chat', duration_minutes: 15, slug: 'coffee-chat', color: '#6c3fc5', location: 'Zoom', is_active: true, buffer_before: 0, buffer_after: 0, questions: [] },
        { id: 3, name: '1 Hour Strategy Call', duration_minutes: 60, slug: 'strategy-call', color: '#00a86b', location: 'Google Meet', is_active: false, buffer_before: 10, buffer_after: 10, questions: [{ id: 'q1', label: 'Share your goals for this call', required: true }] },
      ])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadEvents() }, [])

  const handleSave = async (form) => {
    if (editing?.id) {
      await updateEventType(editing.id, form)
      setEvents(evs => evs.map(e => e.id === editing.id ? { ...e, ...form } : e))
      showToast('Event type updated')
    } else {
      try {
        const res = await createEventType(form)
        setEvents(evs => [...evs, res.data])
      } catch {
        setEvents(evs => [...evs, { id: Date.now(), ...form }])
      }
      showToast('Event type created')
    }
  }

  const handleEdit = (event) => {
    if (event._toggle) {
      setEvents(evs => evs.map(e => e.id === event.id ? { ...e, is_active: event.is_active } : e))
      updateEventType(event.id, event).catch(() => {})
      return
    }
    setEditing(event); setModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this event type?')) return
    setEvents(evs => evs.filter(e => e.id !== id))
    try { await deleteEventType(id) } catch {}
    showToast('Deleted')
  }

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url).then(() => showToast('Link copied!'))
  }
  console.log("events =", events)
const filtered = Array.isArray(events)
  ? events.filter(
      e => e?.name?.toLowerCase().includes(search.toLowerCase())
    )
  : []

  return (
    <div className="scheduling-page fade-in">
      <div className="notice-banner">
        <div><strong>Review our updated Terms of Use</strong><span className="notice-text"> — We've updated our Terms of Use to reflect how Calendly works today.</span></div>
        <div className="notice-actions">
          <button className="btn-review">Review terms</button>
          <button className="btn-accept-terms">Accept terms</button>
        </div>
      </div>
      <div className="page-inner">
        <div className="page-header">
          <h1 className="page-title">Scheduling
            <button className="help-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></button>
          </h1>
          <button className="btn-create-primary" onClick={() => { setEditing(null); setModalOpen(true) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
        <div className="page-tabs">
          {['event-types','single-use-links','meeting-polls'].map(t => (
            <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
              {t === 'event-types' ? 'Event types' : t === 'single-use-links' ? 'Single-use links' : 'Meeting polls'}
            </button>
          ))}
        </div>
        <div className="search-bar-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a9bb0" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search event types" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="user-group-label">
          <div className="user-avatar-sm">A</div>
          <span>Anushka Patel</span>
        </div>
        {loading ? <div className="loading-state"><div className="spinner" /></div>
          : filtered.length === 0 ? (
            <div className="empty-state">
              <p>No event types found.</p>
              <button className="btn-primary" onClick={() => { setEditing(null); setModalOpen(true) }}>Create event type</button>
            </div>
          ) : (
            <div className="event-cards-list">
  {filtered.map(ev => (
    <EventCard
      key={ev.id}
      event={ev}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onCopyLink={handleCopyLink}
      openMenuId={openMenuId}
      setOpenMenuId={setOpenMenuId}
    />
  ))}
</div>
          )}
      </div>
      {modalOpen && (
        <EventModal event={editing} onClose={() => { setModalOpen(false); setEditing(null) }} onSave={handleSave} />
      )}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
