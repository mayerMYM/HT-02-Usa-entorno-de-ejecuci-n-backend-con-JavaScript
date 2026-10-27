const express = require("express");
const usuariosController = require("../controllers/usuariosController");
const {
  authenticateToken,
  requireRole,
} = require("../middlewares/authMiddleware");

const router = express.Router();
const adminOnly = [authenticateToken, requireRole("admin")];

router.get("/", ...adminOnly, usuariosController.getAll);
router.post("/", ...adminOnly, usuariosController.create);
router.put("/:id", ...adminOnly, usuariosController.update);
router.delete("/:id", ...adminOnly, usuariosController.remove);

module.exports = router;
