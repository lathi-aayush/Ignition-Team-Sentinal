const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const verifyJWT = require('../middleware/verifyJWT');

// GET /api/developer/dashboard — developer's balance, keys, tx logs
router.get('/dashboard', verifyJWT, async (req, res) => {
  try {
    if (req.user.role !== 'developer') return res.status(403).json({ error: 'Developer access only' });

    const user = await User.findById(req.user.userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const transactions = await Transaction.find({ userWallet: user.walletAddress })
      .sort({ timestamp: -1 })
      .limit(30)
      .lean();

    res.json({
      balance: user.walletBalance,
      apiKeys: user.apiKeys.map(k => ({
        name: k.name,
        createdAt: k.createdAt,
        lastUsed: k.lastUsed,
        _id: k._id
      })),
      transactions
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/developer/user-dashboard — end user's balance and tx history
router.get('/user-dashboard', verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const transactions = await Transaction.find({ userWallet: user.walletAddress })
      .sort({ timestamp: -1 })
      .limit(30)
      .lean();

    res.json({
      balance: user.walletBalance,
      role: user.role,
      transactions
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user dashboard' });
  }
});

// POST /api/developer/keys — generate a new API key (developer only)
router.post('/keys', verifyJWT, async (req, res) => {
  try {
    if (req.user.role !== 'developer') return res.status(403).json({ error: 'Developer access only' });

    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Key name is required' });

    const user = await User.findById(req.user.userId);

    const rawKey = 'sentinel_live_' + crypto.randomBytes(16).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    user.apiKeys.push({ name, keyHash });
    await user.save();

    // Return raw key ONLY ONCE — we never store it
    res.status(201).json({ message: 'Key generated', rawKey, name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate key' });
  }
});

// DELETE /api/developer/keys/:id — revoke a key
router.delete('/keys/:id', verifyJWT, async (req, res) => {
  try {
    if (req.user.role !== 'developer') return res.status(403).json({ error: 'Developer access only' });

    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { apiKeys: { _id: req.params.id } }
    });

    res.json({ message: 'Key revoked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke key' });
  }
});

module.exports = router;
