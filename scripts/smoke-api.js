require("dotenv").config();

const mysql = require("mysql2/promise");
const apiBase = (
  process.env.API_BASE_URL || "http://localhost:3000/api"
).replace(/\/$/, "");
const runId = Date.now();
const testEmail = `nexus-smoke-${runId}@example.invalid`;
const testPassword = `Nexus-${runId}-test`;
const productIds = [];
let testUserId;
let secondaryUserId;
let database;

async function request(path, { token, method = "GET", body } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(`${method} ${path}: ${payload.error || response.status}`);
  return payload;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function cleanup() {
  if (!database || !testUserId) return;
  await database.beginTransaction();
  try {
    const [soldLines] = await database.query(
      "SELECT d.producto_id, SUM(d.cantidad) AS cantidad FROM detalle_compra d JOIN compras c ON c.id = d.compra_id WHERE c.usuario_id = ? GROUP BY d.producto_id",
      [testUserId],
    );
    for (const line of soldLines) {
      await database.query(
        "UPDATE productos SET stock = stock + ? WHERE id = ?",
        [line.cantidad, line.producto_id],
      );
    }
    await database.query("DELETE FROM compras WHERE usuario_id = ?", [
      testUserId,
    ]);
    await database.query("DELETE FROM actividad WHERE usuario_id = ?", [
      testUserId,
    ]);
    if (secondaryUserId)
      await database.query("DELETE FROM usuarios WHERE id = ?", [
        secondaryUserId,
      ]);
    if (productIds.length) {
      await database.query(
        `DELETE FROM productos WHERE id IN (${productIds.map(() => "?").join(",")})`,
        productIds,
      );
    }
    await database.query("DELETE FROM usuarios WHERE id = ?", [testUserId]);
    await database.commit();
  } catch (error) {
    await database.rollback();
    throw error;
  }
}

async function run() {
  database = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "tienda_electronica",
  });

  const invalidLogin = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `missing-${runId}@example.invalid`,
      password: "wrong-password",
    }),
  });
  assert(invalidLogin.status === 401, "El login inválido debe responder 401");

  const registration = await request("/auth/register", {
    method: "POST",
    body: {
      nombre: "NEXUS API Smoke",
      email: testEmail,
      password: testPassword,
    },
  });
  assert(
    registration.token && registration.usuario?.id,
    "Registro debe devolver JWT y perfil",
  );
  testUserId = registration.usuario.id;
  const clientToken = registration.token;

  const profile = await request("/auth/me", { token: clientToken });
  assert(profile.email === testEmail, "El perfil debe venir de MySQL");
  const catalog = await request("/productos");
  assert(
    Array.isArray(catalog) && catalog.length > 0,
    "El catálogo debe devolver productos",
  );

  const productPayload = {
    nombre: `HTTP Smoke ${runId}`,
    categoria: "Integración",
    precio: 1.25,
    stock: 5,
    marca: "NEXUS TEST",
    descripcion: "Registro temporal de prueba HTTP",
    imagen: "photo-1591488320449-011701bb6704",
    etiqueta: "TEST",
    precioAnterior: null,
    rating: 5,
    opiniones: 0,
    color: "cyan",
    especificaciones: ["API", "MySQL"],
  };
  await database.query("UPDATE usuarios SET rol = 'admin' WHERE id = ?", [
    testUserId,
  ]);
  const firstAdminLogin = await request("/auth/login", {
    method: "POST",
    body: { email: testEmail, password: testPassword },
  });
  const adminToken = firstAdminLogin.token;
  const createdProduct = await request("/productos", {
    method: "POST",
    token: adminToken,
    body: productPayload,
  });
  const productId = createdProduct.idGenerado;
  assert(productId, "El CRUD debe devolver ID del producto");
  productIds.push(productId);
  await request(`/productos/${productId}`, {
    method: "PUT",
    token: adminToken,
    body: {
      ...productPayload,
      nombre: `${productPayload.nombre} editado`,
      stock: 6,
    },
  });
  const catalogAfterEdit = await request("/productos");
  assert(
    catalogAfterEdit.some((item) => item.id === productId && item.stock === 6),
    "La edición/stock debe reflejarse en catálogo",
  );

  const disposableProduct = await request("/productos", {
    method: "POST",
    token: adminToken,
    body: { ...productPayload, nombre: `HTTP Delete ${runId}` },
  });
  productIds.push(disposableProduct.idGenerado);
  await request(`/productos/${disposableProduct.idGenerado}`, {
    method: "DELETE",
    token: adminToken,
  });
  productIds.splice(productIds.indexOf(disposableProduct.idGenerado), 1);

  await database.query("UPDATE usuarios SET rol = 'cliente' WHERE id = ?", [
    testUserId,
  ]);
  const clientLogin = await request("/auth/login", {
    method: "POST",
    body: { email: testEmail, password: testPassword },
  });
  const purchase = await request("/compras", {
    method: "POST",
    token: clientLogin.token,
    body: {
      direccion: "Av. Integración 123, Lima",
      metodoPago: "Contra entrega",
      carrito: [{ productoId: productId, cantidad: 1 }],
    },
  });
  const orders = await request("/compras/mias", { token: clientLogin.token });
  assert(
    orders.some(
      (order) =>
        order.id === String(purchase.compraId) && order.status === "Procesando",
    ),
    "El ticket debe persistir con estado",
  );
  assert(
    orders.find((order) => order.id === String(purchase.compraId)).items
      .length === 1,
    "El ticket debe traer sus productos",
  );

  await database.query("UPDATE usuarios SET rol = 'admin' WHERE id = ?", [
    testUserId,
  ]);
  const adminLogin = await request("/auth/login", {
    method: "POST",
    body: { email: testEmail, password: testPassword },
  });
  const createdUser = await request("/usuarios", {
    method: "POST",
    token: adminLogin.token,
    body: {
      nombre: `Usuario Smoke ${runId}`,
      email: `secondary-${runId}@example.invalid`,
      password: testPassword,
      rol: "cliente",
    },
  });
  secondaryUserId = createdUser.id;
  await request(`/usuarios/${secondaryUserId}`, {
    method: "PUT",
    token: adminLogin.token,
    body: {
      nombre: `Usuario Smoke editado ${runId}`,
      email: `secondary-${runId}@example.invalid`,
      rol: "cliente",
    },
  });
  const users = await request("/usuarios", { token: adminLogin.token });
  assert(
    users.some((item) => item.id === secondaryUserId),
    "El usuario admin debe poder leer usuarios",
  );
  await request(`/compras/${purchase.compraId}/estado`, {
    method: "PATCH",
    token: adminLogin.token,
    body: { estado: "Enviado" },
  });
  const adminOrders = await request("/compras", { token: adminLogin.token });
  assert(
    adminOrders.some(
      (order) =>
        order.id === String(purchase.compraId) && order.status === "Enviado",
    ),
    "El admin debe poder cambiar el estado del ticket",
  );
  await request("/actividad", {
    method: "POST",
    token: adminLogin.token,
    body: { accion: "prueba HTTP", detalle: `pedido ${purchase.compraId}` },
  });
  const activity = await request("/actividad", { token: adminLogin.token });
  assert(
    activity.some((item) => item.action === "prueba HTTP"),
    "La actividad admin debe persistir",
  );
  await request(`/usuarios/${secondaryUserId}`, {
    method: "DELETE",
    token: adminLogin.token,
  });
  secondaryUserId = null;

  await database.query("UPDATE usuarios SET rol = 'cliente' WHERE id = ?", [
    testUserId,
  ]);
  const freshClientLogin = await request("/auth/login", {
    method: "POST",
    body: { email: testEmail, password: testPassword },
  });
  const clientTicket = await request("/compras/mias", {
    token: freshClientLogin.token,
  });
  assert(
    clientTicket.some(
      (order) =>
        order.id === String(purchase.compraId) && order.status === "Enviado",
    ),
    "El cliente debe ver el estado actualizado en su historial",
  );

  console.log(
    "HTTP smoke OK: auth, perfil, catálogo, CRUD admin, stock, compra, ticket, estados y actividad.",
  );
}

run()
  .catch((error) => {
    console.error(`HTTP smoke falló: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (error) {
      console.error(`Limpieza smoke incompleta: ${error.message}`);
      process.exitCode = 1;
    }
    if (database) await database.end();
  });
