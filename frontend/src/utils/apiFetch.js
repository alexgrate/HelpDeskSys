const getApiBaseUrl = () => {
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (isLocal) {
    return "http://127.0.0.1:8000/api";
  }
  return "welcoming-manifestation-production-0608.up.railway.app/api"; 
};

const API_BASE_URL = getApiBaseUrl();


let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(newAccessToken) {
  refreshSubscribers.forEach((callback) => callback(newAccessToken));
  refreshSubscribers = [];
}

/**
 * Custom fetch client that handles automatic base URLs, token injection,
 * silent 401 interception, queued retries, and expired session logging out.
 */
export async function apiFetch(endpoint, options = {}) {
  // 1. Resolve full URL
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  // 2. Resolve default headers
  const headers = { ...(options.headers || {}) };

  // 3. Auto-inject access token if saved
  const accessToken = localStorage.getItem("access_token");
  if (accessToken && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  // 4. Auto-detect JSON payload unless form-data
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, fetchOptions);

    // 5. Intercept 401 Unauthorized errors
    if (response.status === 401) {
      // Loop protection: If the unauthorized request was the refresh endpoint, force logout
      if (url.includes("/auth/token/refresh/")) {
        handleLogoutRedirect();
        return response;
      }

      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        handleLogoutRedirect();
        return response;
      }

      // If a refresh is not already in progress, trigger it
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            localStorage.setItem("access_token", data.access);
            isRefreshing = false;
            onTokenRefreshed(data.access);
          } else {
            isRefreshing = false;
            handleLogoutRedirect();
            return response;
          }
        } catch (refreshErr) {
          isRefreshing = false;
          handleLogoutRedirect();
          return response;
        }
      }

      // Queue concurrent parallel requests while token is refreshing
      return new Promise((resolve) => {
        subscribeTokenRefresh((newAccessToken) => {
          fetchOptions.headers["Authorization"] = `Bearer ${newAccessToken}`;
          resolve(fetch(url, fetchOptions));
        });
      });
    }

    return response;
  } catch (error) {
    throw error;
  }
}

function handleLogoutRedirect() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}