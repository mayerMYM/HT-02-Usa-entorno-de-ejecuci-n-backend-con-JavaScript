const bcrypt = require("bcryptjs");
const db = require("../config/db");

function validUser(user, requirePassword = true) {
  return (
    user &&
    typeof user === "object" &&
    typeof user.nombre === "string" &&
    user.nombre.trim().length >= 2 &&
    typeof user.email === "string" &&
    /^\S+@\S+\.\S+$/.test(user.email.trim()) &&
    (!requirePassword ||
      (typeof user.password === "string" && user.password.length >= 6)) &&
    (!user.rol || ["admin", "cliente"].includes(user.rol))
  );
}

async function getAll(req, res) {
  try {
    const [users] = await db.query(
      "SELECT id, nombre, email, rol, created_at AS creado_en FROM usuarios ORDER BY id DESC",
    );
    return res.json(users);
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    return res
      .status(500)
      .json({ error: "No se pudieron obtener los usuarios" });
  }
}

async function create(req, res) {
  if (!validUser(req.body))
    return res
      .status(400)
      .json({ error: "Nombre, correo y contraseña válidos son obligatorios" });
  const { nombre, email, password, rol = "cliente" } = req.body;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)",
      [nombre.trim(), email.trim().toLowerCase(), passwordHash, rol],
    );
    return res
      .status(201)
      .json({ mensaje: "Usuario creado", id: result.insertId });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "Ese correo ya está registrado" });
    console.error("Error al crear usuario:", error);
    return res.status(500).json({ error: "No se pudo crear el usuario" });
  }
}

async function update(req, res) {
  if (
    !validUser(
      { ...req.body, password: req.body.password || "valid-password" },
      false,
    )
  ) {
    return res.status(400).json({ error: "Nombre, correo o rol no válidos" });
  }
  const { nombre, email, rol = "cliente", password } = req.body;
  try {
    const values = [nombre.trim(), email.trim().toLowerCase(), rol];
    let query = "UPDATE usuarios SET nombre = ?, email = ?, rol = ?";
    if (password) {
      if (password.length < 6)
        return res
          .status(400)
          .json({ error: "La contraseña debe tener al menos 6 caracteres" });
      query += ", password = ?";
      values.push(await bcrypt.hash(password, 10));
    }
    query += " WHERE id = ?";
    values.push(req.params.id);
    const [result] = await db.query(query, values);
    if (!result.affectedRows) {
      const [existing] = await db.query(
        "SELECT id FROM usuarios WHERE id = ?",
        [req.params.id],
      );
      if (!existing.length)
        return res.status(404).json({ error: "Usuario no encontrado" });
    }
    return res.json({ mensaje: "Usuario actualizado correctamente" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "Ese correo ya está registrado" });
    console.error("Error al actualizar usuario:", error);
    return res.status(500).json({ error: "No se pudo actualizar el usuario" });
  }
}

async function remove(req, res) {
  if (String(req.user.id) === String(req.params.id))
    return res
      .status(409)
      .json({ error: "No puedes eliminar tu propia cuenta activa" });
  try {
    const [users] = await db.query(
      "SELECT id, rol FROM usuarios WHERE id = ?",
      [req.params.id],
    );
    if (!users.length)
      return res.status(404).json({ error: "Usuario no encontrado" });
    if (users[0].rol === "admin") {
      const [[{ totalAdmins }]] = await db.query(
        "SELECT COUNT(*) AS totalAdmins FROM usuarios WHERE rol = 'admin'",
      );
      if (totalAdmins <= 1)
        return res
          .status(409)
          .json({ error: "Debe quedar al menos un administrador" });
    }
    await db.query("DELETE FROM usuarios WHERE id = ?", [req.params.id]);
    return res.json({ mensaje: "Usuario eliminado correctamente" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2")
      return res.status(409).json({
        error: "No se puede eliminar un usuario con compras asociadas",
      });
    console.error("Error al eliminar usuario:", error);
    return res.status(500).json({ error: "No se pudo eliminar el usuario" });
  }
}

module.exports = { getAll, create, update, remove };
