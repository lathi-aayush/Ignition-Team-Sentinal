const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  txID: { type: String, sparse: true, unique: true }, // Algorand on-chain txn ID (deposits only)
  type: {
    type: String,
    enum: [
      'deposit',       // User/dev deposited ALGO into platform balance
      'inference',     // Developer used /api/generate (deducted from dev balance)
      'user_pay',      // User called an endpoint (deducted from user balance, credited to dev)
    ],
    required: true
  },
  userWallet: { type: String, required: true },         // Who initiated
  developerWallet: { type: String },                    // Who earned (for user_pay type)
  endpointId: { type: mongoose.Schema.Types.ObjectId, ref: 'Endpoint' }, // Which endpoint (user_pay)
  amountAlgo: { type: Number, required: true },         // Always positive (absolute amount)
  status: { type: String, enum: ['confirmed', 'failed'], default: 'confirmed' },
  details: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
