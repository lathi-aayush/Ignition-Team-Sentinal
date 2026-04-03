import algosdk from "algosdk";

let indexerClient;

function getIndexerServer() {
  return (
    process.env.INDEXER_SERVER ||
    process.env.ALGORAND_INDEXER ||
    "https://testnet-idx.algonode.cloud"
  ).replace(/\/$/, "");
}

function getIndexer() {
  if (!indexerClient) {
    indexerClient = new algosdk.Indexer("", getIndexerServer(), "");
  }
  return indexerClient;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Same idea as ppu-ai walletController: indexerClient.lookupTransactionByID(txId).do()
 * with retries while the tx propagates to the indexer (avoids immediate verify failures).
 */
export async function lookupTransactionByIDWithRetry(
  txId,
  { tries = 12, delayMs = 1500 } = {}
) {
  const client = getIndexer();
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await client.lookupTransactionByID(txId).do();
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || "").toLowerCase();
      const notFound =
        msg.includes("404") ||
        msg.includes("not found") ||
        e?.status === 404 ||
        e?.response?.status === 404;
      if (!notFound) throw e;
      if (i < tries - 1) await sleep(delayMs);
    }
  }
  throw lastErr ?? new Error("Transaction not indexed yet");
}

/**
 * Defensive parsing like ppu-ai walletController (tx-type / snd / rcv / amt).
 */
export function parsePaymentFromIndexer(txInfo) {
  const tx = txInfo?.transaction ?? txInfo;
  if (!tx) return null;
  const txType = tx["tx-type"] ?? tx.txType;
  if (txType !== "pay") return null;
  const payment = tx["payment-transaction"] ?? tx.paymentTransaction;
  if (!payment) return null;
  const sender = tx.sender ?? tx.snd;
  const receiver = payment.receiver ?? payment.rcv;
  const amount = Number(payment.amount ?? payment.amt ?? 0);
  const note = tx.note;
  return { sender, receiver, amount, note };
}

export function normalizeAlgoAddress(addr) {
  if (!addr || typeof addr !== "string") return addr;
  try {
    return algosdk.encodeAddress(algosdk.decodeAddress(addr.trim()));
  } catch {
    return addr.trim();
  }
}

export function algoToMicroAlgos(algo) {
  return Math.round(Number(algo) * 1e6);
}

export function decodeNote(noteField) {
  if (!noteField) return "";
  try {
    const buf = Buffer.from(noteField, "base64");
    return buf.toString("utf8");
  } catch {
    return "";
  }
}
