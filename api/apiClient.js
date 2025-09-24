import axios from "axios";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";


const BackendURL = Constants.expoConfig.extra?.EXPO_PUBLIC_BACKEND_URL;
const API = axios.create({
  baseURL: BackendURL, 
  withCredentials: true,
  timeout: 10000,
});

API.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
export default API;
