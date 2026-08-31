import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "click"];
const STORAGE_KEY = "lastActivity";
const LOCK_KEY = "sessionExpiring";

export function useIdleSession() {
  const { logout, isAuthenticated } = useAuth();
  
  // Use env variable or default to 30 minutes
  const timeoutMinutes = parseInt(process.env.NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES || "30", 10);
  const timeoutMs = timeoutMinutes * 60 * 1000;
  
  // Throttle updates to local storage (e.g., once every 30 seconds)
  const throttleMs = 30000;
  const lastUpdateRef = useRef<number>(0);

  // Update activity timestamp in local storage
  const updateActivity = () => {
    if (!isAuthenticated) return;
    const now = Date.now();
    if (now - lastUpdateRef.current > throttleMs) {
      localStorage.setItem(STORAGE_KEY, now.toString());
      lastUpdateRef.current = now;
    }
  };

  // Perform expiration check
  const checkExpiration = () => {
    if (!isAuthenticated) return;
    
    // Prevent duplicate handling across tabs or repeated triggers
    if (sessionStorage.getItem(LOCK_KEY)) return;

    const lastActivityStr = localStorage.getItem(STORAGE_KEY);
    if (!lastActivityStr) {
      // First time loading authenticated session
      updateActivity();
      return;
    }

    const lastActivity = parseInt(lastActivityStr, 10);
    const now = Date.now();
    
    if (now - lastActivity >= timeoutMs) {
      // Session expired
      sessionStorage.setItem(LOCK_KEY, "true");
      alert("Your session has expired due to inactivity. You will be logged out automatically.");
      localStorage.removeItem(STORAGE_KEY);
      logout();
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    // Clear any leftover lock on mount
    sessionStorage.removeItem(LOCK_KEY);
    
    // Initial activity update
    updateActivity();

    const handleActivity = () => {
      updateActivity();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkExpiration();
      }
    };

    const handleFocus = () => {
      checkExpiration();
    };

    // Attach interaction listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Attach window focus/visibility listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    // Periodic interval to check expiration
    const intervalId = setInterval(checkExpiration, 15000); // Check every 15 seconds

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      clearInterval(intervalId);
    };
  }, [isAuthenticated, logout, timeoutMs]);

}
