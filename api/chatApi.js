import API from "./apiClient";

export const startOrGetChatRoom = (data) => API.post("/api/start/chat_room", data);
export const getAllChatRooms = () => API.get("/api/get/messages/rooms");

export const fetchRoomMessages = (roomId, cursor) =>
  API.get(
    `/api/get/chat_room_messages/${roomId}${cursor ? `?cursor=${cursor}` : ""}`
  );

export const createMessage = (data) => API.post("/api/send/message", data);

export const handleChatFiles = (data) =>
  API.post("/api/handle/chat_files", data);

export const fetchRoomInfo = (roomId) => API.get(`/api/get_room_info/${roomId}`);
