const express = require('express');
const cors = require('cors');
const authRoutes = require('./src/routes/authRoutes');
const productosRoutes = require('./src/routes/productosRoutes');
const comprasRoutes = require('./src/routes/comprasRoutes');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/compras', comprasRoutes);

app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({ error: 'El cuerpo JSON no es válido' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Error interno del servidor' });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor backend ejecutándose en http://localhost:${PORT}`);
    });
}

module.exports = app;