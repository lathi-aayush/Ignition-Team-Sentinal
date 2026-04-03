const mongoose = require('mongoose');

const endpointSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerWallet: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  model: { type: String, enum: ['claude', 'gpt-4'], required: true },
  encryptedApiKey: { type: String, required: true },
  priceAlgo: { type: Number, required: true },
  totalCalls: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Endpoint', endpointSchema);
