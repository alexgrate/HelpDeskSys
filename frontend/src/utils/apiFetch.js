export const getApiBaseUrl = () => {
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (isLocal) {
    return "http://127.0.0.1:8000/api";
  }

  return import.meta.env.VITE_API_BASE_URL;
};

export const API_BASE_URL = getApiBaseUrl();

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(newAccessToken) {
  refreshSubscribers.forEach((callback) => callback(newAccessToken));
  refreshSubscribers = [];
}

export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers = { ...(options.headers || {}) };
  const accessToken = localStorage.getItem("access_token");

  if (accessToken && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, fetchOptions);

    if (response.status === 401) {
      if (url.includes("/auth/token/refresh/")) {
        handleLogoutRedirect();
        return response;
      }

      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        handleLogoutRedirect();
        return response;
      }

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

export function handleLogoutRedirect() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

export function getSlaMetrics(createdAt, priority, status, resolvedAt, ticketSlaHours = null) {
  const createdDate = new Date(createdAt);
  const isResolved = status === "Resolved" || status === "Closed";
  const endDate = isResolved && resolvedAt ? new Date(resolvedAt) : new Date();
  
  const elapsedMin = Math.floor((endDate - createdDate) / (1000 * 60));
  let totalMin = 240; 

  if (ticketSlaHours && ticketSlaHours[priority]) {
    totalMin = ticketSlaHours[priority] * 60;
  } else {
    if (priority === "Critical") totalMin = 60;
    else if (priority === "High") totalMin = 120;
    else if (priority === "Low") totalMin = 480;
  }
  
  const remainingMin = totalMin - elapsedMin;
  return { totalMin, remainingMin, elapsedMin };
}