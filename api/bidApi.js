import API from "./apiClient";

export const applyToMiniTask = (id) =>
  API.post(`/api/h1/v2/mini_task/apply/${id}`);

export const bidOnMiniTask = (id, bidData) =>
  API.post(`/api/h1/v2/mini_task/apply/${id}`, bidData);

export const getMicroTaskApplicants = (id) =>
  API.get(`/api/h1/v2/get_applicants/my_micro_task/${id}`);

export const getMicroTaskBids = (id) =>
  API.get(`/api/h1/v2/get_bids/my_micro_task/${id}`);

export const acceptBidForTask = (taskId, bidId) =>
  API.put(`/api/h1/v2/accept_bid/mini_task/${taskId}/${bidId}`);
