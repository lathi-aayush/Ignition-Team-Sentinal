const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  walletAddress: { type: String, unique: true, required: true },
  role: { type: String, enum: ['developer', 'user'], default: 'user' },
  walletBalance: { type: Number, default: 0 }, // Prepaid ALGO platform balance

  // Only for developers — API keys for their own apps
  apiKeys: [{
    keyHash: { type: String, required: true }, // SHA-256 hashed, never raw
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    lastUsed: { type: Date }
  }],

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
