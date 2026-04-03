import { Router } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import { Service } from "../models/Service.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  const services = await Service.find().sort({ createdAt: -1 }).lean();
  res.json(services);
});

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid service id" });
  }
  const service = await Service.findById(id).lean();
  if (!service) return res.status(404).json({ error: "Not found" });
  res.json(service);
});

router.post(
  "/",
  requireAuth,
  requireRole("creator"),
  body("title").isString().trim().notEmpty(),
  body("description").optional().isString(),
  body("price").isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { title, description = "", price } = req.body;
    const creatorWallet = req.user.walletAddress;
    const service = await Service.create({
      title,
      description,
      price,
      creatorWallet,
    });
    res.status(201).json(service);
  }
);

export default router;
