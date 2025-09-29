import API from "./apiClient";

export const createNotification =(data)=>API.post('/api/notifications',data)
export const getNotifications = ()=>API.get('/api/notifications')
export const markNotificationAsRead = (ids) => API.put(`/api/mark_notifications/read`, ids);
export const deleteNotification = (Id)=>API.delete(`/api/delete/notification/${Id}`)
export const deleteBulkNotifications = (selectedNotifications)=>API.post(`/api/delete/bulk_notification`,selectedNotifications)