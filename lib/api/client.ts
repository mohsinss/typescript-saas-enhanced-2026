import axios, { AxiosError } from "axios";
// @ts-ignore - react-hot-toast types
import toast from "react-hot-toast";
import { signIn } from "next-auth/react";
import config from "@/config";

/**
 * API client for frontend to backend communication
 * Includes automatic error handling and authentication redirects
 */
const apiClient = axios.create({
  baseURL: "/api/v1", // Updated to use versioned API
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding auth tokens or request IDs
apiClient.interceptors.request.use(
  (config) => {
    // Add request ID for tracing
    config.headers["X-Request-Id"] = crypto.randomUUID?.() || Math.random().toString(36);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error: AxiosError<any>) => {
    const { response } = error;
    
    if (response?.status === 401) {
      // User not authenticated, redirect to login
      toast.error("Please login to continue");
      // Automatically redirect to login page
      await signIn(undefined, { callbackUrl: config.auth.callbackUrl });
      return Promise.reject(error);
    }
    
    if (response?.status === 403) {
      // User not authorized (needs subscription/plan)
      toast.error("Please upgrade your plan to access this feature");
      return Promise.reject(error);
    }
    
    if (response?.status === 429) {
      // Rate limited
      toast.error("Too many requests. Please try again later.");
      return Promise.reject(error);
    }
    
    // Handle API error response format
    const errorMessage = response?.data?.error?.message || 
                        response?.data?.error || 
                        error.message || 
                        "An unexpected error occurred";
    
    // Display error to user
    toast.error(errorMessage);
    
    // Log error for debugging (in development only)
    if (process.env.NODE_ENV === "development") {
      console.error("API Error:", {
        url: error.config?.url,
        method: error.config?.method,
        status: response?.status,
        error: response?.data,
      });
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
