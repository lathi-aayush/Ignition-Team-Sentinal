# SentinelAI — Pay-per-use AI API on Algorand

## Product story

A developer runs their **own** LLM or AI backend (any provider that speaks HTTP and uses an API key). They want to make it **public** and **monetize** it without building billing, wallets, or usage accounting themselves.

**Sentinal is not a chat app.** There is no “product chatbot” in the web client. The web UI is for **wallets, dashboards, and listing endpoints**. End users integrate **from their own apps** by calling Sentinal’s HTTP API.

**How monetization maps to the product:**

1. The developer connects a wallet, tops up a **prepaid platform balance** (ALGO to treasury, verified on-chain), and registers their model in **Endpoints & earnings** (`/creator-endpoints`): name, price per call, model type, and **their** provider API key. The key is **encrypted at rest**; consumers never see it.
2. Sentinal exposes a stable **`POST /api/proxy/:endpointId`** URL. Each **consumer** (role `user`) has their own JWT and prepaid balance. When they call the proxy, Sentinal forwards the request to the developer’s backend using the stored credential, then runs a **ledger split**: **debit the caller’s balance** by the endpoint price and **credit the developer’s balance** — like usage-based revenue: the more people call the endpoint, the more ALGO credits accrue on the creator’s account (similar in spirit to “more views → more revenue,” but per API call).
3. **Per-user metering** does not mean cloning the developer’s API key for every user. There is **one encrypted provider key per endpoint**; **attribution** is done by **JWT + server-side accounting** (each proxied call is tied to the authenticated consumer and recorded). That is how Sentinal tracks **per-user API usage** and billing safely.

**Also on the creator dashboard:** **Create API key** generates **Sentinel platform keys** (`sentinel_live_…`) for **`POST /api/generate`**, which uses Sentinal-hosted models (Groq / Claude) and charges **`COST_PER_REQUEST`** against the **developer’s** balance. That path is separate from publishing **your own** LLM via marketplace endpoints.

---

## How it works

### Two roles:

**Developer (creator)**
- Connects Pera Wallet → selects "Developer" on login
- Gets a JWT with `role: developer`
- Tops up ALGO balance (sent to treasury wallet, verified on-chain)
- **Monetize your LLM:** create a marketplace **endpoint** from **Endpoints & earnings** (`/creator-endpoints`) or `POST /api/endpoints` — set price and your provider API key (stored encrypted)
- **Optional — Sentinal-hosted inference:** generate a **Sentinel API key** on the creator dashboard and call `POST /api/generate`; each request deducts `COST_PER_REQUEST` ALGO from that developer’s platform balance

**User (consumer of a creator’s endpoint)**
- Connects Pera Wallet → selects "User" on login
- Gets a JWT with `role: user`
- Tops up ALGO balance (sent to treasury wallet)
- From **any HTTP client or app**, calls `POST /api/proxy/:endpointId` with `Authorization: Bearer <user_jwt>`
- Each request **deducts the endpoint price from the user’s prepaid platform balance** and **credits the creator’s platform balance** — not a separate on-chain payment per request; only **treasury deposits** are verified on-chain via Algorand

*(The repo includes an optional demo page at `/chat/:endpointId` for trying a proxy in the browser; production use is API-to-API, not chat-as-product.)*

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

### For consumers — call from your app (creator’s published endpoint):

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

### Creator analytics (marketplace)

- `GET /api/developer/analytics` — JWT with `role: developer`
- Returns aggregate stats (earnings, call counts, active endpoints), recent `user_pay` transactions (last 7 days), and endpoint list for the logged-in creator

The web UI for this lives at **`/creator-endpoints`** (linked from the creator dashboard).

---

## Setup

Run the **API** and **web UI** from `backend` and `frontend` (defaults: API on port **5000**, Vite on **5173** with `/api` proxied to the API).

### Backend
```bash
cd backend
# Create backend/.env with MONGO_URI, JWT_SECRET, TREASURY_WALLET, etc.
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

By default the app uses the Vite dev proxy (`vite.config.js`): browser calls go to `/api` on port 5173 and are forwarded to `http://localhost:5000`. Optionally set `VITE_API_URL` in `frontend/.env` if you serve the API on another origin.

If empty `client` or `server` folders still appear at the repo root, close this workspace (or stop any process using them) and delete those folders manually—they are leftovers from an older layout.

---

## Payment Flow

```
User/Dev → Pera Wallet → signs ALGO tx to TREASURY_WALLET
        → sends txID to POST /api/wallet/deposit
        → server polls Algorand Indexer to verify
        → platform balance credited in MongoDB
        → all future API calls deduct from this balance (no wallet popup per request)
```

**Marketplace inference** (proxy API) always uses this **prepaid balance** plus **JWT**; users do not pay the creator’s wallet address directly in a second transaction for each call.

---

## Environment Variables

### Backend `.env`
| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `TREASURY_WALLET` | Your Algorand wallet address (receives deposits) |
| `GROQ_API_KEY` | Groq API key for fast inference |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `ENCRYPTION_KEY` | 32-char key for encrypting developer API keys in DB |
| `COST_PER_REQUEST` | ALGO cost per `/api/generate` call (default: 0.01) |

### Frontend `.env`
| Variable | Description |
|---|---|
| `VITE_API_URL` | Optional full API origin (e.g. `http://localhost:5000`). If unset, requests use relative `/api` and the Vite proxy applies. |
| `VITE_TREASURY_WALLET` | Same as backend `TREASURY_WALLET` (if used by the UI) |
