import axios from 'axios';
import { toast } from 'sonner';
import { featureFlags } from '../featureFlags.js';

const authStorageKey = 'mentorhub.auth';

const axiosInstance = axios.create();

axiosInstance.interceptors.request.use((config) => {
  if (!featureFlags.enableRbacGuards) {
    return config;
  }

  const raw = localStorage.getItem(authStorageKey);
  if (!raw) {
    return config;
  }

  try {
    const auth = JSON.parse(raw);
    if (auth?.token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${auth.token}`,
      };
    }
  } catch {
    // ignore invalid stored auth
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!featureFlags.enableRbacGuards) {
      return Promise.reject(error);
    }

    const status = error?.response?.status;
    if (status === 401) {
      localStorage.removeItem(authStorageKey);
      window.location.href = '/auth?mode=login';
      return Promise.reject(error);
    }

    if (status === 403) {
      toast.error("You don't have permission to do this");
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
