// src/services/api.js
import axios from "axios";

const API = axios.create({
  // baseURL: "https://sorad.richman.uz/api", // Backend URL ni o'zgaritring
  // Remote API (prod) - agar lokal backend yo'q bo'lsa shu url ishlatilsin
  baseURL: "https://roxat-b.vercel.app/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 soniya timeout
});

// Request interceptor - token qo'shish uchun
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - xatolarni boshqarish
API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
// jhsjhdf
export default API;
