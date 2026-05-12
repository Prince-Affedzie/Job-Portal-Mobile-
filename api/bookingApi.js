import API from "./apiClient";
export const bookService = (formData)=>API.post('/api/service/book',formData)
export const getMyBookings = ()=>API.get("/api/service/bookings")
export const bookingDetails = (bookingId)=>API.get(`/api/service/bookings/${bookingId}`)
export const cancelBooking = (bookingId)=>API.patch(`/api/service/bookings/${bookingId}/cancel`)
export const markBookingCompleted =(bookingId)=>API.patch(`/api/service/confirm/${bookingId}/complete`)


///service/book

///service/bookings