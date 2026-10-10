import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { authApi } from "../services/authApi";
import { AuthContext } from "./AuthContext";

const initialSession = {
  status: "loading",
  usuario: null,
  error: "",
  checkedPath: null,
  expiresAt: null,
};

export default function AuthProvider({ children }) {
  const { pathname } = useLocation();
  const [session, setSession] = useState(initialSession);
  const requestVersion = useRef(0);
  const signingOut = useRef(false);
  const invalidateRequests = useCallback(() => {
    requestVersion.current++;
  }, []);

  const checkSession = useCallback(async () => {
    if (signingOut.current) return;
    const version = ++requestVersion.current;
    setSession((previous) =>
      previous.status === "authenticated" && previous.checkedPath === pathname
        ? previous
        : { ...initialSession, checkedPath: pathname },
    );
    try {
      const { usuario, expiresInMs } = await authApi.me();
      if (version !== requestVersion.current) return;
      setSession({
        status: "authenticated",
        usuario,
        error: "",
        checkedPath: pathname,
        expiresAt: Date.now() + expiresInMs,
      });
    } catch (error) {
      if (version !== requestVersion.current) return;
      setSession({
        ...initialSession,
        status: error.status === 401 ? "anonymous" : "error",
        error: error.message,
        checkedPath: pathname,
      });
    }
  }, [pathname]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) checkSession();
    });
    return () => {
      active = false;
      invalidateRequests();
    };
  }, [checkSession, invalidateRequests]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") checkSession();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    // Comprueba revocaciones externas sin depender de la navegación.
    const interval = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        session.status === "authenticated"
      )
        checkSession();
    }, 60000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(interval);
    };
  }, [checkSession, session.status]);

  useEffect(() => {
    if (session.status !== "authenticated") return;
    const timeout = window.setTimeout(
      () => {
        requestVersion.current++;
        setSession({
          ...initialSession,
          status: "anonymous",
          checkedPath: pathname,
        });
      },
      Math.max(0, session.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timeout);
  }, [session.status, session.expiresAt, pathname]);

  async function logout() {
    // Invalida verificaciones en vuelo antes de comenzar el logout.
    signingOut.current = true;
    invalidateRequests();
    try {
      await authApi.logout();
      invalidateRequests();
      setSession({
        ...initialSession,
        status: "anonymous",
        checkedPath: pathname,
      });
    } finally {
      signingOut.current = false;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...session,
        checkSession,
        logout,
        updateUsuario: (usuario) =>
          setSession((previous) => ({ ...previous, usuario })),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
