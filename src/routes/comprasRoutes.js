const express = require('express');
const comprasController = require('../controllers/comprasController');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authenticateToken, requireRole('cliente'), comprasController.create);

module.exports = router;