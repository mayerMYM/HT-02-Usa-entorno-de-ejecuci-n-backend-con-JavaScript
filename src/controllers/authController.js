const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const jwtSecret = require("../config/auth");

function createSession(user) {
  const token = jwt.sign({ rol: user.rol }, jwtSecret, {
    subject: String(user.id),
    expiresIn: "1d",
  });
  return {
    token,
    usuario: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
    },
  };
}

async function register(req, res) {
  const { nombre, email, password } = req.body;
  if (
    typeof nombre !== "string" ||
    !nombre.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    return res
      .status(400)
      .json({ error: "Nombre, correo y contraseña son obligatorios" });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const [existingUsers] = await db.query(
      "SELECT id FROM usuarios WHERE email = ?",
      [normalizedEmail],
    );
    if (existingUsers.length) {
      return res
        .status(409)
        .json({ error: "El correo electrónico ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)",
      [nombre.trim(), normalizedEmail, hashedPassword, "cliente"],
    );

    const user = {
      id: result.insertId,
      nombre: nombre.trim(),
      email: normalizedEmail,
      rol: "cliente",
    };
    return res
      .status(201)
      .json({
        mensaje: "Usuario registrado exitosamente",
        ...createSession(user),
      });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "El correo electrónico ya está registrado" });
    }
    console.error("Error al registrar usuario:", error);
    return res.status(500).json({ error: "No se pudo registrar el usuario" });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    return res
      .status(400)
      .json({ error: "Correo y contraseña son obligatorios" });
  }

  try {
    const [users] = await db.query(
      "SELECT id, nombre, email, password, rol FROM usuarios WHERE email = ?",
      [email.trim().toLowerCase()],
    );
    if (!users.length || !(await bcrypt.compare(password, users[0].password))) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos" });
    }

    const user = users[0];
    return res.status(200).json({
      mensaje: "Inicio de sesión exitoso",
      ...createSession(user),
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return res.status(500).json({ error: "No se pudo iniciar sesión" });
  }
}

async function getMe(req, res) {
  try {
    const [users] = await db.query(
      "SELECT id, nombre, email, rol FROM usuarios WHERE id = ?",
      [req.user.id],
    );
    if (!users.length)
      return res.status(404).json({ error: "Usuario no encontrado" });
    return res.json(users[0]);
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    return res.status(500).json({ error: "No se pudo obtener el perfil" });
  }
}

async function updateMe(req, res) {
  const { nombre, email } = req.body;
  if (
    typeof nombre !== "string" ||
    nombre.trim().length < 2 ||
    typeof email !== "string" ||
    !/^\S+@\S+\.\S+$/.test(email.trim())
  ) {
    return res
      .status(400)
      .json({ error: "Nombre y correo válidos son obligatorios" });
  }
  try {
    await db.query("UPDATE usuarios SET nombre = ?, email = ? WHERE id = ?", [
      nombre.trim(),
      email.trim().toLowerCase(),
      req.user.id,
    ]);
    const [users] = await db.query(
      "SELECT id, nombre, email, rol FROM usuarios WHERE id = ?",
      [req.user.id],
    );
    return res.json(users[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .json({ error: "El correo electrónico ya está registrado" });
    console.error("Error al actualizar perfil:", error);
    return res.status(500).json({ error: "No se pudo actualizar el perfil" });
  }
}

module.exports = { register, login, getMe, updateMe };
