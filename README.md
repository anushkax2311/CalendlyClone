# Calendly Clone — Full-Stack Scheduling Platform

A full-stack Calendly clone built with **React + FastAPI + MySQL**, visually and functionally matching Calendly's design and user experience.

---

## Tech Stack

| Layer     | Technology                                                      |
|-----------|-----------------------------------------------------------------|
| Frontend  | React 18, React Router v6, Axios, Day.js, Vite                 |
| Backend   | Python 3.12+, FastAPI, SQLAlchemy 2, Pydantic v2, Uvicorn      |
| Database  | MySQL 8 + Alembic (migrations ready)                           |
| Email     | Python smtplib — Gmail SMTP, zero extra packages               |

---

## Database Schema

```
users
  id | name | email | timezone | created_at

schedules                                      ← named availability schedules
  id | user_id (FK) | name | is_default | created_at

availability_schedules                         ← weekly hours per schedule
  id | user_id (FK) | schedule_id (FK)
  | day_of_week (0=Sun…6=Sat)
  | start_time (HH:MM) | end_time (HH:MM) | is_active

date_overrides                                 ← custom hours or blocked dates
  id | user_id (FK) | schedule_id (FK)
  | date (YYYY-MM-DD) | is_unavailable (bool)
  | start_time | end_time | reason

event_types
  id | user_id (FK) | schedule_id (FK)
  | name | duration_minutes | slug (unique)
  | description | location | color | is_active
  | buffer_before | buffer_after              ← buffer time in minutes
  | questions (JSON)                          ← custom invitee questions
  | created_at | updated_at

bookings
  id | event_type_id (FK) | invitee_name | invitee_email
  | start_time | end_time
  | status (active | cancelled | rescheduled)
  | notes | answers (JSON)                    ← invitee answers to questions
  | created_at

blocked_dates                                  ← legacy simple date blocking
  id | user_id (FK) | date (YYYY-MM-DD) | reason
```

### questions JSON (stored on event_types)
```json
[
  { "id": "q1", "label": "What would you like to discuss?", "required": false },
  { "id": "q2", "label": "Share any relevant links", "required": false }
]
```

### answers JSON (stored on bookings)
```json
[
  { "question": "What would you like to discuss?", "answer": "Product roadmap" }
]
```

---

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- MySQL 8

### 1. Clone & enter directory
```bash
git clone <your-repo-url>
cd calendly-clone
```

### 2. Create MySQL database
Open MySQL Workbench or terminal and run:
```sql
CREATE DATABASE calendly_clone CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Backend setup

**Windows (PowerShell):**
```powershell
python -m venv venv
venv\Scripts\activate
pip install -r backend/requirements.txt
copy backend\.env.example backend\.env
```

**Mac / Linux:**
```bash
python -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your MySQL credentials:
```env
DATABASE_URL=mysql+pymysql://root:yourpassword@localhost:3306/calendly_clone
EMAIL_ENABLED=false
```

Start the backend (tables + seed data auto-created on first run):
```powershell
python run.py
```

Backend runs at: `http://localhost:8000`
Swagger API docs: `http://localhost:8000/docs`

### 4. Frontend setup (new terminal)
```powershell
npm install
npm run dev
```

App runs at: `http://localhost:5173`

---

## Every time you work on it

```powershell
# Terminal 1 — backend
venv\Scripts\activate
python run.py

# Terminal 2 — frontend
npm run dev
```

---

## Pages & Features

### Admin Side (pre-logged in as Anushka Patel)

| Page         | URL              | Features                                                                           |
|--------------|------------------|------------------------------------------------------------------------------------|
| Scheduling   | `/scheduling`    | List / create / edit / delete event types, toggle active, copy booking link        |
| Meetings     | `/meetings`      | View upcoming & past meetings, cancel, reschedule                                  |
| Availability | `/availability`  | Multiple named schedules, weekly hours per day, timezone, date-specific overrides  |

### Public Side (no login required)

| Page         | URL                        | Features                                                              |
|--------------|----------------------------|-----------------------------------------------------------------------|
| Booking      | `/book/:slug`              | Month calendar, available time slots, custom questions form           |
| Confirmation | `/book/:slug/confirmed`    | Meeting details + invitee answers displayed                           |
| Reschedule   | `/reschedule/:bookingId`   | Full calendar + slots to pick a new time, emails invitee on confirm   |

---

## All Features Implemented

### Core (Must Have)
| Feature | Status |
|---|---|
| Create / edit / delete event types (name, duration, slug) | ✅ |
| Unique public booking link per event type | ✅ |
| Set available days of week | ✅ |
| Set time slots per day (start / end) | ✅ |
| Set timezone | ✅ |
| Month calendar view on booking page | ✅ |
| Available time slots for selected date | ✅ |
| Booking form — name + email | ✅ |
| Prevent double booking | ✅ |
| Booking confirmation page | ✅ |
| View upcoming meetings | ✅ |
| View past meetings | ✅ |
| Cancel a meeting | ✅ |
| Seed database with sample data | ✅ |

### Bonus
| Feature | Status | Details |
|---|---|---|
| Responsive design | ✅ | Mobile / tablet / desktop media queries |
| Multiple availability schedules | ✅ | Named schedules (e.g. "Working hours", "Weekend hours") |
| Date-specific hours | ✅ | Override any date with custom hours or mark unavailable |
| Rescheduling flow | ✅ | Full page with calendar + slots, updates booking, emails invitee |
| Email notifications | ✅ | Confirmation + cancellation emails to both host and invitee |
| Buffer time | ✅ | Configurable before/after each meeting, reflected in slot generator |
| Custom invitee questions | ✅ | Per-event questions with required flag, answers stored on booking |

