const db = require('../config/db');

function validProduct(product) {
    return product !== null && typeof product === 'object'
        && typeof product.nombre === 'string' && product.nombre.trim()
        && typeof product.categoria === 'string' && product.categoria.trim()
        && product.precio !== null && product.precio !== ''
        && Number.isFinite(Number(product.precio)) && Number(product.precio) >= 0
        && product.stock !== null && product.stock !== ''
        && Number.isInteger(Number(product.stock)) && Number(product.stock) >= 0;
}

async function getAll(req, res) {
    try {
        const [products] = await db.query('SELECT * FROM productos ORDER BY id DESC');
        return res.json(products);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        return res.status(500).json({ error: 'No se pudieron obtener los productos' });
    }
}

async function create(req, res) {
    if (!validProduct(req.body)) {
        return res.status(400).json({ error: 'Nombre, categoría, precio y stock deben ser válidos' });
    }
    try {
        const { nombre, categoria, precio, stock } = req.body;
        const [result] = await db.query(
            'INSERT INTO productos (nombre, categoria, precio, stock) VALUES (?, ?, ?, ?)',
            [nombre.trim(), categoria.trim(), precio, stock]
        );
        return res.status(201).json({ mensaje: 'Producto registrado con éxito', idGenerado: result.insertId });
    } catch (error) {
        console.error('Error al registrar producto:', error);
        return res.status(500).json({ error: 'No se pudo registrar el producto' });
    }
}

async function createMany(req, res) {
    const products = req.body;
    if (!Array.isArray(products) || products.length === 0 || !products.every(validProduct)) {
        return res.status(400).json({ error: 'Envía un arreglo no vacío de productos válidos' });
    }
    try {
        const values = products.map(({ nombre, categoria, precio, stock }) => [nombre.trim(), categoria.trim(), precio, stock]);
        const [result] = await db.query('INSERT INTO productos (nombre, categoria, precio, stock) VALUES ?', [values]);
        return res.status(201).json({ mensaje: 'Productos registrados correctamente', totalRegistrados: result.affectedRows });
    } catch (error) {
        console.error('Error en inserción masiva:', error);
        return res.status(500).json({ error: 'No se pudieron registrar los productos' });
    }
}

async function update(req, res) {
    if (!validProduct(req.body)) {
        return res.status(400).json({ error: 'Nombre, categoría, precio y stock deben ser válidos' });
    }
    try {
        const { nombre, categoria, precio, stock } = req.body;
        const [result] = await db.query(
            'UPDATE productos SET nombre = ?, categoria = ?, precio = ?, stock = ? WHERE id = ?',
            [nombre.trim(), categoria.trim(), precio, stock, req.params.id]
        );
        if (!result.affectedRows) return res.status(404).json({ error: 'Producto no encontrado' });
        return res.json({ mensaje: 'Producto actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        return res.status(500).json({ error: 'No se pudo actualizar el producto' });
    }
}

async function remove(req, res) {
    try {
        const [result] = await db.query('DELETE FROM productos WHERE id = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Producto no encontrado' });
        return res.json({ mensaje: 'Producto eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        return res.status(500).json({ error: 'No se pudo eliminar el producto' });
    }
}

module.exports = { getAll, create, createMany, update, remove };