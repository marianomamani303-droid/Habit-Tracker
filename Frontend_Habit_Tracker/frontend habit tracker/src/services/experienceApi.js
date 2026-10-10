import { apiRequest } from "./authApi";

export const avatarUrl = () =>
  `${(import.meta.env.VITE_API_URL ?? "http://localhost:3000/api").replace(/\/$/, "")}/perfil/avatar`;
export const experienceApi = {
  profile: () => apiRequest("/perfil"),
  updateProfile: (body) => apiRequest("/perfil", { method: "PUT", body }),
  avatar: (body) => apiRequest("/perfil/avatar", { method: "PUT", body }),
  password: (body) => apiRequest("/perfil/password", { method: "POST", body }),
  achievements: () => apiRequest("/logros"),
  acknowledge: () => apiRequest("/logros/vistos", { method: "POST", body: {} }),
  notifications: () => apiRequest("/notificaciones"),
  read: (id) =>
    apiRequest(id ? `/notificaciones/${id}` : "/notificaciones/leidas", {
      method: "PATCH",
      body: {},
    }),
};
