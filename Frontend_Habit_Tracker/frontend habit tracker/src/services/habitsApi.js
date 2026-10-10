import { apiRequest } from "./authApi";
const request = (path = "", method = "GET", body) =>
  apiRequest("/habitos" + path, { method, body });
export const habitsApi = {
  list: (estado) => request("?estado=" + estado),
  detail: (id) => request("/" + id),
  create: (data) => request("", "POST", data),
  update: (id, data) => request("/" + id, "PUT", data),
  archive: (id, archivado) =>
    request("/" + id + "/estado", "PATCH", { archivado }),
  progress: (id, fecha, cantidad) =>
    request(`/${id}/registros/${fecha}`, "PUT", { cantidad }),
  summary: () => request("/resumen"),
  statistics: (query = "") =>
    request("/estadisticas" + (query ? "?" + query : "")),
  history: (mes) => request("/historial?mes=" + mes),
  addSubtask: (id, nombre) => request(`/${id}/subtareas`, "POST", { nombre }),
  editSubtask: (id, taskId, nombre) =>
    request(`/${id}/subtareas/${taskId}`, "PUT", { nombre }),
  removeSubtask: (id, taskId) =>
    request(`/${id}/subtareas/${taskId}`, "DELETE", {}),
  subtaskProgress: (id, taskId, fecha, completado) =>
    request(`/${id}/subtareas/${taskId}/registros/${fecha}`, "PUT", {
      completado,
    }),
  reminder: (id) => request(`/${id}/recordatorio`),
  saveReminder: (id, body) => request(`/${id}/recordatorio`, "PUT", body),
};
export async function getDashboardHabits() {
  const data = await habitsApi.summary();
  const s = data.estadisticas;
  return {
    ...data,
    estadisticas: {
      ...s,
      totales: s.total,
      completadosHoy: s.completados,
      pendientesHoy: s.pendientes,
      cumplimiento: s.porcentaje,
    },
  };
}
