import API from "./apiClient";

// Auth
export const signUp = (data) => API.post("/api/user/signup", data);
export const loginUser = (data) => API.post("/api/user/login", data);
export const logoutUser = () => API.post("/api/user/logout");

export const sendOtp = (data)=>API.post("/api/send-otp",data)
export const verifyOtp = (data)=>API.post("/api/verify-reset-otp",data)

export const requestPasswordReset = (email) =>
  API.post("/api/user/request-password-reset", { email });

export const resetPassword = (password) =>
  API.post("/api/user/reset-password", { password });

export const fetchUser = () => API.get("/api/user/view_profile");

export const completeProfile = (data) =>
  API.put("/api/user/onboarding", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const uploadProfileImage = (data) => API.post("/api/user/upload-profile-image",data);

export const addPortfolio = (data) => API.post("/api/user/upload_portfolio", data);

export const modifyProfile = (formData) => 
    API.put("/api/user/edit_profile", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });


export const updateAvailability = (data)=>API.patch("/api/h1/v2/update_availability",data)
export const addPaymentMethod = (data)=>API.post("/api/h1/v2/add_payment_method",data)
export const updatePaymentMethod = (methodId,data)=>API.put(`/api/h1/v2/update_payment_method/${methodId}`,data)
export const removePaymentMethod = (methodId)=>API.delete(`/api/h1/v2/delete_payment_method/${methodId}`)

