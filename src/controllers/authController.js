const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const jwtSecret = require('../config/auth');

async function register(req, res) {
    const { nombre, email, password } = req.body;
    if (typeof nombre !== 'string' || !nombre.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
        return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
    }

    try {
        const normalizedEmail = email.trim().toLowerCase();
        const [existingUsers] = await db.query('SELECT id FROM usuarios WHERE email = ?', [normalizedEmail]);
        if (existingUsers.length) {
            return res.status(409).json({ error: 'El correo electrónico ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
            [nombre.trim(), normalizedEmail, hashedPassword, 'cliente']
        );

        return res.status(201).json({
            mensaje: 'Usuario registrado exitosamente',
            userId: result.insertId,
            rol: 'cliente'
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'El correo electrónico ya está registrado' });
        }
        console.error('Error al registrar usuario:', error);
        return res.status(500).json({ error: 'No se pudo registrar el usuario' });
    }
}

async function login(req, res) {
    const { email, password } = req.body;
    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
        return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
    }

    try {
        const [users] = await db.query('SELECT id, nombre, email, password, rol FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);
        if (!users.length || !(await bcrypt.compare(password, users[0].password))) {
            return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        }

        const user = users[0];
        const token = jwt.sign({ rol: user.rol }, jwtSecret, { subject: String(user.id), expiresIn: '1d' });
        return res.status(200).json({
            mensaje: 'Inicio de sesión exitoso',
            token,
            usuario: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }
        });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        return res.status(500).json({ error: 'No se pudo iniciar sesión' });
    }
}

module.exports = { register, login };