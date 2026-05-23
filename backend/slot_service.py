"""
Slot generation — handles multiple schedules, date overrides, and buffer time.

Priority order for a given date:
  1. DateOverride (is_unavailable → [], custom hours → use those)
  2. BlockedDate (legacy — block entire day)
  3. Weekly AvailabilitySchedule for the event's schedule (or default schedule)
"""
from __future__ import annotations
from datetime import date, datetime, timedelta
from typing import List, Tuple, Optional
from sqlalchemy.orm import Session

from models import AvailabilitySchedule, Booking, EventType, BlockedDate, Schedule, DateOverride


def _parse_hhmm(t: str) -> Tuple[int, int]:
    h, m = t.split(":")
    return int(h), int(m)


def _get_schedule_id(db: Session, event_type: EventType) -> Optional[int]:
    """Return the schedule_id to use for this event type."""
    if event_type.schedule_id:
        return event_type.schedule_id
    default = (
        db.query(Schedule)
        .filter(Schedule.user_id == event_type.user_id, Schedule.is_default == True)
        .first()
    )
    return default.id if default else None


def get_available_slots(db: Session, event_type: EventType, target_date: date) -> List[dict]:
    user_id = event_type.user_id
    schedule_id = _get_schedule_id(db, event_type)
    dow_schema = (target_date.weekday() + 1) % 7   # Mon=0 → Sun=0

    duration   = timedelta(minutes=event_type.duration_minutes)
    buf_before = timedelta(minutes=event_type.buffer_before or 0)
    buf_after  = timedelta(minutes=event_type.buffer_after or 0)

    # ── 1. Date override (highest priority) ────────────────────────────────
    override = (
        db.query(DateOverride)
        .filter(
            DateOverride.user_id == user_id,
            DateOverride.date == target_date.isoformat(),
        )
        .first()
    )
    if override:
        if override.is_unavailable:
            return []
        # Custom hours for this date
        sh, sm = _parse_hhmm(override.start_time)
        eh, em = _parse_hhmm(override.end_time)
        window_start = datetime(target_date.year, target_date.month, target_date.day, sh, sm)
        window_end   = datetime(target_date.year, target_date.month, target_date.day, eh, em)
    else:
        # ── 2. Legacy blocked_dates ─────────────────────────────────────────
        blocked = (
            db.query(BlockedDate)
            .filter(BlockedDate.user_id == user_id, BlockedDate.date == target_date.isoformat())
            .first()
        )
        if blocked:
            return []

        # ── 3. Weekly schedule ──────────────────────────────────────────────
        query = db.query(AvailabilitySchedule).filter(
            AvailabilitySchedule.user_id == user_id,
            AvailabilitySchedule.day_of_week == dow_schema,
            AvailabilitySchedule.is_active == True,
        )
        if schedule_id:
            query = query.filter(AvailabilitySchedule.schedule_id == schedule_id)
        avail = query.first()
        if not avail:
            return []

        sh, sm = _parse_hhmm(avail.start_time)
        eh, em = _parse_hhmm(avail.end_time)
        window_start = datetime(target_date.year, target_date.month, target_date.day, sh, sm)
        window_end   = datetime(target_date.year, target_date.month, target_date.day, eh, em)

    # ── Generate candidate slots ────────────────────────────────────────────
    slots: List[datetime] = []
    cursor = window_start
    while cursor + duration <= window_end:
        slots.append(cursor)
        cursor += duration

    if not slots:
        return []

    # ── Fetch existing active bookings for this day ─────────────────────────
    day_start = datetime(target_date.year, target_date.month, target_date.day, 0, 0)
    day_end   = day_start + timedelta(days=1)
    existing  = (
        db.query(Booking)
        .filter(
            Booking.event_type_id == event_type.id,
            Booking.status == "active",
            Booking.start_time >= day_start,
            Booking.start_time < day_end,
        )
        .all()
    )

    def conflicts(slot_start: datetime) -> bool:
        ps = slot_start - buf_before
        pe = slot_start + duration + buf_after
        return any(ps < b.end_time and pe > b.start_time for b in existing)

    return [{"time": s.strftime("%H:%M"), "available": not conflicts(s)} for s in slots]
