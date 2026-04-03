import { Router } from "express";
import { body, validationResult } from "express-validator";
import algosdk from "algosdk";
import crypto from "crypto";
import { Service } from "../models/Service.js";
import { Transaction } from "../models/Transaction.js";
import { AccessToken } from "../models/AccessToken.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  algoToMicroAlgos,
  decodeNote,
  lookupTransactionByIDWithRetry,
  normalizeAlgoAddress,
  parsePaymentFromIndexer,
} from "../services/algorandService.js";

const router = Router();

router.post(
  "/create",
  requireAuth,
  requireRole("user"),
  body("serviceId").isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const serviceId = String(req.body.serviceId || "").trim();
    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ error: "Service not found" });
    const receiver = String(service.creatorWallet || "").trim();
    if (!receiver) {
      return res.status(400).json({ error: "Service has no payout address" });
    }
    if (!algosdk.isValidAddress(receiver)) {
      return res.status(400).json({
        error: "Service creator wallet is not a valid Algorand address. Update the service with a valid TestNet address.",
      });
    }
    if (receiver === String(req.user.walletAddress).trim()) {
      return res.status(400).json({ error: "Cannot pay for your own service" });
    }
    const price = Number(service.price);
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: "Invalid service price" });
    }
    const amountMicroAlgos = algoToMicroAlgos(price);
    const paymentIntentId = crypto.randomUUID();
    try {
      await Transaction.create({
        userWallet: String(req.user.walletAddress),
        serviceId: service._id,
        amount: price,
        status: "pending",
        paymentIntentId,
      });
    } catch (e) {
      console.error("Transaction.create", e);
      const code = e?.code;
      if (code === 11000) {
        return res.status(409).json({
          error: "Duplicate payment record. Try again in a moment.",
          detail: e?.message,
        });
      }
      return res.status(500).json({
        error: "Could not create payment intent",
        detail: process.env.NODE_ENV !== "production" ? e?.message : undefined,
      });
    }
    res.json({
      paymentIntentId,
      receiver,
      amountMicroAlgos,
      amountAlgo: service.price,
      note: `sentinal:${paymentIntentId}`,
      algodServer:
        process.env.ALGOD_SERVER ||
        process.env.ALGORAND_NODE ||
        "https://testnet-api.algonode.cloud",
    });
  }
);

router.post(
  "/verify",
  requireAuth,
  requireRole("user"),
  body("txId").isString().trim().notEmpty(),
  body("paymentIntentId").isUUID(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { txId, paymentIntentId } = req.body;

    const existing = await Transaction.findOne({ txId });
    if (existing && existing.status === "verified") {
      return res.status(409).json({ error: "Transaction already used" });
    }

    const pending = await Transaction.findOne({ paymentIntentId });
    if (!pending || pending.userWallet !== req.user.walletAddress) {
      return res.status(404).json({ error: "Payment intent not found" });
    }
    if (pending.status === "verified") {
      const tokenDoc = await AccessToken.findOne({
        userWallet: req.user.walletAddress,
        serviceId: pending.serviceId,
      }).sort({ createdAt: -1 });
      return res.json({
        status: "verified",
        apiKey: tokenDoc?.key ?? null,
        transaction: pending,
      });
    }

    let txInfo;
    try {
      txInfo = await lookupTransactionByIDWithRetry(txId);
    } catch {
      return res.status(402).json({
        error: "Transaction not found or not indexed yet. Wait a few seconds and try verify again.",
      });
    }

    const parsed = parsePaymentFromIndexer(txInfo);
    if (!parsed) {
      return res.status(400).json({ error: "Invalid transaction type" });
    }

    const { sender, receiver, amount, note } = parsed;

    const service = await Service.findById(pending.serviceId);
    if (!service) return res.status(404).json({ error: "Service missing" });

    const expectedMicro = algoToMicroAlgos(Number(service.price));
    const senderN = normalizeAlgoAddress(sender);
    const receiverN = normalizeAlgoAddress(receiver);
    const userN = normalizeAlgoAddress(req.user.walletAddress);
    const creatorN = normalizeAlgoAddress(service.creatorWallet);

    if (senderN !== userN) {
      return res.status(400).json({ error: "Sender mismatch" });
    }
    if (receiverN !== creatorN) {
      return res.status(400).json({ error: "Receiver mismatch" });
    }
    if (amount !== expectedMicro) {
      return res.status(400).json({ error: "Amount mismatch" });
    }

    const noteStr = decodeNote(note);
    if (noteStr !== `sentinal:${paymentIntentId}`) {
      return res.status(400).json({ error: "Note mismatch" });
    }

    const dupTx = await Transaction.findOne({ txId, _id: { $ne: pending._id } });
    if (dupTx) {
      return res.status(409).json({ error: "Transaction already recorded" });
    }

    pending.txId = txId;
    pending.status = "verified";
    await pending.save();

    service.totalRevenue = Number(service.totalRevenue) + Number(service.price);
    await service.save();

    const apiKey = `sk_${crypto.randomBytes(32).toString("hex")}`;
    await AccessToken.create({
      userWallet: req.user.walletAddress,
      serviceId: service._id,
      key: apiKey,
      isUsed: false,
    });

    res.json({
      status: "verified",
      apiKey,
      serviceId: service._id.toString(),
    });
  }
);

export default router;
