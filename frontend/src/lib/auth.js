export const AUTH_KEY = "spms-auth";

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

async function readResponse(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function getErrorMessage(data) {
  const detail =
    data?.detail ||
    data?.message ||
    Object.values(data || {})
      .flat()
      .join(" ");
  return detail || "Something went wrong.";
}

export async function apiRequest(path, options = {}) {
  const { token, body, method = "GET", headers = {} } = options;
  const endpoint = path.startsWith("/api/") ? path : `/api/auth/${path}`;
  const auth = getStoredAuth();
  let accessToken = token ?? auth?.access;

  let response = await fetch(endpoint, {
    method,
    body,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });
  let data = await readResponse(response);

  if (response.status === 401 && !token && auth?.refresh) {
    const refreshResponse = await fetch("/api/auth/token/refresh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: auth.refresh }),
    });
    const refreshed = await readResponse(refreshResponse);

    if (!refreshResponse.ok || !refreshed?.access) {
      clearAuth();
      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/register"
      ) {
        window.location.assign("/login");
      }
      throw new Error("Your session expired. Please sign in again.");
    }

    const updatedAuth = {
      ...auth,
      access: refreshed.access,
      refresh: refreshed.refresh ?? auth.refresh,
    };
    saveAuth(updatedAuth);
    window.dispatchEvent(new Event("spms-auth-updated"));
    accessToken = updatedAuth.access;

    response = await fetch(endpoint, {
      method,
      body,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...headers,
      },
    });
    data = await readResponse(response);
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(data));
  }

  return data;
}
