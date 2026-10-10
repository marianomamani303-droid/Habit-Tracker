const apiUrl = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(
      "No se pudo conectar con el servidor. Inténtalo nuevamente.",
      0,
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      data.mensaje ?? "No se pudo completar la solicitud.",
      response.status,
    );
  }
  return data;
}

const request = (path, options) => apiRequest("/auth" + path, options);

export const authApi = {
  register: (datos) => request("/register", { method: "POST", body: datos }),
  login: (datos) => request("/login", { method: "POST", body: datos }),
  me: () => request("/me"),
  logout: () => request("/logout", { method: "POST", body: {} }),
  recover: (email) =>
    request("/recuperar", { method: "POST", body: { email } }),
  reset: (body) => request("/restablecer", { method: "POST", body }),
};
