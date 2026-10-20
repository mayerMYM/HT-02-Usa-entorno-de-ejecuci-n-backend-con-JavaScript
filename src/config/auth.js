if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('La variable de entorno JWT_SECRET es obligatoria en producción');
}

module.exports = process.env.JWT_SECRET || 'dev-secret-change-me';