from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    timezone = Column(String(60), default="Asia/Kolkata")
    created_at = Column(DateTime, default=datetime.utcnow)

    event_types = relationship("EventType", back_populates="user", cascade="all, delete-orphan")
    schedules = relationship("Schedule", back_populates="user", cascade="all, delete-orphan")
    blocked_dates = relationship("BlockedDate", back_populates="user", cascade="all, delete-orphan")
    date_overrides = relationship("DateOverride", back_populates="user", cascade="all, delete-orphan")


class Schedule(Base):
    """A named availability schedule (e.g. 'Working hours', 'Weekends only')."""
    __tablename__ = "schedules"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False, default="Working hours")
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="schedules")
    availability_slots = relationship("AvailabilitySchedule", back_populates="schedule", cascade="all, delete-orphan")
    event_types = relationship("EventType", back_populates="schedule")


class AvailabilitySchedule(Base):
    """One day-of-week row within a Schedule."""
    __tablename__ = "availability_schedules"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("schedules.id", ondelete="CASCADE"), nullable=True)
    day_of_week = Column(Integer, nullable=False)   # 0=Sun … 6=Sat
    start_time = Column(String(5), nullable=False, default="09:00")
    end_time = Column(String(5), nullable=False, default="17:00")
    is_active = Column(Boolean, default=True)

    schedule = relationship("Schedule", back_populates="availability_slots")


class DateOverride(Base):
    """Override availability for a specific date — custom hours or mark unavailable."""
    __tablename__ = "date_overrides"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("schedules.id", ondelete="CASCADE"), nullable=True)
    date = Column(String(10), nullable=False)        # YYYY-MM-DD
    is_unavailable = Column(Boolean, default=False)  # True = block entire day
    start_time = Column(String(5), nullable=True)    # custom start HH:MM
    end_time = Column(String(5), nullable=True)      # custom end HH:MM
    reason = Column(String(200), nullable=True)

    user = relationship("User", back_populates="date_overrides")


class EventType(Base):
    __tablename__ = "event_types"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("schedules.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(150), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=30)
    slug = Column(String(150), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    location = Column(String(100), nullable=True)
    color = Column(String(20), default="#006bff")
    is_active = Column(Boolean, default=True)
    buffer_before = Column(Integer, default=0)
    buffer_after = Column(Integer, default=0)
    questions = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="event_types")
    schedule = relationship("Schedule", back_populates="event_types")
    bookings = relationship("Booking", back_populates="event_type", cascade="all, delete-orphan")


class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    event_type_id = Column(Integer, ForeignKey("event_types.id", ondelete="CASCADE"), nullable=False)
    invitee_name = Column(String(100), nullable=False)
    invitee_email = Column(String(150), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(String(20), default="active")   # active | cancelled | rescheduled
    notes = Column(Text, nullable=True)
    answers = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    event_type = relationship("EventType", back_populates="bookings")


class BlockedDate(Base):
    __tablename__ = "blocked_dates"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(String(10), nullable=False)
    reason = Column(String(200), nullable=True)

    user = relationship("User", back_populates="blocked_dates")
