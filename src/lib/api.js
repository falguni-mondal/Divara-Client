import axios from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

let isRefreshing = false;
let pendingQueue = [];

function flushQueue(error) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || "";

    // Never run silent refresh on login, OTP, TOTP, or refresh endpoints themselves
    const skipRefresh =
      url.includes("/auth/refresh") ||
      url.includes("/auth/continue") ||
      url.includes("/auth/identify") ||
      url.includes("/auth/verify-otp") ||
      url.includes("/auth/verify-totp") ||
      url.includes("/auth/super-admin-email-otp");

    if (status === 401 && !original?._retry && !skipRefresh) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then(() => api(original));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        await api.post("/auth/refresh");
        flushQueue(null);
        return api(original);
      } catch (refreshError) {
        flushQueue(refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export function getApiErrorMessage(err, fallback = "Something went wrong. Please try again.") {
  return err?.response?.data?.error?.message || err?.message || fallback;
}