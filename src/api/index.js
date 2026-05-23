import axios from 'axios'

const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL || '/api' 
})

// Event Types
export const getEventTypes       = ()        => api.get('/event-types')
export const createEventType     = (data)    => api.post('/event-types', data)
export const updateEventType     = (id, d)   => api.put(`/event-types/${id}`, d)
export const deleteEventType     = (id)      => api.delete(`/event-types/${id}`)

// Schedules
export const getSchedules        = ()        => api.get('/schedules')
export const createSchedule      = (data)    => api.post('/schedules', data)
export const updateScheduleDays  = (id, d)   => api.put(`/schedules/${id}/days`, d)
export const renameSchedule      = (id, d)   => api.patch(`/schedules/${id}`, d)
export const deleteSchedule      = (id)      => api.delete(`/schedules/${id}`)

// Date overrides
export const getDateOverrides    = (sid)     => api.get(`/date-overrides${sid ? `?schedule_id=${sid}` : ''}`)
export const createDateOverride  = (data)    => api.post('/date-overrides', data)
export const deleteDateOverride  = (id)      => api.delete(`/date-overrides/${id}`)

// Bookings
export const getBookings         = ()        => api.get('/bookings')
export const cancelBooking       = (id)      => api.patch(`/bookings/${id}/cancel`)
export const rescheduleBooking   = (id, d)   => api.patch(`/bookings/${id}/reschedule`, d)

// Public booking
export const getEventTypeBySlug  = (slug)    => api.get(`/public/event-types/${slug}`)
export const getAvailableSlots   = (slug, d) => api.get(`/public/slots/${slug}?date=${d}`)
export const createBooking       = (data)    => api.post('/public/bookings', data)
export const getPublicBooking    = (id)      => api.get(`/public/bookings/${id}`)

export default api
