require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const developerRoutes = require('./routes/developer');
const generateRoutes = require('./routes/generate');
const walletRoutes = require('./routes/wallet');
const proxyRoutes = require('./routes/proxy');
const endpointRoutes = require('./routes/endpoints');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Auth (wallet signature login)
app.use('/api/auth', authRoutes);

// Developer portal — API keys, balance, dashboard
app.use('/api/developer', developerRoutes);

// Developer's API gateway — called by developer's own app with x-api-key
// Deducts from developer's platform balance
app.use('/api/generate', generateRoutes);

// Wallet top-up — shared for both developers and users
app.use('/api/wallet', walletRoutes);

// Endpoint marketplace — developers publish AI endpoints
app.use('/api/endpoints', endpointRoutes);

// User proxy — end-users call developer endpoints, pay from their balance to developer
app.use('/api/proxy', proxyRoutes);

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`SentinelAI server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error('Database connection error:', err));
