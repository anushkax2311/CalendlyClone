from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, field_validator
import re


class UserOut(BaseModel):
    id: int; name: str; email: str; timezone: str
    model_config = {"from_attributes": True}


# ── Question / Answer ─────────────────────────────────────────────────────────
class Question(BaseModel):
    id: str; label: str; required: bool = False

class BookingAnswer(BaseModel):
    question: str; answer: str


# ── Schedule ──────────────────────────────────────────────────────────────────
class ScheduleCreate(BaseModel):
    name: str
    is_default: bool = False

class ScheduleUpdate(BaseModel):
    name: Optional[str] = None
    is_default: Optional[bool] = None

class DaySchedule(BaseModel):
    day_of_week: int
    enabled: bool = True
    start_time: str = "09:00"
    end_time: str = "17:00"

    @field_validator("day_of_week")
    @classmethod
    def dow_valid(cls, v):
        if not 0 <= v <= 6: raise ValueError("day_of_week must be 0-6")
        return v

class ScheduleOut(BaseModel):
    id: int; name: str; is_default: bool
    days: List[DaySchedule] = []
    model_config = {"from_attributes": True}

class AvailabilityUpdate(BaseModel):
    schedule_id: int
    days: List[DaySchedule]
    timezone: str = "Asia/Kolkata"

class AvailabilityOut(BaseModel):
    schedules: List[ScheduleOut]
    timezone: str


# ── Date Override ─────────────────────────────────────────────────────────────
class DateOverrideCreate(BaseModel):
    date: str                            # YYYY-MM-DD
    is_unavailable: bool = False
    start_time: Optional[str] = None     # HH:MM  (null if is_unavailable)
    end_time: Optional[str] = None
    reason: Optional[str] = None
    schedule_id: Optional[int] = None

class DateOverrideOut(BaseModel):
    id: int; date: str; is_unavailable: bool
    start_time: Optional[str]; end_time: Optional[str]; reason: Optional[str]
    model_config = {"from_attributes": True}


# ── Event Type ────────────────────────────────────────────────────────────────
class EventTypeCreate(BaseModel):
    name: str; duration_minutes: int = 30; slug: str
    description: Optional[str] = None; location: Optional[str] = None
    color: str = "#006bff"; is_active: bool = True
    buffer_before: int = 0; buffer_after: int = 0
    questions: List[Question] = []
    schedule_id: Optional[int] = None

    @field_validator("slug")
    @classmethod
    def slug_valid(cls, v):
        if not re.match(r'^[a-z0-9-]+$', v): raise ValueError("Invalid slug")
        return v

class EventTypeUpdate(BaseModel):
    name: Optional[str] = None; duration_minutes: Optional[int] = None
    slug: Optional[str] = None; description: Optional[str] = None
    location: Optional[str] = None; color: Optional[str] = None
    is_active: Optional[bool] = None; buffer_before: Optional[int] = None
    buffer_after: Optional[int] = None; questions: Optional[List[Question]] = None
    schedule_id: Optional[int] = None

class EventTypeOut(BaseModel):
    id: int; user_id: int; name: str; duration_minutes: int; slug: str
    description: Optional[str]; location: Optional[str]; color: str
    is_active: bool; buffer_before: int; buffer_after: int
    questions: List[Any] = []; schedule_id: Optional[int]; created_at: datetime
    model_config = {"from_attributes": True}


# ── Booking ───────────────────────────────────────────────────────────────────
class BookingCreate(BaseModel):
    event_type_slug: str; invitee_name: str; invitee_email: str
    start_time: datetime; end_time: datetime
    notes: Optional[str] = None; answers: List[BookingAnswer] = []

class RescheduleRequest(BaseModel):
    new_start_time: datetime
    new_end_time: datetime

class BookingOut(BaseModel):
    id: int; event_type_id: int
    event_name: Optional[str] = None; location: Optional[str] = None
    event_slug: Optional[str] = None
    invitee_name: str; invitee_email: str
    start_time: datetime; end_time: datetime
    status: str; notes: Optional[str] = None
    answers: List[Any] = []; created_at: datetime
    model_config = {"from_attributes": True}


# ── Slots ─────────────────────────────────────────────────────────────────────
class SlotOut(BaseModel):
    time: str; available: bool


# ── Public event type ─────────────────────────────────────────────────────────
class PublicEventTypeOut(BaseModel):
    id: int; name: str; duration_minutes: int; slug: str
    description: Optional[str]; location: Optional[str]; color: str
    buffer_before: int; buffer_after: int; questions: List[Any] = []
    host_name: str; host_timezone: str
    model_config = {"from_attributes": True}
