const db = require('../config/db');

async function create(req, res) {
    const cart = req.body && req.body.carrito;
    if (!Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ error: 'El carrito debe contener al menos un producto' });
    }

    const quantities = new Map();
    for (const item of cart) {
        if (!item || typeof item !== 'object') {
            return res.status(400).json({ error: 'Cada elemento del carrito debe ser un objeto válido' });
        }
        const productId = Number(item.productoId);
        const quantity = Number(item.cantidad);
        if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({ error: 'Cada producto debe tener un productoId y una cantidad válidos' });
        }
        quantities.set(productId, (quantities.get(productId) || 0) + quantity);
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const lines = [];
        let totalCents = 0;
        for (const [productId, quantity] of quantities) {
            const [products] = await connection.query(
                'SELECT id, nombre, precio, stock FROM productos WHERE id = ? FOR UPDATE',
                [productId]
            );
            if (!products.length) {
                const error = new Error('Producto no encontrado');
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
            totalCents += unitPriceCents * quantity;
            lines.push({ productId, quantity, unitPriceCents });
        }

        const [purchase] = await connection.query(
            'INSERT INTO compras (usuario_id, total) VALUES (?, ?)',
            [req.user.id, totalCents / 100]
        );
        for (const line of lines) {
            await connection.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [line.quantity, line.productId]);
            await connection.query(
                'INSERT INTO detalle_compra (compra_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
                [purchase.insertId, line.productId, line.quantity, line.unitPriceCents / 100]
            );
        }

        await connection.commit();
        return res.status(201).json({
            mensaje: 'Compra realizada correctamente',
            compraId: purchase.insertId,
            total: totalCents / 100,
            productos: lines.map(({ productId, quantity }) => ({ productoId: productId, cantidad: quantity }))
        });
    } catch (error) {
        if (connection) await connection.rollback();
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error('Error al procesar la compra:', error);
        return res.status(500).json({ error: 'No se pudo procesar la compra' });
    } finally {
        if (connection) connection.release();
    }
}

module.exports = { create };