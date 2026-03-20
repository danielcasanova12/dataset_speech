import { useEffect, useState, useRef } from 'react';

interface UseAutoLogoutProps {
  loginTime: string | null;
  isSessionActive: boolean;
  logout: () => void;
  warningMinutes?: number;
}

export const useAutoLogout = ({
  loginTime,
  isSessionActive,
  logout,
  warningMinutes = 5,
}: UseAutoLogoutProps) => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const hasLoggedOutRef = useRef(false);

  // Reset the ref when a new login time is set
  useEffect(() => {
    if (loginTime) {
      hasLoggedOutRef.current = false;
    }
  }, [loginTime]);

  useEffect(() => {
    if (!loginTime) {
      setShowWarning(false);
      setTimeRemaining(null);
      return;
    }

    const loginTimeMs = new Date(loginTime).getTime();

    const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
    const TEN_HOURS_MS = 10 * 60 * 60 * 1000;
    const WARNING_TIME_MS = warningMinutes * 60 * 1000;

    const checkLogout = () => {
      const now = Date.now();
      const elapsed = now - loginTimeMs;

      // Forçar logout 10h
      if (elapsed >= TEN_HOURS_MS) {
        if (!hasLoggedOutRef.current) {
          hasLoggedOutRef.current = true;
          logout();
        }
        return;
      }

      // Regra 8h
      if (elapsed >= EIGHT_HOURS_MS && !isSessionActive) {
        if (!hasLoggedOutRef.current) {
          hasLoggedOutRef.current = true;
          logout();
        }
        return;
      }

      // Warning inteligente
      const limit = isSessionActive ? TEN_HOURS_MS : EIGHT_HOURS_MS;
      const remaining = limit - elapsed;

      if (remaining <= WARNING_TIME_MS && remaining > 0) {
        setShowWarning(true);
        setTimeRemaining(remaining);
      } else {
        setShowWarning(false);
        setTimeRemaining(null);
      }
    };

    checkLogout();

    const interval = setInterval(checkLogout, 10000); // mais responsivo (10s)

    return () => clearInterval(interval);
  }, [loginTime, isSessionActive, logout, warningMinutes]);

  return { showWarning, timeRemaining };
};
