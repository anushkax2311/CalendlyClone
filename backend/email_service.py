"""
Email notification service using Python's built-in smtplib.
No extra pip packages needed.

To enable:
  1. Turn on 2-Step Verification on your Google account
  2. Go to myaccount.google.com → Security → App passwords
  3. Generate a 16-character app password
  4. Set EMAIL_ENABLED=true, EMAIL_USERNAME, EMAIL_PASSWORD in .env
"""
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

from .config import settings

logger = logging.getLogger(__name__)


def _send(to_email: str, subject: str, html_body: str) -> bool:
    """Send a single email. Returns True on success, False on failure."""
    if not settings.EMAIL_ENABLED:
        logger.info(f"[Email disabled] Would send '{subject}' to {to_email}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_USERNAME}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
            server.sendmail(settings.EMAIL_USERNAME, to_email, msg.as_string())

        logger.info(f"Email sent: '{subject}' → {to_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


# ── HTML templates ────────────────────────────────────────────────────────────

def _base_template(title: str, content: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {{ margin:0; padding:0; background:#f8f9fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }}
        .wrapper {{ max-width:560px; margin:40px auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1); }}
        .header {{ background:#006bff; padding:28px 32px; text-align:center; }}
        .header h1 {{ color:white; margin:0; font-size:22px; font-weight:700; letter-spacing:-0.3px; }}
        .header p {{ color:rgba(255,255,255,0.85); margin:6px 0 0; font-size:14px; }}
        .body {{ padding:32px; }}
        .detail-card {{ background:#f0f5ff; border-radius:10px; padding:20px 24px; margin:20px 0; }}
        .detail-row {{ display:flex; gap:12px; margin-bottom:14px; align-items:flex-start; }}
        .detail-row:last-child {{ margin-bottom:0; }}
        .detail-icon {{ color:#006bff; font-size:16px; flex-shrink:0; margin-top:1px; }}
        .detail-label {{ font-size:12px; font-weight:600; color:#1a3352; margin-bottom:2px; }}
        .detail-value {{ font-size:14px; color:#637488; }}
        .cta {{ text-align:center; margin:24px 0 8px; }}
        .footer {{ padding:20px 32px; border-top:1px solid #e4e9f0; text-align:center; font-size:12px; color:#8a9bb0; }}
        h2 {{ font-size:20px; color:#1a3352; margin:0 0 6px; }}
        p {{ color:#637488; font-size:14px; line-height:1.6; margin:0 0 12px; }}
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>📅 {title}</h1>
        </div>
        <div class="body">
          {content}
        </div>
        <div class="footer">
          Powered by Calendly Clone · You're receiving this because a meeting was scheduled.
        </div>
      </div>
    </body>
    </html>
    """


def send_booking_confirmation_to_invitee(
    invitee_email: str,
    invitee_name: str,
    event_name: str,
    host_name: str,
    start_time: datetime,
    end_time: datetime,
    location: str | None,
    answers: list | None = None,
) -> bool:
    """Email sent to the person who just booked."""
    date_str = start_time.strftime("%A, %B %-d, %Y") if hasattr(start_time, 'strftime') else str(start_time)
    time_str = start_time.strftime("%-I:%M %p") + " – " + end_time.strftime("%-I:%M %p")

    answers_html = ""
    if answers:
        rows = "".join(
            f'<div class="detail-row"><span class="detail-icon">💬</span>'
            f'<div><div class="detail-label">{a["question"]}</div>'
            f'<div class="detail-value">{a["answer"]}</div></div></div>'
            for a in answers if a.get("answer")
        )
        if rows:
            answers_html = f'<div class="detail-card">{rows}</div>'

    location_row = (
        f'<div class="detail-row"><span class="detail-icon">📍</span>'
        f'<div><div class="detail-label">Location</div>'
        f'<div class="detail-value">{location}</div></div></div>'
    ) if location else ""

    content = f"""
    <h2>You're scheduled!</h2>
    <p>Hi {invitee_name}, your meeting with <strong>{host_name}</strong> is confirmed.</p>
    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-icon">📋</span>
        <div><div class="detail-label">Event</div><div class="detail-value">{event_name}</div></div>
      </div>
      <div class="detail-row">
        <span class="detail-icon">📅</span>
        <div><div class="detail-label">Date & Time</div><div class="detail-value">{date_str}<br>{time_str}</div></div>
      </div>
      {location_row}
    </div>
    {answers_html}
    <p style="margin-top:16px; font-size:13px; color:#8a9bb0;">
      A calendar invitation has been added to your calendar. Need to reschedule? Contact the host.
    </p>
    """

    return _send(
        to_email=invitee_email,
        subject=f"Confirmed: {event_name} with {host_name}",
        html_body=_base_template("Meeting Confirmed", content),
    )


def send_booking_notification_to_host(
    host_email: str,
    host_name: str,
    invitee_name: str,
    invitee_email: str,
    event_name: str,
    start_time: datetime,
    end_time: datetime,
    location: str | None,
    answers: list | None = None,
) -> bool:
    """Email sent to the host (admin) when someone books."""
    date_str = start_time.strftime("%A, %B %-d, %Y") if hasattr(start_time, 'strftime') else str(start_time)
    time_str = start_time.strftime("%-I:%M %p") + " – " + end_time.strftime("%-I:%M %p")

    answers_html = ""
    if answers:
        rows = "".join(
            f'<div class="detail-row"><span class="detail-icon">💬</span>'
            f'<div><div class="detail-label">{a["question"]}</div>'
            f'<div class="detail-value">{a["answer"]}</div></div></div>'
            for a in answers if a.get("answer")
        )
        if rows:
            answers_html = f'<p style="font-weight:600;color:#1a3352;margin:20px 0 8px;">Invitee responses:</p><div class="detail-card">{rows}</div>'

    location_row = (
        f'<div class="detail-row"><span class="detail-icon">📍</span>'
        f'<div><div class="detail-label">Location</div>'
        f'<div class="detail-value">{location}</div></div></div>'
    ) if location else ""

    content = f"""
    <h2>New meeting booked!</h2>
    <p>Hi {host_name}, <strong>{invitee_name}</strong> ({invitee_email}) has scheduled a meeting with you.</p>
    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-icon">📋</span>
        <div><div class="detail-label">Event</div><div class="detail-value">{event_name}</div></div>
      </div>
      <div class="detail-row">
        <span class="detail-icon">📅</span>
        <div><div class="detail-label">Date & Time</div><div class="detail-value">{date_str}<br>{time_str}</div></div>
      </div>
      <div class="detail-row">
        <span class="detail-icon">👤</span>
        <div><div class="detail-label">Invitee</div><div class="detail-value">{invitee_name} · {invitee_email}</div></div>
      </div>
      {location_row}
    </div>
    {answers_html}
    """

    return _send(
        to_email=host_email,
        subject=f"New booking: {event_name} with {invitee_name}",
        html_body=_base_template("New Booking", content),
    )


def send_cancellation_email(
    to_email: str,
    to_name: str,
    event_name: str,
    start_time: datetime,
    other_party_name: str,
) -> bool:
    """Email sent to both parties when a meeting is cancelled."""
    date_str = start_time.strftime("%A, %B %-d, %Y") if hasattr(start_time, 'strftime') else str(start_time)
    time_str = start_time.strftime("%-I:%M %p") if hasattr(start_time, 'strftime') else ""

    content = f"""
    <h2>Meeting Cancelled</h2>
    <p>Hi {to_name}, your meeting has been cancelled.</p>
    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-icon">📋</span>
        <div><div class="detail-label">Event</div><div class="detail-value">{event_name}</div></div>
      </div>
      <div class="detail-row">
        <span class="detail-icon">📅</span>
        <div><div class="detail-label">Was scheduled for</div><div class="detail-value">{date_str} at {time_str}</div></div>
      </div>
      <div class="detail-row">
        <span class="detail-icon">👤</span>
        <div><div class="detail-label">With</div><div class="detail-value">{other_party_name}</div></div>
      </div>
    </div>
    <p style="font-size:13px;color:#8a9bb0;">If this was a mistake, please rebook using the original scheduling link.</p>
    """

    return _send(
        to_email=to_email,
        subject=f"Cancelled: {event_name}",
        html_body=_base_template("Meeting Cancelled", content),
    )
