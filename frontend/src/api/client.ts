import axios from "axios";

// In development the Vite proxy rewrites /api → http://localhost:8000/api,
// so an empty VITE_API_URL (or no .env.local at all) just works.
// In production (Vercel) set VITE_API_URL=https://your-backend.railway.app
// in the Vercel dashboard → Settings → Environment Variables.
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the DRF auth token from localStorage on every request.
// The interceptor runs lazily, so a token set after client creation is picked up.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers["Authorization"] = `Token ${token}`;
  }
  return config;
});

// On 401 responses, clear the stored token so the user is sent back to login.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      // Let the ProtectedRoute / AuthContext handle the redirect.
    }
    return Promise.reject(error);
  }
);

export default apiClient;
