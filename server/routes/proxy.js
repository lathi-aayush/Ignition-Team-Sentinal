const express = require('express');
const router = express.Router();
const { Anthropic } = require('@anthropic-ai/sdk');
const Groq = require('groq-sdk');

const Endpoint = require('../models/Endpoint');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const verifyJWT = require('../middleware/verifyJWT');
const rateLimiter = require('../middleware/rateLimiter');
const { decrypt } = require('../services/encryption');

// POST /api/proxy/:endpointId
// Called by end-users through a developer's app
// Deducts from user's platform balance, credits to developer's platform balance
router.post('/:id', verifyJWT, rateLimiter, async (req, res) => {
  const { prompt, messages } = req.body;

  if (!prompt && (!messages || !Array.isArray(messages))) {
    return res.status(400).json({ error: 'prompt or messages array is required' });
  }

  try {
    // 1. Fetch endpoint
    const endpoint = await Endpoint.findById(req.params.id);
    if (!endpoint || !endpoint.isActive) {
      return res.status(404).json({ error: 'Endpoint not found or inactive' });
    }

    const cost = endpoint.priceAlgo;

    // 2. Fetch user and check balance
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.walletBalance < cost) {
      return res.status(402).json({
        error: 'Insufficient Balance',
        message: `This endpoint costs ${cost} ALGO. Your balance: ${user.walletBalance.toFixed(4)} ALGO. Please top up.`
      });
    }

    // 3. Atomic deduct from user — prevent race conditions
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, walletBalance: { $gte: cost } },
      { $inc: { walletBalance: -cost } },
      { new: true }
    );
    if (!updatedUser) return res.status(402).json({ error: 'Insufficient balance (concurrent request)' });

    // 4. Call AI using developer's encrypted API key
    let aiResponseText = '';
    try {
      const apiKey = decrypt(endpoint.encryptedApiKey);
      const finalMessages = messages || [{ role: 'user', content: prompt }];

      if (endpoint.model === 'claude') {
        const anthropic = new Anthropic({ apiKey });
        const msg = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: finalMessages
        });
        aiResponseText = msg.content[0].text;
      } else {
        // groq or default
        const groq = new Groq({ apiKey });
        const completion = await groq.chat.completions.create({
          model: 'llama3-8b-8192',
          messages: finalMessages,
          max_tokens: 1024
        });
        aiResponseText = completion.choices[0].message.content;
      }

      // 5. Credit developer's platform balance
      await User.findOneAndUpdate(
        { walletAddress: endpoint.ownerWallet },
        { $inc: { walletBalance: cost } }
      );

      // 6. Update endpoint stats
      await Endpoint.findByIdAndUpdate(endpoint._id, {
        $inc: { totalCalls: 1, totalEarned: cost }
      });

      // 7. Log transaction
      await Transaction.create({
        type: 'user_pay',
        userWallet: req.user.walletAddress,
        developerWallet: endpoint.ownerWallet,
        endpointId: endpoint._id,
        amountAlgo: cost,
        details: `Used endpoint "${endpoint.name}"`
      });

      res.json({
        choices: [{ message: { role: 'assistant', content: aiResponseText } }],
        cost,
        remainingBalance: updatedUser.walletBalance
      });

    } catch (aiError) {
      console.error('AI Proxy Error:', aiError);
      // Refund user if AI fails
      await User.findByIdAndUpdate(user._id, { $inc: { walletBalance: cost } });
      res.status(502).json({ error: 'AI provider failed. You have been refunded.' });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
