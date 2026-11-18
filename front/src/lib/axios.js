import axios from 'axios';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

export const TOKEN_STORAGE_KEY = 'clac_access_token';

const axiosInstance = axios.create({ baseURL: CONFIG.serverUrl, withCredentials: true });

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Normalises API errors to `{ status, code, message, details }`.
 * A 401 on a protected call clears the session and goes back to sign-in.
 */
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const apiError = error.response?.data?.error;
    const isAuthCall = error.config?.url?.includes('/api/auth/');
    if (status === 401 && !isAuthCall && localStorage.getItem(TOKEN_STORAGE_KEY)) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.location.href = '/auth/jwt/sign-in';
    }
    return Promise.reject({
      status,
      code: apiError?.code ?? 'NETWORK_ERROR',
      message:
        apiError?.details?.[0]?.message && apiError.code === 'VALIDATION_ERROR'
          ? `${apiError.details[0].field} : ${apiError.details[0].message}`
          : (apiError?.message ?? 'Serveur injoignable. Vérifiez que l’API tourne sur ' + CONFIG.serverUrl),
      details: apiError?.details,
    });
  }
);

export default axiosInstance;

// ----------------------------------------------------------------------

export const fetcher = async (args) => {
  const [url, config] = Array.isArray(args) ? args : [args];
  const res = await axiosInstance.get(url, { ...config });
  return res.data;
};

// ----------------------------------------------------------------------

export const endpoints = {
  auth: {
    me: '/api/auth/me',
    signIn: '/api/auth/login',
    signUp: '/api/auth/register',
    signOut: '/api/auth/logout',
    password: '/api/auth/password',
  },
  users: {
    me: '/api/users/me',
    sellers: '/api/users/sellers',
    buyers: '/api/users/buyers',
    details: (id) => `/api/users/${id}`,
  },
  categories: '/api/categories',
  markets: '/api/markets',
  products: {
    list: '/api/products',
    mine: '/api/products/mine',
    details: (id) => `/api/products/${id}`,
  },
  posts: { list: '/api/posts', mine: '/api/posts/mine', details: (id) => `/api/posts/${id}` },
  discounts: {
    list: '/api/discounts',
    mine: '/api/discounts/mine',
    details: (id) => `/api/discounts/${id}`,
  },
  requests: {
    list: '/api/requests',
    received: '/api/requests/received',
    details: (id) => `/api/requests/${id}`,
    responses: (id) => `/api/requests/${id}/responses`,
    response: (id, responseId) => `/api/requests/${id}/responses/${responseId}`,
  },
  offers: { list: '/api/offers', upcoming: '/api/offers/upcoming', mine: '/api/offers/mine', details: (id) => `/api/offers/${id}` },
  purchases: {
    list: '/api/purchases',
    details: (id) => `/api/purchases/${id}`,
    status: (id) => `/api/purchases/${id}/status`,
  },
  conversations: {
    list: '/api/conversations',
    unread: '/api/conversations/unread-count',
    details: (id) => `/api/conversations/${id}`,
    messages: (id) => `/api/conversations/${id}/messages`,
    read: (id) => `/api/conversations/${id}/read`,
  },
  notifications: {
    list: '/api/notifications',
    unread: '/api/notifications/unread-count',
    readAll: '/api/notifications/read-all',
    read: (id) => `/api/notifications/${id}/read`,
    details: (id) => `/api/notifications/${id}`,
  },
  reports: { overview: '/api/reports/overview', timeline: '/api/reports/timeline' },
  map: { markers: '/api/map', nearby: '/api/map/nearby' },
  search: { quick: '/api/search', smart: '/api/search/smart' },
  collectionPoints: '/api/collection-points',
  storage: (pointId) => `/api/collection-points/${pointId}/storage`,
  admin: {
    stats: '/api/admin/stats',
    users: '/api/admin/users',
    user: (id) => `/api/admin/users/${id}`,
    pendingPoints: '/api/admin/collection-points/pending',
    verifyPoint: (id) => `/api/admin/collection-points/${id}/verify`,
  },
  exchanges: {
    list: '/api/exchanges',
    mine: '/api/exchanges/mine',
    details: (id) => `/api/exchanges/${id}`,
    responses: (id) => `/api/exchanges/${id}/responses`,
    response: (id, rid) => `/api/exchanges/${id}/responses/${rid}`,
  },
  uploads: { images: '/api/uploads/images', remove: (name) => `/api/uploads/${name}` },
  print: (resource, id) => `/api/print/${resource}/${id}`,
};
