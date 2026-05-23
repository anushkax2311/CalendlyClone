from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import EventType, AvailabilitySchedule, Booking, User, Schedule, DateOverride
from schemas import (
    EventTypeCreate, EventTypeUpdate, EventTypeOut,
    AvailabilityUpdate, AvailabilityOut, ScheduleOut, ScheduleCreate, ScheduleUpdate, DaySchedule,
    BookingCreate, BookingOut, RescheduleRequest,
    DateOverrideCreate, DateOverrideOut,
    PublicEventTypeOut, SlotOut,
)
from slot_service import get_available_slots
from email_service import (
    send_booking_confirmation_to_invitee, send_booking_notification_to_host,
    send_cancellation_email,
)

DEFAULT_USER_ID = 1


def get_default_user(db: Session) -> User:
    user = db.query(User).filter(User.id == DEFAULT_USER_ID).first()
    if not user:
        raise HTTPException(404, "Default user not found")
    return user


def _enrich(b: Booking) -> dict:
    return {
        "id": b.id, "event_type_id": b.event_type_id,
        "event_name": b.event_type.name if b.event_type else None,
        "location": b.event_type.location if b.event_type else None,
        "event_slug": b.event_type.slug if b.event_type else None,
        "invitee_name": b.invitee_name, "invitee_email": b.invitee_email,
        "start_time": b.start_time, "end_time": b.end_time,
        "status": b.status, "notes": b.notes,
        "answers": b.answers or [], "created_at": b.created_at,
    }


# ── Schedules ─────────────────────────────────────────────────────────────────
sched_router = APIRouter(prefix="/schedules", tags=["Schedules"])


def _schedule_to_out(s: Schedule, db: Session) -> dict:
    rows = (
        db.query(AvailabilitySchedule)
        .filter(AvailabilitySchedule.schedule_id == s.id)
        .order_by(AvailabilitySchedule.day_of_week)
        .all()
    )
    days = [
        DaySchedule(day_of_week=r.day_of_week, enabled=r.is_active,
                    start_time=r.start_time, end_time=r.end_time)
        for r in rows
    ]
    return {"id": s.id, "name": s.name, "is_default": s.is_default, "days": days}


@sched_router.get("", response_model=List[ScheduleOut])
def list_schedules(db: Session = Depends(get_db)):
    schedules = (
        db.query(Schedule)
        .filter(Schedule.user_id == DEFAULT_USER_ID)
        .order_by(Schedule.is_default.desc(), Schedule.created_at)
        .all()
    )
    return [_schedule_to_out(s, db) for s in schedules]


@sched_router.post("", status_code=201)
def create_schedule(payload: ScheduleCreate, db: Session = Depends(get_db)):
    get_default_user(db)
    # If new schedule is default, unset others
    if payload.is_default:
        db.query(Schedule).filter(Schedule.user_id == DEFAULT_USER_ID).update({"is_default": False})

    s = Schedule(user_id=DEFAULT_USER_ID, name=payload.name, is_default=payload.is_default)
    db.add(s)
    db.flush()

    # Seed 7 days (Mon–Fri active by default)
    for dow in range(7):
        db.add(AvailabilitySchedule(
            user_id=DEFAULT_USER_ID, schedule_id=s.id,
            day_of_week=dow, start_time="09:00", end_time="17:00",
            is_active=dow in (1, 2, 3, 4, 5),
        ))
    db.commit()
    db.refresh(s)
    return _schedule_to_out(s, db)


@sched_router.put("/{schedule_id}/days")
def update_schedule_days(
    schedule_id: int,
    payload: AvailabilityUpdate,
    db: Session = Depends(get_db),
):
    s = db.query(Schedule).filter(
        Schedule.id == schedule_id, Schedule.user_id == DEFAULT_USER_ID
    ).first()
    if not s:
        raise HTTPException(404, "Schedule not found")

    # Update timezone on user
    user = get_default_user(db)
    user.timezone = payload.timezone

    # Replace all day rows for this schedule
    db.query(AvailabilitySchedule).filter(
        AvailabilitySchedule.schedule_id == schedule_id
    ).delete()
    for day in payload.days:
        db.add(AvailabilitySchedule(
            user_id=DEFAULT_USER_ID, schedule_id=schedule_id,
            day_of_week=day.day_of_week, start_time=day.start_time,
            end_time=day.end_time, is_active=day.enabled,
        ))
    db.commit()
    return _schedule_to_out(s, db)


@sched_router.patch("/{schedule_id}")
def rename_schedule(schedule_id: int, payload: ScheduleUpdate, db: Session = Depends(get_db)):
    s = db.query(Schedule).filter(
        Schedule.id == schedule_id, Schedule.user_id == DEFAULT_USER_ID
    ).first()
    if not s:
        raise HTTPException(404, "Schedule not found")
    if payload.name is not None:
        s.name = payload.name
    if payload.is_default:
        db.query(Schedule).filter(Schedule.user_id == DEFAULT_USER_ID).update({"is_default": False})
        s.is_default = True
    db.commit()
    return _schedule_to_out(s, db)


