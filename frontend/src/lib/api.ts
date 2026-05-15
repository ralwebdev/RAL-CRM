import axios from "axios";
import { session } from "./session";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

export { TOKEN_STORAGE_KEY } from "./session";

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = session.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
