const express = require("express");
const comprasController = require("../controllers/comprasController");
const {
  authenticateToken,
  requireRole,
} = require("../middlewares/authMiddleware");

const router = express.Router();
const adminOnly = [authenticateToken, requireRole("admin")];

router.get(
  "/mias",
  authenticateToken,
  requireRole("cliente"),
  comprasController.getMine,
);
router.get("/", ...adminOnly, comprasController.getAll);
router.post(
  "/",
  authenticateToken,
  requireRole("cliente"),
  comprasController.create,
);
router.patch("/:id/estado", ...adminOnly, comprasController.updateStatus);

module.exports = router;
