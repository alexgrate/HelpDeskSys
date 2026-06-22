import React, { useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "../../utils/apiFetch";

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; 

export function InactivityGuard({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const checkIntervalRef = useRef(null);

  const handleAutoLogout = useCallback(async () => {
    const token = localStorage.getItem("access_token");

    if (token) {
      apiFetch("/users/me/", {
        method: "PATCH",
        body: JSON.stringify({ is_on_duty: false }),
      }).catch((err) => {
        console.warn("Failed to set off-duty status during auto-logout:", err);
      });
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("last_activity");
    localStorage.removeItem("global_last_activity");
    
    if (location.pathname !== "/login") {
      navigate("/login");
    }
  }, [location.pathname, navigate]);

  const recordActivity = useCallback(() => {
    localStorage.setItem("global_last_activity", Date.now().toString());
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    recordActivity();

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, recordActivity);
    });

    checkIntervalRef.current = setInterval(() => {
      const lastActivity = localStorage.getItem("global_last_activity");
      if (lastActivity) {
        const elapsed = Date.now() - parseInt(lastActivity, 10);
        if (elapsed >= INACTIVITY_TIMEOUT) {
          handleAutoLogout();
        }
      }
    }, 5000);

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, recordActivity);
      });
    };
  }, [location.pathname, recordActivity, handleAutoLogout]);

  return children;
}