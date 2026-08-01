import axios from 'axios';

// Same origin in production (Express serves both API and frontend)
// In development with separate servers, set VITE_API_URL=http://localhost:3001
const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight token refresh: when several requests hit 401 at once
// (dashboard fires 3-4 calls in parallel), only one refresh request is
// made — the rest await the same promise and retry with the new token.
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true })
      .then((response) => {
        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        return accessToken as string;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// The backend moved from MongoDB (`_id`) to Prisma (`id`), but the UI and
// types were written against `_id`. Rather than touch every component, we
// mirror `id` -> `_id` on every response object so both always work.
const addIdAlias = (value: any): any => {
  if (Array.isArray(value)) return value.map(addIdAlias);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    if (value.id !== undefined && value._id === undefined) {
      value._id = value.id;
    }
    for (const key of Object.keys(value)) {
      const child = value[key];
      if (child && typeof child === 'object') addIdAlias(child);
    }
  }
  return value;
};

api.interceptors.response.use(
  (response) => {
    if (response.data) addIdAlias(response.data);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
