import { useEffect, useState, useCallback } from "react";
import { experienceApi } from "../services/experienceApi";
import { useAuth } from "./useAuth";

export function useNotifications() {
  const { usuario, checkSession } = useAuth();
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const data = await experienceApi.notifications();
        if (active) setState({ loading: false, data, error: "" });
      } catch (error) {
        if (!active) return;
        if (error.status === 401) checkSession();
        setState({ loading: false, data: null, error: error.message });
      }
    }
    refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60000);
    const focus = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [usuario.id, usuario.zona_horaria, checkSession, revision]);
  return { ...state, reload };
}
