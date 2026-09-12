import { setSocketAuthToken } from "../services/socket";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER";
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user?: User;
    accessToken?: string;
  };
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:5000/api";

// In-memory access token storage (Refresh token stays securely in HttpOnly cookie)
let currentAccessToken: string | null = null;

export const setAccessToken = (
  token: string | null,
  reconnectSocket = false,
) => {
  currentAccessToken = token;
  setSocketAuthToken(token, reconnectSocket);
};

export const getAccessToken = () => currentAccessToken;

export const authApi = {
  /**
   * Register new user
   */
  async register(
    name: string,
    email: string,
    password: string,
    role: string = "DEVELOPER",
  ) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Includes HttpOnly cookies
      body: JSON.stringify({ name, email, password, role }),
    });

    const data: AuthResponse = await res.json();
    if (data.success && data.data?.accessToken) {
  setAccessToken(data.data.accessToken, true);
}
    return data;
  },

  /**
   * Login user
   */
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Includes HttpOnly cookies
      body: JSON.stringify({ email, password }),
    });

    const data: AuthResponse = await res.json();
    if (data.success && data.data?.accessToken) {
      setAccessToken(data.data.accessToken);
    }
    return data;
  },

  /**
   * Refresh access token using HttpOnly cookie
   */
  async refresh() {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    const data: AuthResponse = await res.json();
    if (data.success && data.data?.accessToken) {
      setAccessToken(data.data.accessToken);
    } else {
      setAccessToken(null);
    }
    return data;
  },

  /**
   * Logout user and clear HttpOnly cookie
   */
  async logout() {
    const res = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setAccessToken(null);
    return res.json();
  },

  /**
   * Get current authenticated user profile
   */
  async getMe() {
    return authFetch("/auth/me");
  },
};

/**
 * Fetch wrapper that attaches Bearer token and handles automatic token refresh
 */
export async function authFetch(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  if (currentAccessToken) {
    headers.set("Authorization", `Bearer ${currentAccessToken}`);
  }

  let res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // If unauthorized, attempt one-time refresh via HttpOnly cookie
  if (res.status === 401) {
    const refreshResult = await authApi.refresh();
    if (refreshResult.success && refreshResult.data?.accessToken) {
      headers.set("Authorization", `Bearer ${refreshResult.data.accessToken}`);
      res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: "include",
      });
    }
  }

  return res.json();
}
