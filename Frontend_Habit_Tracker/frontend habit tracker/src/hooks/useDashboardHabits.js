import { useEffect, useState } from "react";
import { getDashboardHabits } from "../services/habitsApi";
import { useAuth } from "./useAuth";
import { habitToday } from "../utils/habitCalendar";

export function useDashboardHabits() {
  const { usuario, checkSession } = useAuth();
  const [state, setState] = useState({
    status: "loading",
    habitos: [],
    estadisticas: null,
    error: "",
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let previousDate = habitToday(usuario.zona_horaria);
    const interval = window.setInterval(() => {
      const currentDate = habitToday(usuario.zona_horaria);
      if (currentDate !== previousDate) {
        previousDate = currentDate;
        setAttempt((value) => value + 1);
      }
    }, 60000);
    return () => window.clearInterval(interval);
  }, [usuario.zona_horaria]);

  useEffect(() => {
    let active = true;
    getDashboardHabits()
      .then((data) => {
        if (active)
          setState({
            ...data,
            status: data.disponible ? "ready" : "unavailable",
            error: "",
          });
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) checkSession();
        setState({
          status: "error",
          habitos: [],
          estadisticas: null,
          error: error.message,
        });
      });
    return () => {
      active = false;
    };
  }, [usuario.id, usuario.zona_horaria, checkSession, attempt]);

  return {
    ...state,
    retry: () => {
      setState({
        status: "loading",
        habitos: [],
        estadisticas: null,
        error: "",
      });
      setAttempt((value) => value + 1);
    },
  };
}
