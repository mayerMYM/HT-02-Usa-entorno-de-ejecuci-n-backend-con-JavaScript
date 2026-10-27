const db = require("../config/db");

const orderSelect = `SELECT c.id, c.usuario_id, c.total, c.estado, c.direccion_envio,
    c.metodo_pago, c.creada_en, u.nombre AS cliente, u.email,
    d.producto_id, d.cantidad, d.precio_unitario,
    p.nombre AS producto_nombre, p.categoria, p.marca, p.stock, p.imagen
    FROM compras c
    JOIN usuarios u ON u.id = c.usuario_id
    LEFT JOIN detalle_compra d ON d.compra_id = c.id
    LEFT JOIN productos p ON p.id = d.producto_id`;

function groupOrders(rows) {
  const orders = new Map();
  for (const row of rows) {
    if (!orders.has(row.id)) {
      orders.set(row.id, {
        id: String(row.id),
        userId: String(row.usuario_id),
        customer: row.cliente,
        email: row.email,
        total: Number(row.total),
        status: row.estado,
        address: row.direccion_envio,
        payment: row.metodo_pago,
        createdAt: row.creada_en,
        items: [],
      });
    }
    if (row.producto_id) {
      orders.get(row.id).items.push({
        id: String(row.producto_id),
        name: row.producto_nombre,
        category: row.categoria,
        brand: row.marca,
        image: row.imagen,
        quantity: Number(row.cantidad),
        price: Number(row.precio_unitario),
      });
    }
  }
  return [...orders.values()];
}

async function getMine(req, res) {
  try {
    const [rows] = await db.query(
      `${orderSelect} WHERE c.usuario_id = ? ORDER BY c.id DESC`,
      [req.user.id],
    );
    return res.json(groupOrders(rows));
  } catch (error) {
    console.error("Error al obtener compras del usuario:", error);
    return res
      .status(500)
      .json({ error: "No se pudo obtener el historial de compras" });
  }
}

async function getAll(req, res) {
  try {
    const [rows] = await db.query(`${orderSelect} ORDER BY c.id DESC`);
    return res.json(groupOrders(rows));
  } catch (error) {
    console.error("Error al listar compras:", error);
    return res
      .status(500)
      .json({ error: "No se pudieron obtener las compras" });
  }
}

async function updateStatus(req, res) {
  const validStatuses = [
    "Procesando",
    "Preparando",
    "Enviado",
    "Entregado",
    "Cancelado",
  ];
  const { estado } = req.body;
  if (!validStatuses.includes(estado))
    return res.status(400).json({ error: "Estado de compra no válido" });
  try {
    const [result] = await db.query(
      "UPDATE compras SET estado = ? WHERE id = ?",
      [estado, req.params.id],
    );
    if (!result.affectedRows) {
      const [existing] = await db.query("SELECT id FROM compras WHERE id = ?", [
        req.params.id,
      ]);
      if (!existing.length)
        return res.status(404).json({ error: "Compra no encontrada" });
    }
    return res.json({ mensaje: "Estado actualizado", estado });
  } catch (error) {
    console.error("Error al actualizar compra:", error);
    return res.status(500).json({ error: "No se pudo actualizar la compra" });
  }
}

async function create(req, res) {
  const cart = req.body && req.body.carrito;
  const address = req.body && (req.body.direccion || req.body.address);
  const payment = req.body && (req.body.metodoPago || req.body.payment);
  if (!Array.isArray(cart) || cart.length === 0)
    return res
      .status(400)
      .json({ error: "El carrito debe contener al menos un producto" });
  if (
    typeof address !== "string" ||
    address.trim().length < 8 ||
    typeof payment !== "string" ||
    !payment.trim()
  ) {
    return res
      .status(400)
      .json({ error: "Dirección y método de pago son obligatorios" });
  }

  const quantities = new Map();
  for (const item of cart) {
    const productId = Number(item && item.productoId);
    const quantity = Number(item && item.cantidad);
    if (
      !Number.isInteger(productId) ||
      productId <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return res
        .status(400)
        .json({
          error:
            "Cada producto debe tener un productoId y una cantidad válidos",
        });
    }
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const lines = [];
    let subtotalCents = 0;
    for (const [productId, quantity] of quantities) {
      const [products] = await connection.query(
        "SELECT id, nombre, precio, stock FROM productos WHERE id = ? FOR UPDATE",
        [productId],
      );
      if (!products.length) {
        const error = new Error("Producto no encontrado");
        error.status = 404;
        throw error;
      }
      const product = products[0];
      if (product.stock < quantity) {
        const error = new Error(`Stock insuficiente para ${product.nombre}`);
        error.status = 409;
        throw error;
      }
      const unitPriceCents = Math.round(Number(product.precio) * 100);
      subtotalCents += unitPriceCents * quantity;
      lines.push({ productId, quantity, unitPriceCents });
    }
    const shippingCents = subtotalCents >= 50000 ? 0 : 1500;
    const total = (subtotalCents + shippingCents) / 100;
    const [purchase] = await connection.query(
      "INSERT INTO compras (usuario_id, total, estado, direccion_envio, metodo_pago) VALUES (?, ?, ?, ?, ?)",
      [req.user.id, total, "Procesando", address.trim(), payment.trim()],
    );
    for (const line of lines) {
      await connection.query(
        "UPDATE productos SET stock = stock - ? WHERE id = ?",
        [line.quantity, line.productId],
      );
      await connection.query(
        "INSERT INTO detalle_compra (compra_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)",
        [
          purchase.insertId,
          line.productId,
          line.quantity,
          line.unitPriceCents / 100,
        ],
      );
    }
    await connection.commit();
    return res
      .status(201)
      .json({
        mensaje: "Compra realizada correctamente",
        compraId: purchase.insertId,
        total,
        envio: shippingCents / 100,
      });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    console.error("Error al procesar la compra:", error);
    return res.status(500).json({ error: "No se pudo procesar la compra" });
  } finally {
    if (connection) connection.release();
  }
}

module.exports = { create, getMine, getAll, updateStatus };
