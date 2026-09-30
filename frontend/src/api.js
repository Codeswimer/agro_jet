/**
 * AGRO JET API client — talks to the Django REST backend.
 *
 * Base URL comes from VITE_API_URL (set in frontend/.env or Vercel env vars),
 * falling back to the local Django dev server.
 */
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

const ACCESS_KEY = 'agrojet_access';
const REFRESH_KEY = 'agrojet_refresh';
const USER_KEY = 'agrojet_user_profile';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

function setSession(data) {
  // /api/auth/login/ returns { access, refresh, user }; /refresh returns { access }.
  if (data.access) localStorage.setItem(ACCESS_KEY, data.access);
  if (data.refresh) localStorage.setItem(REFRESH_KEY, data.refresh);
  if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearSession() {
  [ACCESS_KEY, REFRESH_KEY, USER_KEY].forEach((k) => localStorage.removeItem(k));
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return false;
  const res = await fetch(`${API_BASE}/api/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  localStorage.setItem(ACCESS_KEY, data.access);
  return true;
}

async function request(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request(path, { method, body, auth, retry: false });
    }
    clearSession();
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }

  if (!res.ok) {
    const detail =
      data?.detail ||
      (typeof data === 'object' && data
        ? Object.values(data).flat().join(' ')
        : null) ||
      `Request failed (${res.status})`;
    throw new ApiError(detail, res.status, data);
  }
  return data;
}

const unwrap = (page) => page.results ?? page;

export const api = {
  // ---- Auth ----
  async register(payload) {
    const user = await request('/api/auth/register/', { method: 'POST', body: payload, auth: false });
    return user;
  },
  async login(email, password) {
    const data = await request('/api/auth/login/', {
      method: 'POST', body: { email, password }, auth: false,
    });
    setSession(data);
    return data.user;
  },
  logout: clearSession,
  me: () => request('/api/auth/me/'),
  async bvnVerify(bvn) {
    return request('/api/kyc/bvn-verify/', { method: 'POST', body: { bvn } });
  },

  // ---- Catalog ----
  buyers: (params) => request(`/api/marketplace/buyers/${params ? `?${new URLSearchParams(params)}` : ''}`).then(unwrap),
  produce: () => request('/api/marketplace/produce/').then(unwrap),
  createProduce: (payload) => request('/api/marketplace/produce/new/', { method: 'POST', body: payload }),
  inputs: () => request('/api/marketplace/inputs/').then(unwrap),
  pools: () => request('/api/marketplace/pools/').then(unwrap),

  // ---- Wallet / payments / escrow ----
  wallet: () => request('/api/wallet/'),
  initPayment: (payload) => request('/api/payments/initialize/', { method: 'POST', body: payload }),
  confirmPayment: (reference) => request('/api/payments/confirm/', { method: 'POST', body: { reference } }),
  payments: () => request('/api/payments/').then(unwrap),
  escrows: () => request('/api/escrows/').then(unwrap),
  releaseEscrow: (id) => request(`/api/escrows/${id}/release/`, { method: 'POST' }),

  // ---- Admin panel ----
  adminStats: () => request('/api/admin-panel/stats/'),
  adminUsers: (params) => request(`/api/admin-panel/users/${params ? `?${new URLSearchParams(params)}` : ''}`).then(unwrap),
  adminEscrows: () => request('/api/admin-panel/escrows/').then(unwrap),
};

export default api;
