from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, SessionLocal
from models import Base
from routers import event_router, bookings_router, public_router, sched_router, override_router
from seed import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Calendly Clone API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
  "http://localhost:5173",
  "https://calendly-clone-pylw.vercel.app"
],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

app.include_router(sched_router)
app.include_router(override_router)
app.include_router(event_router)
app.include_router(bookings_router)
app.include_router(public_router)


@app.get("/health")
def health():
    return {"status": "ok"}
