import API from "./apiClient";

export const getTaskerProfile =(taskerId)=>API.get(`/api/h1/v2/tasker/${taskerId}`)

///h1/v2/tasker/:taskerId