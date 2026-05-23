import React from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import './BookingConfirmation.css'

export default function BookingConfirmation() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { slug } = useParams()

  const event = state?.event || { name: '30 Minute Meeting', duration_minutes: 30, location: 'Google Meet' }
  const date = state?.date || 'Monday, June 2, 2026'
  const time = state?.time || '10:00 AM'
  const invitee = state?.invitee || { name: 'Guest', email: 'guest@example.com' }

  return (
    <div className="confirmation-page">
      <div className="confirmation-card fade-in">
        <div className="confirmation-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h1 className="confirmation-title">Confirmed!</h1>
        <p className="confirmation-sub">
          You are scheduled with <strong>Anushka Patel</strong>.
        </p>

        <div className="confirmation-details">
          <div className="confirmation-detail-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <div>
              <p className="detail-label">{event.name}</p>
              <p className="detail-value">{time} · {date}</p>
            </div>
          </div>

          {event.location && (
            <div className="confirmation-detail-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
                <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0z"/>
              </svg>
              <div>
                <p className="detail-label">Location</p>
                <p className="detail-value">{event.location}</p>
              </div>
            </div>
          )}

          <div className="confirmation-detail-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#637488" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <div>
              <p className="detail-label">Invitee</p>
              <p className="detail-value">{invitee.name} · {invitee.email}</p>
            </div>
          </div>
        </div>

        {state?.answers?.length > 0 && (
          <div className="confirmation-answers">
            <h4>Your responses</h4>
            {state.answers.map((a, i) => (
              <div key={i} className="answer-row">
                <div className="answer-question">{a.question}</div>
                <div className="answer-value">{a.answer}</div>
              </div>
            ))}
          </div>
        )}

        <p className="confirmation-email-note">
          A calendar invitation has been sent to your email address.
        </p>

        <div className="confirmation-actions">
          <button className="btn-book-another" onClick={() => navigate(`/book/${slug}`)}>
            Book another time
          </button>
        </div>
      </div>
    </div>
  )
}
