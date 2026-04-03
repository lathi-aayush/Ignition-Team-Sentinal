const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const rateLimiter = require('../middleware/rateLimiter');
const { Anthropic } = require('@anthropic-ai/sdk');
const Groq = require('groq-sdk');

const COST_PER_REQUEST = parseFloat(process.env.COST_PER_REQUEST) || 0.01; // ALGO per request

// POST /api/generate — Developer's apps call this with their API key
// Deducts from the developer's platform balance
router.post('/', rateLimiter, async (req, res) => {
  const rawApiKey = req.headers['x-api-key'];
  if (!rawApiKey) return res.status(401).json({ error: 'x-api-key header is missing' });

  const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');

  try {
    const developer = await User.findOne({ 'apiKeys.keyHash': keyHash, role: 'developer' });
    if (!developer) return res.status(401).json({ error: 'Invalid API key' });

    if (developer.walletBalance < COST_PER_REQUEST) {
      return res.status(402).json({
        error: 'Insufficient Balance',
        message: `Need at least ${COST_PER_REQUEST} ALGO. Current balance: ${developer.walletBalance.toFixed(4)} ALGO.`
      });
    }

    const { model, messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Atomic deduct to prevent race conditions
    const updated = await User.findOneAndUpdate(
      { _id: developer._id, walletBalance: { $gte: COST_PER_REQUEST } },
      { $inc: { walletBalance: -COST_PER_REQUEST } },
      { new: true }
    );
    if (!updated) return res.status(402).json({ error: 'Insufficient balance (concurrent request)' });

    let aiResponseText = '';
    try {
      const useModel = model || 'groq';

      if (useModel === 'claude') {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const msg = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages
        });
        aiResponseText = msg.content[0].text;
      } else {
        // Default: Groq (faster, cheaper)
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
          model: 'llama3-8b-8192',
          messages,
          max_tokens: 1024
        });
        aiResponseText = completion.choices[0].message.content;
      }

      // Log inference transaction
      await Transaction.create({
        type: 'inference',
        userWallet: developer.walletAddress,
        amountAlgo: COST_PER_REQUEST,
        details: `AI inference (${useModel}) via API key`
      });

      // Update key lastUsed
      await User.updateOne(
        { _id: developer._id, 'apiKeys.keyHash': keyHash },
        { $set: { 'apiKeys.$.lastUsed': new Date() } }
      );

      res.json({
        choices: [{ message: { role: 'assistant', content: aiResponseText } }],
        cost: COST_PER_REQUEST,
        remainingBalance: updated.walletBalance
      });

    } catch (aiError) {
      console.error('AI Error:', aiError);
      // Refund on AI failure
      await User.findByIdAndUpdate(developer._id, { $inc: { walletBalance: COST_PER_REQUEST } });
      res.status(502).json({ error: 'AI provider failed. You were refunded.' });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
