import { Router } from "express";
import { Service } from "../models/Service.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get(
  "/services",
  requireAuth,
  requireRole("creator"),
  async (req, res) => {
    const list = await Service.find({ creatorWallet: req.user.walletAddress })
      .sort({ createdAt: -1 })
      .lean();
    res.json(list);
  }
);

router.get("/stats", requireAuth, requireRole("creator"), async (req, res) => {
  const services = await Service.find({
    creatorWallet: req.user.walletAddress,
  }).lean();
  const totalRevenue = services.reduce((s, x) => s + (x.totalRevenue || 0), 0);
  const totalUses = services.reduce((s, x) => s + (x.totalUses || 0), 0);
  const serviceCount = services.length;
  res.json({ totalRevenue, totalUses, serviceCount, services });
});

export default router;
