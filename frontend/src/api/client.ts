import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api",
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
