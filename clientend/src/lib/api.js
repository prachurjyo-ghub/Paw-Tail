import { API_BASE_URL } from "@/lib/apiBaseUrl";

export { API_BASE_URL };

let refreshPromise = null;

async function requestTokenRefresh() {
  if (!refreshPromise) {
    refreshPromise = fetchJson("/users/refresh-token", {
      method: "POST",
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function fetchJson(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: method === "GET" ? "no-store" : undefined,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  return { response, data };
}

export async function apiRequest(path, options = {}) {
  let { response, data } = await fetchJson(path, options);

  if (
    response.status === 401 &&
    path !== "/users/login" &&
    path !== "/users/signup" &&
    path !== "/users/logout" &&
    path !== "/users/refresh-token"
  ) {
    const refreshed = await requestTokenRefresh();

    if (refreshed?.response?.ok) {
      ({ response, data } = await fetchJson(path, options));
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
