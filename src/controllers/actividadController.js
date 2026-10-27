const db = require("../config/db");

async function getAll(req, res) {
  try {
    const [rows] =
      await db.query(`SELECT a.id, a.accion, a.detalle, a.creada_en,
      COALESCE(u.nombre, 'Cuenta eliminada') AS actor
      FROM actividad a LEFT JOIN usuarios u ON u.id = a.usuario_id
      ORDER BY a.id DESC LIMIT 100`);
    return res.json(
      rows.map((row) => ({
        id: String(row.id),
        actor: row.actor,
        action: row.accion,
        detail: row.detalle || "",
        createdAt: row.creada_en,
      })),
    );
  } catch (error) {
    console.error("Error al listar actividad:", error);
    return res.status(500).json({ error: "No se pudo obtener la actividad" });
  }
}

async function create(req, res) {
  const { accion, detalle = "" } = req.body || {};
  if (
    typeof accion !== "string" ||
    !accion.trim() ||
    typeof detalle !== "string"
  ) {
    return res
      .status(400)
      .json({ error: "Acción y detalle válidos son obligatorios" });
  }
  try {
    const [result] = await db.query(
      "INSERT INTO actividad (usuario_id, accion, detalle) VALUES (?, ?, ?)",
      [req.user.id, accion.trim().slice(0, 120), detalle.trim().slice(0, 255)],
    );
    return res.status(201).json({ id: String(result.insertId) });
  } catch (error) {
    console.error("Error al guardar actividad:", error);
    return res.status(500).json({ error: "No se pudo guardar la actividad" });
  }
}

module.exports = { getAll, create };
