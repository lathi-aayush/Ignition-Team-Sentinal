import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userWallet: { type: String, required: true, index: true },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    amount: { type: Number, required: true },
    txId: { type: String },
    status: {
      type: String,
      enum: ["pending", "verified", "failed"],
      default: "pending",
    },
    paymentIntentId: { type: String, required: true, unique: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

transactionSchema.index(
  { txId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      txId: { $exists: true, $type: "string", $gt: "" },
    },
  }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
