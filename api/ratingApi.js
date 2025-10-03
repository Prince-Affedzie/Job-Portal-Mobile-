import API from "./apiClient";

export  const addRating =(data, userId)=> API.post(`/api/${userId}/rate`,data)