---

## Email Notifications Setup (Gmail)

1. Enable **2-Step Verification** on your Google account
2. Go to **myaccount.google.com → Security → App passwords**
3. Generate a 16-character app password
4. Update `backend/.env`:

```env
EMAIL_ENABLED=true
EMAIL_USERNAME=your@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM_NAME=Calendly Clone
```

Emails sent automatically:
- **On new booking** — confirmation to invitee + notification to host (includes question answers)
- **On cancellation** — cancellation notice to both parties
- **On reschedule** — updated confirmation to invitee

Email failures are caught silently — the booking API always returns success even if email fails.

---

## API Endpoints

### Schedules
```
GET    /schedules                        List all availability schedules
POST   /schedules                        Create a new named schedule
PUT    /schedules/{id}/days              Save weekly hours for a schedule
PATCH  /schedules/{id}                   Rename a schedule
DELETE /schedules/{id}                   Delete a schedule (not default)
```

### Date Overrides
```
GET    /date-overrides?schedule_id=      List overrides for a schedule
POST   /date-overrides                   Add a date override
DELETE /date-overrides/{id}              Remove an override
```

### Event Types
```
GET    /event-types                      List all event types
POST   /event-types                      Create (with buffer + questions)
GET    /event-types/{id}                 Get one
PUT    /event-types/{id}                 Update
DELETE /event-types/{id}                 Delete
```

### Bookings (Admin)
```
GET    /bookings                         List all bookings
PATCH  /bookings/{id}/cancel             Cancel + send emails
PATCH  /bookings/{id}/reschedule         Reschedule + send emails
```

### Public
```
GET    /public/event-types/{slug}        Event info + questions (for booking page)
GET    /public/slots/{slug}?date=        Available slots (buffer + override aware)
POST   /public/bookings                  Book a slot + send emails
GET    /public/bookings/{id}             Get booking by ID (for reschedule page)
```

---

## Slot Generation Algorithm

Located in `backend/slot_service.py`. For a given date:

```
1. Check date_overrides → if is_unavailable: return []
                        → if custom hours: use those instead of weekly schedule
2. Check blocked_dates (legacy) → return [] if blocked
3. Look up availability_schedules for this schedule + day_of_week
4. Generate candidate slots: window_start → window_end, step = duration_minutes
5. Fetch active bookings for this event type on this day
6. For each slot, check padded overlap:
     padded_start = slot_start - buffer_before
     padded_end   = slot_start + duration + buffer_after
     conflict if: padded_start < booking.end_time AND padded_end > booking.start_time
7. Return [{time, available}] for each slot
```

Buffer time means a 30-min meeting with 10-min buffers blocks 50 minutes total, preventing back-to-back bookings.

---

## Seed Data

Auto-created on first startup:

**User:** Anushka Patel · p.anushka721@gmail.com · IST timezone

**Schedules:**
- Working hours (default) — Mon–Fri 9am–5pm
- Weekend hours — Sat–Sun 10am–2pm

**Event Types:**

| Name | Duration | Buffer | Questions |
|---|---|---|---|
| 30 Minute Meeting | 30 min | 5m after | 2 |
| Coffee Chat | 15 min | none | none |
| 1 Hour Strategy Call | 60 min | 10m before + 10m after | 2 (1 required) |

**Bookings:** 2 upcoming, 1 past completed, 1 cancelled

**Date override:** Next Monday +1 week → custom hours 10am–1pm (half day example)

---

## Design Decisions

1. **Single default user** — No auth flow per requirements. One seeded admin acts as host.

2. **Schedules table** — Named schedules allow the same user to have different availability windows (weekdays vs weekends) and assign them to specific event types.

3. **Date overrides take priority** — Slot generator checks `date_overrides` first, then `blocked_dates`, then weekly schedule. This gives fine-grained control without touching the weekly schedule.

4. **JSON for questions and answers** — Flexible schema avoids a separate questions table. Question text is copied into the booking answer at booking time, so editing questions later doesn't corrupt existing answers.

5. **Buffer time uses padded interval overlap** — Rather than simply blocking adjacent slots, the generator expands each slot's window by the buffer and checks intersection. This correctly handles all edge cases.

6. **UTC storage** — All datetimes stored as UTC. Frontend displays in configured timezone using Day.js.

7. **Non-blocking emails** — Email failures are caught and logged. The booking / cancel / reschedule APIs always return success so a misconfigured SMTP never breaks the user flow.

8. **Reschedule creates audit trail** — The original booking row is updated in place (start/end time changes), but status stays `active`. A future enhancement could keep a history table.

---

## Deployment

| Service   | Recommended                                        |
|-----------|----------------------------------------------------|
| Frontend  | Vercel — connect GitHub repo, zero config for Vite |
| Backend   | Render / Railway — free tier, point to `run.py`    |
| Database  | PlanetScale / Railway MySQL                        |

For production, update `allow_origins` in `backend/main.py` to your deployed frontend URL.

---

## Assumptions Made

- A single admin user (Anushka Patel) is always logged in — no auth/session handling required per the assignment spec.
- Timezone conversion is display-only on the frontend; the backend stores and compares all times as naive UTC datetimes.
- Slugs are globally unique across all users (matches real Calendly's URL pattern).
- The public booking page does not require authentication.
- Rescheduling is admin-initiated (from the Meetings page) — invitees cannot self-reschedule.