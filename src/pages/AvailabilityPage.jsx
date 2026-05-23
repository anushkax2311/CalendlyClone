import React, { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import {
  getSchedules, createSchedule, updateScheduleDays, renameSchedule, deleteSchedule,
  getDateOverrides, createDateOverride, deleteDateOverride
} from '../api/index.js'
import './AvailabilityPage.css'

const DAYS      = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const DAY_ABBR  = ['S','M','T','W','T','F','S']
const TIMEZONES = ['Asia/Kolkata','America/New_York','America/Chicago','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Tokyo','Australia/Sydney']

const TIME_OPTIONS = []
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hour  = h === 0 ? 12 : h > 12 ? h - 12 : h
    const ampm  = h < 12 ? 'am' : 'pm'
    const label = `${hour}:${m.toString().padStart(2,'0')} ${ampm}`
    const value = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`
    TIME_OPTIONS.push({ label, value })
  }
}

const DEFAULT_DAYS = () => Array.from({length:7},(_,i)=>({
  day_of_week:i, enabled: i>=1&&i<=5, start_time:'09:00', end_time:'17:00'
}))

function TimeSelect({ value, onChange }) {
  return (
    <select className="time-select" value={value} onChange={e=>onChange(e.target.value)}>
      {TIME_OPTIONS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
    </select>
  )
}

// ── Date Override Modal ───────────────────────────────────────────────────────
function OverrideModal({ scheduleId, onClose, onSaved }) {
  const [form, setForm] = useState({
    date: dayjs().add(1,'day').format('YYYY-MM-DD'),
    is_unavailable: false,
    start_time: '09:00', end_time: '17:00', reason: ''
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        schedule_id: scheduleId,
        start_time: form.is_unavailable ? null : form.start_time,
        end_time:   form.is_unavailable ? null : form.end_time,
      }
      const res = await createDateOverride(payload)
      onSaved(res.data)
      onClose()
    } catch { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Add date-specific hours</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={form.date} min={dayjs().format('YYYY-MM-DD')}
              onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="required-toggle" style={{flexDirection:'row',gap:10,alignItems:'center'}}>
              <input type="checkbox" checked={form.is_unavailable}
                onChange={e=>setForm(f=>({...f,is_unavailable:e.target.checked}))}
                style={{accentColor:'var(--blue-primary)'}} />
              <span style={{fontSize:14,fontWeight:500}}>Mark as unavailable (block entire day)</span>
            </label>
          </div>
          {!form.is_unavailable && (
            <div className="form-group">
              <label>Custom hours</label>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <TimeSelect value={form.start_time} onChange={v=>setForm(f=>({...f,start_time:v}))} />
                <span style={{color:'var(--text-muted)'}}>–</span>
                <TimeSelect value={form.end_time} onChange={v=>setForm(f=>({...f,end_time:v}))} />
              </div>
            </div>
          )}
          <div className="form-group">
            <label>Reason <span style={{color:'var(--text-muted)',fontWeight:400}}>(optional)</span></label>
            <input type="text" placeholder="e.g. Half day, Holiday..."
              value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save override'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AvailabilityPage() {
  const [schedules,    setSchedules]    = useState([])
  const [activeId,     setActiveId]     = useState(null)
  const [days,         setDays]         = useState(DEFAULT_DAYS())
  const [timezone,     setTimezone]     = useState('Asia/Kolkata')
  const [overrides,    setOverrides]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [toast,        setToast]        = useState(null)
  const [activeTab,    setActiveTab]    = useState('schedules')
  const [showNewSched, setShowNewSched] = useState(false)
  const [newSchedName, setNewSchedName] = useState('')
  const [showOverride, setShowOverride] = useState(false)
  const [renamingId,   setRenamingId]   = useState(null)
  const [renameVal,    setRenameVal]    = useState('')

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000) }

  // Load schedules
  useEffect(() => {
    getSchedules()
      .then(res => {
        const data = Array.isArray(res.data)
  ? res.data
  : res.data.schedules || []

setSchedules(data)

if (data.length > 0) {
  const def = data.find(s => s.is_default) || data[0]
  setActiveId(def.id)
  setDays(def.days?.length ? def.days : DEFAULT_DAYS())
}
        if (res.data.length > 0) {
          const def = res.data.find(s=>s.is_default) || res.data[0]
          setActiveId(def.id)
          setDays(def.days?.length ? def.days : DEFAULT_DAYS())
        }
      })
      .catch(()=>{
  const fallback = [{id:1,name:'Working hours',is_default:true,days:DEFAULT_DAYS()}]
  setSchedules(fallback); setActiveId(1); setDays(DEFAULT_DAYS())
})
.then(()=>{
  // if API returned empty array, use fallback
  setSchedules(prev => {
    if (prev.length === 0) {
      setActiveId(1)
      setDays(DEFAULT_DAYS())
      return [{id:1,name:'Working hours',is_default:true,days:DEFAULT_DAYS()}]
    }
    return prev
  })
})
      .finally(()=>setLoading(false))
  },[])

  // Load overrides when active schedule changes
  useEffect(()=>{
    if (!activeId) return
    getDateOverrides(activeId)
      .then(res => {
  const data = Array.isArray(res.data)
    ? res.data
    : res.data.overrides || []

  setOverrides(data)
})
      .catch(()=>setOverrides([]))
  },[activeId])

  const selectSchedule = (s) => {
    setActiveId(s.id)
    setDays(s.days?.length ? s.days : DEFAULT_DAYS())
  }

  const toggleDay = (idx) => setDays(d=>d.map((r,i)=>i===idx?{...r,enabled:!r.enabled}:r))
  const updateTime = (idx, field, val) => setDays(d=>d.map((r,i)=>i===idx?{...r,[field]:val}:r))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await updateScheduleDays(activeId,{schedule_id:activeId,days,timezone})
      setSchedules(ss=>ss.map(s=>s.id===activeId?{...s,days:res.data.days||days}:s))
      showToast('Saved!')
    } catch { showToast('Save failed','error') } finally { setSaving(false) }
  }

  const handleCreateSchedule = async () => {
    if (!newSchedName.trim()) return
    try {
      const res = await createSchedule({name:newSchedName.trim(),is_default:false})
      setSchedules(ss=>[...ss,res.data])
      setActiveId(res.data.id)
      setDays(res.data.days||DEFAULT_DAYS())
      setShowNewSched(false); setNewSchedName('')
      showToast('Schedule created')
    } catch { showToast('Failed','error') }
  }

  const handleDeleteSchedule = async (id) => {
    if (!confirm('Delete this schedule?')) return
    try {
      await deleteSchedule(id)
      const remaining = schedules.filter(s=>s.id!==id)
      setSchedules(remaining)
      if (activeId===id && remaining.length>0) selectSchedule(remaining[0])
      showToast('Deleted')
    } catch (e) { showToast(e?.response?.data?.detail||'Cannot delete','error') }
  }

  const handleRename = async (id) => {
    if (!renameVal.trim()) return
    try {
      const res = await renameSchedule(id,{name:renameVal})
      setSchedules(ss=>ss.map(s=>s.id===id?{...s,name:res.data.name}:s))
      setRenamingId(null); showToast('Renamed')
    } catch { showToast('Failed','error') }
  }

  const handleDeleteOverride = async (id) => {
    try {
      await deleteDateOverride(id)
      setOverrides(ov=>ov.filter(o=>o.id!==id))
      showToast('Removed')
    } catch { showToast('Failed','error') }
  }

  const activeSchedule = schedules.find(s=>s.id===activeId)

  return (
    <div className="availability-page fade-in">
      {/* Notice banner */}
      <div className="notice-banner">
        <div><strong>Review our updated Terms of Use</strong><span> — We've updated our Terms of Use.</span></div>
        <div className="notice-actions">
          <button className="btn-review">Review terms</button>
          <button className="btn-accept-terms">Accept terms</button>
        </div>
      </div>

      <div className="page-inner">
        <div className="page-header">
          <h1 className="page-title">Availability</h1>
        </div>

        <div className="page-tabs">
          {['schedules','calendar-settings','advanced-settings'].map(t=>(
            <button key={t} className={`tab-btn ${activeTab===t?'active':''}`} onClick={()=>setActiveTab(t)}>
              {t==='schedules'?'Schedules':t==='calendar-settings'?'Calendar settings':'Advanced settings'}
            </button>
          ))}
        </div>

        {activeTab==='schedules' && !loading && (
          <div className="avail-two-col">
            {/* ── Left: schedule list ───────────────────────────────────── */}
            <div className="sched-list-panel">
              <button className="btn-new-schedule" onClick={()=>setShowNewSched(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New schedule
              </button>

              {showNewSched && (
                <div className="new-sched-form">
                  <input autoFocus type="text" placeholder="Schedule name"
                    value={newSchedName} onChange={e=>setNewSchedName(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&handleCreateSchedule()} />
                  <div style={{display:'flex',gap:6,marginTop:8}}>
                    <button className="btn-primary" style={{padding:'6px 14px',fontSize:12}} onClick={handleCreateSchedule}>Create</button>
                    <button className="btn-secondary" style={{padding:'6px 14px',fontSize:12}} onClick={()=>{setShowNewSched(false);setNewSchedName('')}}>Cancel</button>
                  </div>
                </div>
              )}

              <div className="sched-list">
                {Array.isArray(schedules) && schedules.map(s=>(
                  <div key={s.id} className={`sched-list-item ${activeId===s.id?'active':''}`}
                    onClick={()=>selectSchedule(s)}>
                    <div className="sched-list-left">
                      {s.is_default && <div className="sched-dot active-dot"/>}
                      {!s.is_default && <div className="sched-dot"/>}
                      <div>
                        {renamingId===s.id ? (
                          <input autoFocus className="rename-input" value={renameVal}
                            onChange={e=>setRenameVal(e.target.value)}
                            onBlur={()=>handleRename(s.id)}
                            onKeyDown={e=>{ if(e.key==='Enter') handleRename(s.id); if(e.key==='Escape') setRenamingId(null) }}
                            onClick={e=>e.stopPropagation()} />
                        ) : (
                          <span className="sched-list-name">{s.name}</span>
                        )}
                        {s.is_default && <span className="sched-default-badge">default</span>}
                      </div>
                    </div>
                    {activeId===s.id && (
                      <div className="sched-list-actions" onClick={e=>e.stopPropagation()}>
                        <button className="sched-action-btn" title="Rename"
                          onClick={()=>{setRenamingId(s.id);setRenameVal(s.name)}}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        {!s.is_default && (
                          <button className="sched-action-btn danger" title="Delete"
                            onClick={()=>handleDeleteSchedule(s.id)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                              <path d="M10 11v6"/><path d="M14 11v6"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: weekly hours + date overrides ─────────────────── */}
            <div className="sched-detail-panel">
              {activeSchedule && (
                <>
                  <div className="sched-detail-header">
                    <div>
                      <h2 className="sched-detail-name">{activeSchedule.name}</h2>
                      {activeSchedule.is_default && <span className="sched-default-badge">default schedule</span>}
                    </div>
                  </div>

                  {/* Weekly hours */}
                  <div className="avail-section-block">
                    <div className="section-title-row">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
                        <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                      </svg>
                      <h3 className="section-title">Weekly hours</h3>
                    </div>
                    <p className="section-sub">Set when you are typically available</p>

                    <div className="weekly-hours-list">
                      {days.map((day,idx)=>(
                        <div key={idx} className="day-row">
                          <div className={`day-avatar ${day.enabled?'enabled':''}`}
                            onClick={()=>toggleDay(idx)} title={DAYS[idx]}>
                            {DAY_ABBR[idx]}
                          </div>
                          {day.enabled ? (
                            <div className="day-time-controls">
                              <TimeSelect value={day.start_time} onChange={v=>updateTime(idx,'start_time',v)} />
                              <span className="time-dash">–</span>
                              <TimeSelect value={day.end_time} onChange={v=>updateTime(idx,'end_time',v)} />
                              <button className="time-action-btn" onClick={()=>toggleDay(idx)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
                                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <div className="day-unavailable">
                              <span>Unavailable</span>
                              <button className="time-action-btn" onClick={()=>toggleDay(idx)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"/>
                                  <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Timezone */}
                    <div className="timezone-row">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="2" y1="12" x2="22" y2="12"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                      </svg>
                      <select className="timezone-select" value={timezone} onChange={e=>setTimezone(e.target.value)}>
                        {TIMEZONES.map(tz=><option key={tz} value={tz}>{tz}</option>)}
                      </select>
                    </div>

                    <div className="avail-save-row">
                      <button className="btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save changes'}
                      </button>
                    </div>
                  </div>

                  {/* Date-specific hours */}
                  <div className="avail-section-block" style={{marginTop:20}}>
                    <div className="section-title-row">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <h3 className="section-title">Date-specific hours</h3>
                    </div>
                    <p className="section-sub">Override hours for specific dates — custom hours or mark unavailable</p>

                    {overrides.length > 0 && (
                      <div className="overrides-list">
                        {Array.isArray(overrides) && overrides.map(ov=>(
                          <div key={ov.id} className="override-row">
                            <div className="override-info">
                              <span className="override-date">{dayjs(ov.date).format('ddd, MMM D, YYYY')}</span>
                              {ov.is_unavailable
                                ? <span className="override-badge unavail">Unavailable</span>
                                : <span className="override-hours">{ov.start_time} – {ov.end_time}</span>
                              }
                              {ov.reason && <span className="override-reason">{ov.reason}</span>}
                            </div>
                            <button className="override-delete-btn" onClick={()=>handleDeleteOverride(ov.id)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button className="btn-add-override" onClick={()=>setShowOverride(true)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Add date override
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab!=='schedules' && (
          <div className="empty-tab-state"><p>Coming soon.</p></div>
        )}
      </div>

      {showOverride && (
        <OverrideModal
          scheduleId={activeId}
          onClose={()=>setShowOverride(false)}
          onSaved={ov=>{ setOverrides(o=>[...o,ov]); showToast('Override saved') }}
        />
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
