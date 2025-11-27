import API from "../apiClient"

export const requestService = (data)=>
    API.post("/api/service/client-request-service",data)
export const getServiceRequest = ()=>
    API.get("/api/service/client-get-my-requests")

export const getRequestDetail = (requestId)=>
    API.get(`/api/service/client-service-info/${requestId}`)

export const cancelRequest = (requestId)=>
    API.patch(`/api/service/client-request/${requestId}/cancel/`)

export const acceptOffer = (requestId,offerId)=>
    API.patch(`/api/service/accept-offer/${requestId}/${offerId}`)

export const deleteRequest = (requestId)=>
    API.delete(`/api/service/delete/${requestId}`)

export const updateRequest =(requestId,updates)=>
    API.put(`/api/service/client_update_request/${requestId}`,updates)

export const markServiceDone = (requestId)=>
    API.patch(`/api/service/client-mark-service/${requestId}/complete`)
