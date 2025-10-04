import API from "./apiClient";

export const initializeTaskPayment = (data)=>API.post('/api/initialize_payment',data)
export const verifyTaskPayment = (reference)=>API.put(`/api/verify_payment/${reference}`)

