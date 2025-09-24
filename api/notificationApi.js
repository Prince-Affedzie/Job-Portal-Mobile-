import API from "./apiClient";

export const createNotification =(data)=>API.post('/api/notifications',data)
export const getNotifications = ()=>API.get('/api/notifications')