import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { habitsApi } from "../services/habitsApi";
export function useHabitsResource(type, arg) {
  const { usuario, checkSession } = useAuth();
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [revision, setRevision] = useState(0);
  const resourceId = `${type}:${arg ?? ""}:${usuario.id}`;
  useEffect(() => {
    let active = true;
    habitsApi[type](arg)
      .then((data) => {
        if (active) setState({ loading: false, data, error: "", resourceId });
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) checkSession();
        setState({
          loading: false,
          data: null,
          error: error.message,
          resourceId,
        });
      });
    return () => {
      active = false;
    };
  }, [type, arg, revision, usuario.id, checkSession, resourceId]);
  const currentState =
    state.resourceId === resourceId
      ? state
      : { loading: true, data: null, error: "" };
  return { ...currentState, reload: () => setRevision((value) => value + 1) };
}
