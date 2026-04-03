import mongoose from "mongoose";
import { Transaction } from "../models/Transaction.js";

export async function connectDb() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI or MONGO_URI is required");
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  try {
    await Transaction.syncIndexes();
  } catch (e) {
    console.warn("Transaction.syncIndexes:", e?.message);
  }
}
