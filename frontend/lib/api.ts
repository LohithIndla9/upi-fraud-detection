/**
 * UPI Sentinel API Configuration
 *
 * Resolves the backend base URL with priority:
 * 1. NEXT_PUBLIC_API_URL environment variable (if set)
 * 2. Production fallback: https://upi-sentinel-api.onrender.com
 * 3. Development fallback: http://127.0.0.1:8000
 */

export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://upi-sentinel-api.onrender.com"
    : "http://127.0.0.1:8000")
