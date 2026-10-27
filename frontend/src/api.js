const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");

export async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  const authToken = token || localStorage.getItem("nexus-token");
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error(
      `No se pudo conectar con la API (${API_BASE}). Comprueba que Express esté iniciado.`,
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;
  if (!response.ok) {
    const error = new Error(
      payload?.error || `La API respondió ${response.status}`,
    );
    error.status = response.status;
    throw error;
  }
  return payload;
}

const jsonBody = (value) => JSON.stringify(value);

export const api = {
  login: (email, password) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: jsonBody({ email, password }),
    }),
  register: (nombre, email, password) =>
    apiRequest("/auth/register", {
      method: "POST",
      body: jsonBody({ nombre, email, password }),
    }),
  me: () => apiRequest("/auth/me"),
  updateMe: (profile) =>
    apiRequest("/auth/me", {
      method: "PUT",
      body: jsonBody({ nombre: profile.name, email: profile.email }),
    }),
  products: () => apiRequest("/productos"),
  createProduct: (product) =>
    apiRequest("/productos", { method: "POST", body: jsonBody(product) }),
  updateProduct: (id, product) =>
    apiRequest(`/productos/${id}`, { method: "PUT", body: jsonBody(product) }),
  deleteProduct: (id) => apiRequest(`/productos/${id}`, { method: "DELETE" }),
  users: () => apiRequest("/usuarios"),
  createUser: (user) =>
    apiRequest("/usuarios", { method: "POST", body: jsonBody(user) }),
  updateUser: (id, user) =>
    apiRequest(`/usuarios/${id}`, { method: "PUT", body: jsonBody(user) }),
  deleteUser: (id) => apiRequest(`/usuarios/${id}`, { method: "DELETE" }),
  myOrders: () => apiRequest("/compras/mias"),
  allOrders: () => apiRequest("/compras"),
  createOrder: (order) =>
    apiRequest("/compras", { method: "POST", body: jsonBody(order) }),
  updateOrderStatus: (id, estado) =>
    apiRequest(`/compras/${id}/estado`, {
      method: "PATCH",
      body: jsonBody({ estado }),
    }),
  activities: () => apiRequest("/actividad"),
  createActivity: (action, detail) =>
    apiRequest("/actividad", {
      method: "POST",
      body: jsonBody({ accion: action, detalle: detail }),
    }),
};
