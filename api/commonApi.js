import API from "./apiClient";

export const sendFileToS3 = async (uploadURL, file,onProgress) => {
  await fetch(uploadURL, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    },
    onUploadProgress: onProgress
  });
};

export const raiseDispute = (reportForm)=>API.post('/api/create_dispute',reportForm)
export const addReportingEvidence=(data)=>API.post('/api/create/reporting/evidence',data)
export const getSignedUrl =(data)=>API.post('/api/submissions/upload-url',data)
export const getPreviewUrl =(fileKey,selectedSubmission)=> API.get(`/api/get_preview_url?fileKey=${encodeURIComponent(fileKey)}&selectedSubmission=${encodeURIComponent(selectedSubmission)}`);
