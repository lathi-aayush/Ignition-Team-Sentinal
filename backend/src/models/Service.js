import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    creatorWallet: { type: String, required: true, index: true },
    totalUses: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export const Service = mongoose.model("Service", serviceSchema);
