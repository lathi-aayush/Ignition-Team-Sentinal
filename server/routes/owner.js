const express = require('express');
const router = express.Router();
const Endpoint = require('../models/Endpoint');
const Transaction = require('../models/Transaction');
const verifyJWT = require('../middleware/verifyJWT');

router.get('/analytics', verifyJWT, async (req, res) => {
    try {
        if (req.user.role !== 'owner') return res.status(403).json({ error: 'Owner access required' });

        const endpoints = await Endpoint.find({ ownerId: req.user.userId }).lean();
        const endpointIds = endpoints.map(e => e._id);

        let totalEarned = 0;
        let totalCalls = 0;
        let activeEndpoints = 0;

        endpoints.forEach(e => {
            totalEarned += e.totalEarned;
            totalCalls += e.totalCalls;
            if (e.isActive) activeEndpoints++;
        });

        // Get past 7 days of transactions for chart
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const transactions = await Transaction.find({
            endpointId: { $in: endpointIds },
            timestamp: { $gte: sevenDaysAgo }
        }).sort({ timestamp: -1 }).populate('endpointId', 'name').lean();

        res.json({
            stats: {
                totalEarned,
                totalCalls,
                activeEndpoints
            },
            transactions,
            endpoints
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

module.exports = router;
