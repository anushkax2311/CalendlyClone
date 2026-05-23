import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './components/AdminLayout.jsx'
import SchedulingPage from './pages/SchedulingPage.jsx'
import MeetingsPage from './pages/MeetingsPage.jsx'
import AvailabilityPage from './pages/AvailabilityPage.jsx'
import BookingPage from './pages/BookingPage.jsx'
import BookingConfirmation from './pages/BookingConfirmation.jsx'
import ReschedulePage from './pages/ReschedulePage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Navigate to="/scheduling" replace />} />
          <Route path="scheduling" element={<SchedulingPage />} />
          <Route path="meetings" element={<MeetingsPage />} />
          <Route path="availability" element={<AvailabilityPage />} />
        </Route>
        <Route path="/book/:slug" element={<BookingPage />} />
        <Route path="/book/:slug/confirmed" element={<BookingConfirmation />} />
        <Route path="/reschedule/:bookingId" element={<ReschedulePage />} />
      </Routes>
    </BrowserRouter>
  )
}
