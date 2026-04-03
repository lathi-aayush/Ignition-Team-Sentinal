import { Router } from "express";
import { AccessToken } from "../models/AccessToken.js";
import { Service } from "../models/Service.js";

const router = Router();

router.post("/invoke", async (req, res) => {
  const key = req.headers["x-api-key"] || req.headers["authorization"]?.replace(/^Bearer\s+/i, "");
  if (!key || typeof key !== "string") {
    return res.status(401).json({ error: "Missing API key" });
  }
  const token = await AccessToken.findOne({ key });
  if (!token) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  const service = await Service.findById(token.serviceId);
  if (!service) {
    return res.status(404).json({ error: "Service not found" });
  }
  if (!token.isUsed) {
    token.isUsed = true;
    await token.save();
  }
  service.totalUses = (service.totalUses || 0) + 1;
  await service.save();
  res.json({
    ok: true,
    message: "Mock AI response",
    service: service.title,
    promptEcho: req.body?.prompt ?? null,
    output: "This is a mock completion. Replace with OpenAI integration.",
  });
});

export default router;
