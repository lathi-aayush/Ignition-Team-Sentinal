const express = require('express');
const router = express.Router();
const algosdk = require('algosdk');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const verifyJWT = require('../middleware/verifyJWT');
const rateLimiter = require('../middleware/rateLimiter');

// POST /api/wallet/deposit — verify an on-chain Algorand deposit and credit platform balance
router.post('/deposit', verifyJWT, rateLimiter, async (req, res) => {
  const { txID } = req.body;
  if (!txID) return res.status(400).json({ error: 'Transaction ID is required' });

  try {
    // Prevent replay attacks
    const alreadyUsed = await Transaction.findOne({ txID });
    if (alreadyUsed) return res.status(400).json({ error: 'Deposit already processed' });

    const indexerHost = process.env.ALGORAND_INDEXER || 'https://testnet-idx.algonode.cloud';
    const indexer = new algosdk.Indexer('', indexerHost, '');

    const treasuryWallet = process.env.TREASURY_WALLET;
    if (!treasuryWallet) return res.status(500).json({ error: 'Treasury wallet not configured' });

    let confirmed = false;
    let amountAlgo = 0;

    // Poll indexer for up to 30s
    for (let i = 0; i < 15; i++) {
      try {
        const txnInfo = await indexer.lookupTransactionByID(txID).do();
        const txn = txnInfo.transaction;
        const round = txn['confirmed-round'];

        if (txn['tx-type'] === 'pay' && txn['payment-transaction']) {
          const amountMicro = txn['payment-transaction'].amount;
          const receiver = txn['payment-transaction'].receiver;
          const sender = txn['sender'];

          if (round && receiver === treasuryWallet && sender === req.user.walletAddress) {
            amountAlgo = amountMicro / 1e6;
            confirmed = true;
            break;
          }
        }
      } catch (_) {}
      await new Promise(r => setTimeout(r, 2000));
    }

    if (!confirmed) return res.status(402).json({ error: 'Deposit not verified on chain' });

    // Credit platform balance
    await User.findByIdAndUpdate(req.user.userId, { $inc: { walletBalance: amountAlgo } });

    await Transaction.create({
      txID,
      type: 'deposit',
      userWallet: req.user.walletAddress,
      amountAlgo,
      details: `Deposited ${amountAlgo} ALGO`
    });

    res.json({ message: 'Deposit successful', amountAdded: amountAlgo });
  } catch (err) {
    console.error('Deposit Error:', err);
    res.status(500).json({ error: 'Failed to process deposit' });
  }
});

module.exports = router;