@sched_router.delete("/{schedule_id}", status_code=204)
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    s = db.query(Schedule).filter(
        Schedule.id == schedule_id, Schedule.user_id == DEFAULT_USER_ID
    ).first()
    if not s:
        raise HTTPException(404, "Schedule not found")
    if s.is_default:
        raise HTTPException(400, "Cannot delete the default schedule")
    db.delete(s)
    db.commit()


# ── Date Overrides ─────────────────────────────────────────────────────────────
override_router = APIRouter(prefix="/date-overrides", tags=["Date Overrides"])


@override_router.get("", response_model=List[DateOverrideOut])
def list_overrides(
    schedule_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(DateOverride).filter(DateOverride.user_id == DEFAULT_USER_ID)
    if schedule_id:
        q = q.filter(DateOverride.schedule_id == schedule_id)
    return q.order_by(DateOverride.date).all()


@override_router.post("", response_model=DateOverrideOut, status_code=201)
def create_override(payload: DateOverrideCreate, db: Session = Depends(get_db)):
    get_default_user(db)
    # Remove existing override for same date (one override per date)
    db.query(DateOverride).filter(
        DateOverride.user_id == DEFAULT_USER_ID,
        DateOverride.date == payload.date,
    ).delete()

    ov = DateOverride(
        user_id=DEFAULT_USER_ID,
        schedule_id=payload.schedule_id,
        date=payload.date,
        is_unavailable=payload.is_unavailable,
        start_time=payload.start_time,
        end_time=payload.end_time,
        reason=payload.reason,
    )
    db.add(ov)
    db.commit()
    db.refresh(ov)
    return ov


@override_router.delete("/{override_id}", status_code=204)
def delete_override(override_id: int, db: Session = Depends(get_db)):
    ov = db.query(DateOverride).filter(
        DateOverride.id == override_id, DateOverride.user_id == DEFAULT_USER_ID
    ).first()
    if not ov:
        raise HTTPException(404, "Override not found")
    db.delete(ov)
    db.commit()


# ── Event Types ────────────────────────────────────────────────────────────────
event_router = APIRouter(prefix="/event-types", tags=["Event Types"])


@event_router.get("", response_model=List[EventTypeOut])
def list_event_types(db: Session = Depends(get_db)):
    return (
        db.query(EventType).filter(EventType.user_id == DEFAULT_USER_ID)
        .order_by(EventType.created_at.desc()).all()
    )


@event_router.post("", response_model=EventTypeOut, status_code=201)
def create_event_type(payload: EventTypeCreate, db: Session = Depends(get_db)):
    get_default_user(db)
    if db.query(EventType).filter(EventType.slug == payload.slug).first():
        raise HTTPException(400, "Slug already in use")
    data = payload.model_dump()
    data["questions"] = [q.model_dump() for q in payload.questions]
    et = EventType(user_id=DEFAULT_USER_ID, **data)
    db.add(et); db.commit(); db.refresh(et)
    return et


@event_router.get("/{event_id}", response_model=EventTypeOut)
def get_event_type(event_id: int, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(
        EventType.id == event_id, EventType.user_id == DEFAULT_USER_ID
    ).first()
    if not et: raise HTTPException(404, "Not found")
    return et


@event_router.put("/{event_id}", response_model=EventTypeOut)
def update_event_type(event_id: int, payload: EventTypeUpdate, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(
        EventType.id == event_id, EventType.user_id == DEFAULT_USER_ID
    ).first()
    if not et: raise HTTPException(404, "Not found")
    data = payload.model_dump(exclude_unset=True)
    if "slug" in data and data["slug"] != et.slug:
        if db.query(EventType).filter(EventType.slug == data["slug"]).first():
            raise HTTPException(400, "Slug already in use")
    if "questions" in data and data["questions"] is not None:
        data["questions"] = [q.model_dump() if hasattr(q, "model_dump") else q for q in payload.questions]
    for k, v in data.items(): setattr(et, k, v)
    et.updated_at = datetime.utcnow()
    db.commit(); db.refresh(et)
    return et


@event_router.delete("/{event_id}", status_code=204)
def delete_event_type(event_id: int, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(
        EventType.id == event_id, EventType.user_id == DEFAULT_USER_ID
    ).first()
    if not et: raise HTTPException(404, "Not found")
    db.delete(et); db.commit()


# ── Bookings (admin) ───────────────────────────────────────────────────────────
bookings_router = APIRouter(prefix="/bookings", tags=["Bookings"])


@bookings_router.get("")
def list_bookings(db: Session = Depends(get_db)):
    bookings = (
        db.query(Booking).join(EventType)
        .filter(EventType.user_id == DEFAULT_USER_ID)
        .order_by(Booking.start_time.asc()).all()
    )
    return [_enrich(b) for b in bookings]


@bookings_router.patch("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: int, db: Session = Depends(get_db)):
    b = db.query(Booking).join(EventType).filter(
        Booking.id == booking_id, EventType.user_id == DEFAULT_USER_ID
    ).first()
    if not b: raise HTTPException(404, "Not found")
    if b.status == "cancelled": raise HTTPException(400, "Already cancelled")
    b.status = "cancelled"
    db.commit(); db.refresh(b)
    host = b.event_type.user
    try:
        send_cancellation_email(b.invitee_email, b.invitee_name, b.event_type.name, b.start_time, host.name)
        send_cancellation_email(host.email, host.name, b.event_type.name, b.start_time, b.invitee_name)
    except Exception:
        pass
    return _enrich(b)


@bookings_router.patch("/{booking_id}/reschedule", response_model=BookingOut)
def reschedule_booking(booking_id: int, payload: RescheduleRequest, db: Session = Depends(get_db)):
    b = db.query(Booking).join(EventType).filter(
        Booking.id == booking_id, EventType.user_id == DEFAULT_USER_ID
    ).first()
    if not b: raise HTTPException(404, "Not found")
    if b.status == "cancelled": raise HTTPException(400, "Cannot reschedule a cancelled booking")

    # Check for conflicts (excluding the current booking)
    conflict = db.query(Booking).filter(
        Booking.event_type_id == b.event_type_id,
        Booking.status == "active",
        Booking.id != booking_id,
        Booking.start_time < payload.new_end_time,
        Booking.end_time > payload.new_start_time,
    ).first()
    if conflict: raise HTTPException(409, "That time slot is already booked")

    old_start = b.start_time
    b.start_time = payload.new_start_time
    b.end_time   = payload.new_end_time
    b.status     = "active"
    db.commit(); db.refresh(b)

    host = b.event_type.user
    try:
        # Notify invitee of reschedule (reuse confirmation email)
        send_booking_confirmation_to_invitee(
            invitee_email=b.invitee_email, invitee_name=b.invitee_name,
            event_name=f"[Rescheduled] {b.event_type.name}", host_name=host.name,
            start_time=payload.new_start_time, end_time=payload.new_end_time,
            location=b.event_type.location,
        )
    except Exception:
        pass
    return _enrich(b)


# ── Public endpoints ───────────────────────────────────────────────────────────
public_router = APIRouter(prefix="/public", tags=["Public"])


@public_router.get("/event-types/{slug}", response_model=PublicEventTypeOut)
def get_public_event_type(slug: str, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.slug == slug, EventType.is_active == True).first()
    if not et: raise HTTPException(404, "Not found")
    return PublicEventTypeOut(
        id=et.id, name=et.name, duration_minutes=et.duration_minutes, slug=et.slug,
        description=et.description, location=et.location, color=et.color,
        buffer_before=et.buffer_before or 0, buffer_after=et.buffer_after or 0,
        questions=et.questions or [], host_name=et.user.name, host_timezone=et.user.timezone,
    )


@public_router.get("/bookings/{booking_id}", response_model=BookingOut)
def get_public_booking(booking_id: int, db: Session = Depends(get_db)):
    b = db.query(Booking).filter(Booking.id == booking_id).first()
    if not b: raise HTTPException(404, "Not found")
    return _enrich(b)


@public_router.get("/slots/{slug}", response_model=List[SlotOut])
def get_slots(slug: str, date: str = Query(...), db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.slug == slug, EventType.is_active == True).first()
    if not et: raise HTTPException(404, "Not found")
    try:
        target = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Invalid date. Use YYYY-MM-DD")
    return get_available_slots(db, et, target)


@public_router.post("/bookings", response_model=BookingOut, status_code=201)
def create_public_booking(payload: BookingCreate, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.slug == payload.event_type_slug, EventType.is_active == True).first()
    if not et: raise HTTPException(404, "Not found")
    conflict = db.query(Booking).filter(
        Booking.event_type_id == et.id, Booking.status == "active",
        Booking.start_time < payload.end_time, Booking.end_time > payload.start_time,
    ).first()
    if conflict: raise HTTPException(409, "Slot already booked")
    answers_data = [a.model_dump() for a in payload.answers]
    b = Booking(event_type_id=et.id, invitee_name=payload.invitee_name,
                invitee_email=payload.invitee_email, start_time=payload.start_time,
                end_time=payload.end_time, notes=payload.notes,
                status="active", answers=answers_data)
    db.add(b); db.commit(); db.refresh(b)
    host = et.user
    try:
        send_booking_confirmation_to_invitee(
            invitee_email=payload.invitee_email, invitee_name=payload.invitee_name,
            event_name=et.name, host_name=host.name,
            start_time=payload.start_time, end_time=payload.end_time,
            location=et.location, answers=answers_data,
        )
        send_booking_notification_to_host(
            host_email=host.email, host_name=host.name,
            invitee_name=payload.invitee_name, invitee_email=payload.invitee_email,
            event_name=et.name, start_time=payload.start_time, end_time=payload.end_time,
            location=et.location, answers=answers_data,
        )
    except Exception:
        pass
    return _enrich(b)
