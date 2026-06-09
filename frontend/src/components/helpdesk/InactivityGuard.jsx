import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

export function InactivityGuard({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const timeoutRef = useRef(null);

  const handleAutoLogout = () => {
    // 1. Clear session credentials
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    
    // 2. Safely redirect to login screen
    if (location.pathname !== "/login") {
      navigate("/login");
    }
  };

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Set countdown for auto logout
    timeoutRef.current = setTimeout(handleAutoLogout, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    
    // Only monitor inactivity if a session is actively logged in
    if (!token) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    // Capture standard user interactions
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

    // Initialize timer
    resetTimer();

    // Bind event listeners globally
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup listeners and timers on unmount or route transition
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [location.pathname]);

  return children;
}