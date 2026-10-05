export const AUTH_KEY = 'spms-auth';

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAuth(auth) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

export async function apiRequest(path, options = {}) {
  const { token, body, method = 'GET', headers = {} } = options;
  const auth = getStoredAuth();
  const accessToken = token ?? auth?.access;

  const response = await fetch(`/api/auth/${path}`, {
    method,
    body,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = data?.detail || data?.message || Object.values(data || {}).flat().join(' ');
    throw new Error(detail || 'Something went wrong.');
  }

  return data;
}
