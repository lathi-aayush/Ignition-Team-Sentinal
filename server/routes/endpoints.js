const express = require('express');
const router = express.Router();
const Endpoint = require('../models/Endpoint');
const verifyJWT = require('../middleware/verifyJWT');
const { encrypt } = require('../services/encryption');

// Consumer: Get all active endpoints to display in Marketplace
router.get('/', async (req, res) => {
  try {
    const endpoints = await Endpoint.find({ isActive: true })
      .select('ownerWallet name description model priceAlgo totalCalls')
      .lean();
    res.json(endpoints);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch endpoints' });
  }
});

// Owner: Get endpoints owned by me
router.get('/my', verifyJWT, async (req, res) => {
  try {
    if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only owners can view this' });
    const endpoints = await Endpoint.find({ ownerId: req.user.userId }).lean();
    // NEVER RETURN ENCRYPTED KEYS TO CLIENT (or at least no reason to)
    const sanitized = endpoints.map(e => {
        delete e.encryptedApiKey;
        return e;
    });
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your endpoints' });
  }
});

// Consumer: Get details of a single endpoint
router.get('/:id', async (req, res) => {
    try {
      const endpoint = await Endpoint.findById(req.params.id)
        .select('ownerWallet name description model priceAlgo')
        .lean();
      if (!endpoint) return res.status(404).json({ error: 'Endpoint not found' });
      res.json(endpoint);
    } catch (err) {
      res.status(500).json({ error: 'Failed' });
    }
});

// Owner: Create new endpoint
router.post('/', verifyJWT, async (req, res) => {
  try {
    if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only owners can create endpoints' });
    
    const { name, description, model, apiKey, priceAlgo } = req.body;
    
    if (!name || !model || !apiKey || !priceAlgo) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const newEndpoint = await Endpoint.create({
      ownerId: req.user.userId,
      ownerWallet: req.user.walletAddress,
      name,
      description,
      model,
      encryptedApiKey: encrypt(apiKey), // AES-256 encrypt!
      priceAlgo: parseFloat(priceAlgo)
    });

    res.status(201).json({ message: 'Endpoint created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create endpoint' });
  }
});

// Owner: Toggle Active Status
router.patch('/:id/toggle', verifyJWT, async (req, res) => {
    try {
        if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only owners can edit endpoints' });
        
        const endpoint = await Endpoint.findOne({ _id: req.params.id, ownerId: req.user.userId });
        if (!endpoint) return res.status(404).json({ error: 'Not found' });

        endpoint.isActive = !endpoint.isActive;
        await endpoint.save();
        res.json({ success: true, isActive: endpoint.isActive });
    } catch (err) {
        res.status(500).json({ error: 'Failed to toggle status' });
    }
});

module.exports = router;
