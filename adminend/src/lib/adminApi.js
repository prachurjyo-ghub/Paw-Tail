export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

let refreshPromise = null;

async function requestAdminTokenRefresh() {
  if (!refreshPromise) {
    refreshPromise = fetchAdminJson("/users/refresh-token", {
      method: "POST",
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function fetchAdminJson(path, options = {}) {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 10000);

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
      signal: options.signal || controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Check that the backend is running.");
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }

  const data = await response.json().catch(() => ({}));

  return { response, data };
}

export async function adminApi(path, options = {}) {
  let { response, data } = await fetchAdminJson(path, options);

  if (
    response.status === 401 &&
    path !== "/users/admin-login" &&
    path !== "/users/logout" &&
    path !== "/users/refresh-token"
  ) {
    const refreshed = await requestAdminTokenRefresh();

    if (refreshed?.response?.ok) {
      ({ response, data } = await fetchAdminJson(path, options));
    }
  }

  if (!response.ok) {
    const error = new Error(data.message || "Request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function getCurrentAdmin() {
  return adminApi("/users/me");
}

export function loginAdmin({ email, password }) {
  return adminApi("/users/admin-login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logoutAdmin() {
  return adminApi("/users/logout", {
    method: "POST",
  });
}
