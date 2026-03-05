import axios from "axios";
import { auth } from "./firebase";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap backend envelope { success, data, message } → return inner data directly
api.interceptors.response.use((response) => {
  if (
    response.data &&
    typeof response.data === "object" &&
    "success" in response.data &&
    "data" in response.data
  ) {
    return { ...response, data: response.data.data };
  }
  return response;
});

export default api;
