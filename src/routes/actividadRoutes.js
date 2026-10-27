const express = require("express");
const actividadController = require("../controllers/actividadController");
const {
  authenticateToken,
  requireRole,
} = require("../middlewares/authMiddleware");

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  requireRole("admin"),
  actividadController.getAll,
);
router.post("/", authenticateToken, actividadController.create);

module.exports = router;
