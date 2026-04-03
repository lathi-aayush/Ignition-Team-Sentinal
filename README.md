# SentinelAI — Pay-per-use AI API on Algorand

## How it works

### Two roles:

**Developer**
- Connects Pera Wallet → selects "Developer" on login
- Gets a JWT with `role: developer`
- Tops up ALGO balance (sent to treasury wallet, verified on-chain)
- Generates API keys from the Developer Dashboard
- Integrates their API key into their own app via `POST /api/generate`
- Each request deducts `COST_PER_REQUEST` ALGO from their platform balance

**User**
- Connects Pera Wallet → selects "User" on login
- Gets a JWT with `role: user`
- Tops up ALGO balance (sent to treasury wallet)
- Uses a developer's app which calls `POST /api/proxy/:endpointId` with their JWT
- Each request deducts the endpoint's price from their balance → developer's balance is credited

---

## API Reference

### For Developers — call from your app:

```bash
POST /api/generate
Headers:
  x-api-key: sentinel_live_xxxxxxxxxxxx
  Content-Type: application/json

Body:
{
  "model": "groq",          # "groq" (default, fast) or "claude"
  "messages": [
    { "role": "user", "content": "Hello!" }
  ]
}

Response:
{
  "choices": [{ "message": { "role": "assistant", "content": "..." } }],
  "cost": 0.01,
  "remainingBalance": 4.99
}
```

### For Users — call from developer's app:

```bash
POST /api/proxy/:endpointId
Headers:
  Authorization: Bearer <user_jwt>
  Content-Type: application/json

Body:
{
  "prompt": "Summarize this for me...",
  # OR use messages array:
  "messages": [{ "role": "user", "content": "..." }]
}
```

---

## Setup

### Server
```bash
cd server
cp .env.example .env   # fill in your values
npm install
npm run dev
```

### Client
```bash
cd client
cp .env.example .env   # fill in your values
npm install
npm run dev
```

---

## Payment Flow

```
User/Dev → Pera Wallet → signs ALGO tx to TREASURY_WALLET
        → sends txID to POST /api/wallet/deposit
        → server polls Algorand Indexer to verify
        → platform balance credited in MongoDB
        → all future API calls deduct from this balance (no wallet popup per request)
```

---

## Environment Variables

### Server `.env`
| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `TREASURY_WALLET` | Your Algorand wallet address (receives deposits) |
| `GROQ_API_KEY` | Groq API key for fast inference |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `ENCRYPTION_KEY` | 32-char key for encrypting developer API keys in DB |
| `COST_PER_REQUEST` | ALGO cost per `/api/generate` call (default: 0.01) |

### Client `.env`
| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend URL e.g. `http://localhost:5000/api` |
| `VITE_TREASURY_WALLET` | Same as server `TREASURY_WALLET` |
