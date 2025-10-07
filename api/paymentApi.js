import API from "./apiClient";

export const initializeTaskPayment = (data)=>API.post('/api/initialize_payment',data)
export const verifyTaskPayment = (reference)=>API.put(`/api/verify_payment/${reference}`)

// View Earnings
export const viewAllEarnings = ()=>API.get('/api/h1/v2/view_all_earnings')

// client view payments
export const getClientPayments = ()=>API.get('/api/h1/v2/get_all_payments')

