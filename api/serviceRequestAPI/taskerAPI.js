import API from "../apiClient"

export const getAvailableRequests =()=>
    API.get("/api/service/tasker/summoned-requests")

export const getAssignedRequests = ()=>
    API.get("/api/service/tasker/assigend-requests")

export const submitOffer = (requestId,data)=>
    API.post(`/api/service/requests/${requestId}/offers`,data)

export const updateOffer = (requestId,offerId,data)=>
    API.patch(`/api/service/requests/${requestId}/offers/${offerId}`,data)

export const getOffers = ()=>
    API.get('/api/service/offers')

export const serviceRequestDetail = (requestId)=>
    API.get(`/api/service/tasker/request/${requestId}`)

export const markServiceComplete = (requestId)=>
    API.patch(`/api/service/tasker-mark-service/${requestId}/complete`)