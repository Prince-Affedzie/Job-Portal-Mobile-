import API from "./apiClient";

export const taskerOnboarding = (data) =>
  API.post("/api/tasker/onboard", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });


export const taskerProfileUpdate =(data)=>
    API.post("/api/tasker/update_profile", data, {
    headers: { "Content-Type": "multipart/form-data" },
  } )

export const taskerGetMyProfile = ()=>
    API.get('/api/tasker/my_profile')

export const uploadPortfolioFiles = (data) => 
  API.post("/api/user/upload_portfolio", data,{
     headers: { "Content-Type": "multipart/form-data" },
  });
  
export const addWorkSampleToProfile = (data)=>API.post('/api/h1/v2/add_work_sample_to_profile',data)
export const removeWorkSampleFromProfile = (sampleId)=>API.delete(`/api/h1/v2/remove_work_sample_from_profile/${sampleId}`)


// bookingsa
export const viewBookings = ()=>API.get('/api/service/tasker/bookings')
export const viewBookingById = (bookingId)=>API.get(`/api/service/tasker/booking/${bookingId}`)
export const acceptBooking = (bookingId)=>API.patch(`/api/service/tasker/booking/accept/${bookingId}`)
export const unlockBooking = (bookingId)=>API.patch(`/api/service/tasker/booking/unlock/${bookingId}`)
export const declineBooking =(bookingId)=>API.patch(`/api/service/tasker/booking/${bookingId}/reject`)
export const confirmCompletion = (bookingId,pincode)=>API.patch(`/api/service/tasker/booking/confirm/${bookingId}/complete`,pincode)

// credit purchasing
export const initializeCreditPurchase = ()=>API.post('/api/initialize/credit_purchase')
export const verifyCreditPurchase =(reference)=>API.put(`/api/verify/credit_purchase/${reference}`)