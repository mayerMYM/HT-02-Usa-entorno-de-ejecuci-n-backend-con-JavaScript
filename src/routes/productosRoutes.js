const express = require('express');
const productosController = require('../controllers/productosController');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();
const adminOnly = [authenticateToken, requireRole('admin')];

router.get('/', productosController.getAll);
router.post('/masivo', ...adminOnly, productosController.createMany);
router.post('/', ...adminOnly, productosController.create);
router.put('/:id', ...adminOnly, productosController.update);
router.delete('/:id', ...adminOnly, productosController.remove);

module.exports = router;