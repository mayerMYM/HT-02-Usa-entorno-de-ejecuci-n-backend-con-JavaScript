const jwt = require('jsonwebtoken');
const jwtSecret = require('../config/auth');

function authenticateToken(req, res, next) {
    const authorization = req.headers.authorization;
    const [scheme, token] = authorization ? authorization.split(' ') : [];

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Se requiere un token de autenticación' });
    }

    try {
        const payload = jwt.verify(token, jwtSecret);
        if (!payload.sub || !['admin', 'cliente'].includes(payload.rol)) {
            return res.status(401).json({ error: 'Token de autenticación no válido' });
        }
        req.user = { id: payload.sub, rol: payload.rol };
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.rol)) {
            return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
        }
        return next();
    };
}

module.exports = { authenticateToken, requireRole };