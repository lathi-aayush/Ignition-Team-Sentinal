const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const algosdk = require('algosdk');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const nonces = new Map();

// Step 1: Get a nonce to sign
router.get('/nonce', (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'Wallet address required' });
  const nonce = crypto.randomBytes(32).toString('hex');
  nonces.set(wallet, { nonce, expires: Date.now() + 5 * 60 * 1000 });
  res.json({ nonce });
});

// Step 2: Verify signature, create/login user with role
router.post('/verify', async (req, res) => {
  const { walletAddress, signedMessage, role } = req.body;

  if (!walletAddress || !signedMessage) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const nonceData = nonces.get(walletAddress);
  if (!nonceData || Date.now() > nonceData.expires) {
    return res.status(401).json({ error: 'Nonce expired or not found' });
  }

  try {
    const signedObj = new Uint8Array(Object.values(signedMessage));
    const isValid = algosdk.verifyBytes(
      Buffer.from(nonceData.nonce, 'utf8'),
      signedObj,
      walletAddress
    );

    if (!isValid) return res.status(401).json({ error: 'Invalid signature' });
    nonces.delete(walletAddress);

    let user = await User.findOne({ walletAddress });
    if (!user) {
      // New user — assign role from login page choice (developer or user)
      const assignedRole = role === 'developer' ? 'developer' : 'user';
      user = await User.create({ walletAddress, role: assignedRole, walletBalance: 0, apiKeys: [] });
    }

    const token = jwt.sign(
      { walletAddress: user.walletAddress, userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, role: user.role, balance: user.walletBalance });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

module.exports = router;
