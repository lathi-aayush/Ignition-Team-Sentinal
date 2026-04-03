import mongoose from "mongoose";

const accessTokenSchema = new mongoose.Schema(
  {
    userWallet: { type: String, required: true, index: true },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    key: { type: String, required: true, unique: true },
    isUsed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

accessTokenSchema.index({ userWallet: 1, serviceId: 1 });

export const AccessToken = mongoose.model("AccessToken", accessTokenSchema);
