from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .models import User, EventType, AvailabilitySchedule, Booking, Schedule, DateOverride


def seed_database(db: Session) -> None:
    if db.query(User).first():
        print("Already seeded.")
        return
    print("Seeding...")

    user = User(id=1, name="Anushka Patel", email="p.anushka721@gmail.com", timezone="Asia/Kolkata")
    db.add(user); db.flush()

    # ── Schedules ──────────────────────────────────────────────────────────
    default_sched = Schedule(user_id=1, name="Working hours", is_default=True)
    weekend_sched = Schedule(user_id=1, name="Weekend hours", is_default=False)
    db.add(default_sched); db.add(weekend_sched); db.flush()

    # Working hours: Mon–Fri 9am–5pm
    for dow in range(7):
        db.add(AvailabilitySchedule(
            user_id=1, schedule_id=default_sched.id, day_of_week=dow,
            start_time="09:00", end_time="17:00", is_active=dow in (1,2,3,4,5),
        ))
    # Weekend hours: Sat–Sun 10am–2pm
    for dow in range(7):
        db.add(AvailabilitySchedule(
            user_id=1, schedule_id=weekend_sched.id, day_of_week=dow,
            start_time="10:00", end_time="14:00", is_active=dow in (0,6),
        ))

    # ── Date override example ──────────────────────────────────────────────
    from datetime import date
    next_monday = date.today()
    while next_monday.weekday() != 0:
        next_monday = next_monday + timedelta(days=1)
    db.add(DateOverride(
        user_id=1, schedule_id=default_sched.id,
        date=(next_monday + timedelta(weeks=1)).isoformat(),
        is_unavailable=False, start_time="10:00", end_time="13:00",
        reason="Half day",
    ))

    # ── Event types ────────────────────────────────────────────────────────
    ets = []
    for data in [
        dict(name="30 Minute Meeting", duration_minutes=30, slug="30min",
             location="Google Meet", color="#006bff", is_active=True,
             buffer_before=0, buffer_after=5, schedule_id=default_sched.id,
             questions=[{"id":"q1","label":"What would you like to discuss?","required":False},
                        {"id":"q2","label":"Share any relevant links","required":False}]),
        dict(name="Coffee Chat", duration_minutes=15, slug="coffee-chat",
             location="Zoom", color="#6c3fc5", is_active=True,
             buffer_before=0, buffer_after=0, schedule_id=default_sched.id, questions=[]),
        dict(name="1 Hour Strategy Call", duration_minutes=60, slug="strategy-call",
             location="Google Meet", color="#00a86b", is_active=True,
             buffer_before=10, buffer_after=10, schedule_id=default_sched.id,
             questions=[{"id":"q1","label":"Share your goals for this call","required":True},
                        {"id":"q2","label":"Current challenges","required":False}]),
    ]:
        et = EventType(user_id=1, **data); db.add(et); ets.append(et)
    db.flush()

    # ── Bookings ───────────────────────────────────────────────────────────
    now = datetime.utcnow()
    def next_weekday(delta):
        d = now + timedelta(days=delta)
        while d.weekday() >= 5: d += timedelta(days=1)
        return d.replace(hour=10, minute=0, second=0, microsecond=0)

    for bdata in [
        dict(et=ets[0], name="Riya Sharma", email="riya@example.com",
             start=next_weekday(1), end=next_weekday(1)+timedelta(minutes=30), status="active"),
        dict(et=ets[1], name="Arjun Mehta", email="arjun@example.com",
             start=next_weekday(3).replace(hour=14), end=next_weekday(3).replace(hour=14)+timedelta(minutes=15), status="active"),
        dict(et=ets[0], name="Priya Nair", email="priya@example.com",
             start=now-timedelta(days=2,hours=3), end=now-timedelta(days=2,hours=2,minutes=30), status="active"),
        dict(et=ets[2], name="Dev Patel", email="dev@example.com",
             start=now-timedelta(days=5,hours=1), end=now-timedelta(days=5), status="cancelled"),
    ]:
        db.add(Booking(event_type_id=bdata["et"].id, invitee_name=bdata["name"],
                       invitee_email=bdata["email"], start_time=bdata["start"],
                       end_time=bdata["end"], status=bdata["status"], answers=[]))
    db.commit()
    print("Seeding complete.")
