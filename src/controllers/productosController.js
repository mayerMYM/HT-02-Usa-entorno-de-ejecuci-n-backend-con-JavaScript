const db = require("../config/db");

function validProduct(product) {
  return (
    product !== null &&
    typeof product === "object" &&
    typeof product.nombre === "string" &&
    product.nombre.trim() &&
    typeof product.categoria === "string" &&
    product.categoria.trim() &&
    product.precio !== null &&
    product.precio !== "" &&
    Number.isFinite(Number(product.precio)) &&
    Number(product.precio) >= 0 &&
    product.stock !== null &&
    product.stock !== "" &&
    Number.isInteger(Number(product.stock)) &&
    Number(product.stock) >= 0
  );
}

function productValues(product) {
  const specifications = Array.isArray(product.especificaciones)
    ? product.especificaciones
    : [];
  return [
    product.nombre.trim(),
    product.categoria.trim(),
    Number(product.precio),
    Number(product.stock),
    typeof product.marca === "string" && product.marca.trim()
      ? product.marca.trim()
      : "NEXUS",
    typeof product.descripcion === "string" ? product.descripcion.trim() : null,
    typeof product.imagen === "string" ? product.imagen.trim() || null : null,
    typeof product.etiqueta === "string" && product.etiqueta.trim()
      ? product.etiqueta.trim()
      : "NUEVO",
    product.precioAnterior === "" || product.precioAnterior == null
      ? null
      : Number(product.precioAnterior),
    Number.isFinite(Number(product.rating)) ? Number(product.rating) : 4.8,
    Number.isInteger(Number(product.opiniones)) ? Number(product.opiniones) : 0,
    typeof product.color === "string" ? product.color : "cyan",
    JSON.stringify(specifications),
  ];
}

const productColumns =
  "(nombre, categoria, precio, stock, marca, descripcion, imagen, etiqueta, precio_anterior, rating, opiniones, color, especificaciones)";
const productPlaceholders = "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

async function getAll(req, res) {
  try {
    const [products] = await db.query(
      "SELECT * FROM productos ORDER BY id DESC",
    );
    return res.json(products);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return res
      .status(500)
      .json({ error: "No se pudieron obtener los productos" });
  }
}

async function create(req, res) {
  if (!validProduct(req.body)) {
    return res
      .status(400)
      .json({ error: "Nombre, categoría, precio y stock deben ser válidos" });
  }
  try {
    const [result] = await db.query(
      `INSERT INTO productos ${productColumns} VALUES ${productPlaceholders}`,
      productValues(req.body),
    );
    return res
      .status(201)
      .json({
        mensaje: "Producto registrado con éxito",
        idGenerado: result.insertId,
      });
  } catch (error) {
    console.error("Error al registrar producto:", error);
    return res.status(500).json({ error: "No se pudo registrar el producto" });
  }
}

async function createMany(req, res) {
  const products = req.body;
  if (
    !Array.isArray(products) ||
    products.length === 0 ||
    !products.every(validProduct)
  ) {
    return res
      .status(400)
      .json({ error: "Envía un arreglo no vacío de productos válidos" });
  }
  try {
    const values = products.map(({ nombre, categoria, precio, stock }) => [
      nombre.trim(),
      categoria.trim(),
      precio,
      stock,
    ]);
    const [result] = await db.query(
      "INSERT INTO productos (nombre, categoria, precio, stock) VALUES ?",
      [values],
    );
    return res
      .status(201)
      .json({
        mensaje: "Productos registrados correctamente",
        totalRegistrados: result.affectedRows,
      });
  } catch (error) {
    console.error("Error en inserción masiva:", error);
    return res
      .status(500)
      .json({ error: "No se pudieron registrar los productos" });
  }
}

async function update(req, res) {
  if (!validProduct(req.body)) {
    return res
      .status(400)
      .json({ error: "Nombre, categoría, precio y stock deben ser válidos" });
  }
  try {
    const [result] = await db.query(
      "UPDATE productos SET nombre = ?, categoria = ?, precio = ?, stock = ?, marca = ?, descripcion = ?, imagen = ?, etiqueta = ?, precio_anterior = ?, rating = ?, opiniones = ?, color = ?, especificaciones = ? WHERE id = ?",
      [...productValues(req.body), req.params.id],
    );
    if (!result.affectedRows) {
      const [existing] = await db.query(
        "SELECT id FROM productos WHERE id = ?",
        [req.params.id],
      );
      if (!existing.length)
        return res.status(404).json({ error: "Producto no encontrado" });
    }
    return res.json({ mensaje: "Producto actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    return res.status(500).json({ error: "No se pudo actualizar el producto" });
  }
}

async function remove(req, res) {
  try {
    const [result] = await db.query("DELETE FROM productos WHERE id = ?", [
      req.params.id,
    ]);
    if (!result.affectedRows)
      return res.status(404).json({ error: "Producto no encontrado" });
    return res.json({ mensaje: "Producto eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    return res.status(500).json({ error: "No se pudo eliminar el producto" });
  }
}

module.exports = { getAll, create, createMany, update, remove };
