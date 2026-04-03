import { Router } from "express";
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const router = Router();

router.post(
  "/login",
  body("walletAddress").isString().trim().notEmpty(),
  body("role").isIn(["user", "creator"]),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { walletAddress, role } = req.body;
    const user = await User.findOneAndUpdate(
      { walletAddress },
      { $set: { walletAddress, role } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: "Server misconfigured" });
    const token = jwt.sign(
      {
        sub: user._id.toString(),
        walletAddress: user.walletAddress,
        role: user.role,
      },
      secret,
      { expiresIn: "7d" }
    );
    res.json({
      token,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        role: user.role,
      },
    });
  }
);

export default router;
