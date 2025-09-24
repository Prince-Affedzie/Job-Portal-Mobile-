import API from "./apiClient";

// Mini Task
export const postMiniTask = (data) => API.post("/api/h1/v2/post_mini_task", data);
export const getMiniTasks = (filters) =>
  API.get("/api/h1/v2/get/mini_tasks", { params: filters });

export const getMiniTaskInfo = (id) => API.get(`/api/h1/v2/get_min_task_info/${id}`);

export const getMiniTasksPosted = () =>
  API.get("/api/h1/v2/get_created/mini_tasks");

export const deleteMiniTask = (id) =>
  API.delete(`/api/h1/v2/delete/mini_task/${id}`);

export const updateMiniTask = (id, data) =>
  API.put(`/api/h1/v2/edit/mini_task/${id}`, { body: data });

export const assignApplicantToTask = (taskId, applicantId) =>
  API.put(`/api/h1/v2/assign/mini_task/${taskId}/${applicantId}`);

export const getYourAppliedMiniTasks = () =>
  API.get("/api/h1/v2/get_your_apllied/mini_tasks");

export const acceptMiniTaskAssignment = (id) =>
  API.put(`/api/h1/v2/accept_task_assignment/${id}`);

export const rejectMiniTaskAssignment = (id) =>
  API.put(`/api/h1/v2/reject_task_assignment/${id}`);

export const removeAppliedMiniTaskFromDashboard = (ids) =>
  API.put("/api/h1/v2/remove_mini_task_from_dashboard", ids);

// Work submission
export const submitWorkForReview = (taskId, data) =>
  API.post(`/api/submit_task_work/${taskId}`, data);

export const getMyWorkSubmissions = (taskId) =>
  API.get(`/api/get_mysubmissions/${taskId}`);

export const deleteWorkSubmission = (submissionId) =>
  API.delete(`/api/delete/submission/${submissionId}`);

export const clientGetTaskSubmissions = (taskId) =>
  API.get(`/api/view_task_submissions/${taskId}`);

export const reviewSubmission = (submissionId, data) =>
  API.put(`/api/review_task_submission/${submissionId}`, data);

export const getSignedUrl = (data) =>
  API.post("/api/submissions/upload-url", data);

export const getPreviewUrl = (fileKey, submission) =>
  API.get(
    `/api/get_preview_url?fileKey=${encodeURIComponent(
      fileKey
    )}&selectedSubmission=${encodeURIComponent(submission)}`
  );

export const raiseDispute = (reportForm) =>
  API.post("/api/create_dispute", reportForm);
