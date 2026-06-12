import { signAndSendPayment } from "./signPayment.js";
import { api } from "../api/client.js";

/** Lazy-load algosdk (~370 kB) — only when burner wallet is used. */
let algosdkModule = null;
async function getAlgosdk() {
  if (!algosdkModule) {
    algosdkModule = (await import("algosdk")).default;
  }
  return algosdkModule;
}

const LEGACY_BURNER_KEY = "burner_wallet_mnemonic";
const BURNER_KEY_PREFIX = "sentinal_burner_mnemonic:";

/** @type {string | null} */
let activeUserId = null;
/** @type {Promise<void> | null} */
let initPromise = null;
/** @type {Map<string, { addr: string, sk: Uint8Array }>} */
const accountCache = new Map();

async function cacheAccountForUser(userId) {
  const mnemonic = readLocalMnemonic(userId);
  if (!mnemonic) {
    accountCache.delete(userId);
    return null;
  }
  const acct = await mnemonicToAccount(mnemonic);
  accountCache.set(userId, acct);
  return acct;
}

export { getDefaultAlgodServer } from "../utils/algodConfig.js";

function storageKey(userId) {
  return `${BURNER_KEY_PREFIX}${userId}`;
}

function readLocalMnemonic(userId) {
  if (!userId) return null;
  const scoped = localStorage.getItem(storageKey(userId));
  if (scoped?.trim()) return scoped.trim();
  const legacy = localStorage.getItem(LEGACY_BURNER_KEY);
  if (legacy?.trim()) {
    localStorage.setItem(storageKey(userId), legacy.trim());
    localStorage.removeItem(LEGACY_BURNER_KEY);
    return legacy.trim();
  }
  return null;
}

function writeLocalMnemonic(userId, mnemonic) {
  if (!userId || !mnemonic) return;
  localStorage.setItem(storageKey(userId), mnemonic.trim());
}

async function mnemonicToAccount(mnemonic) {
  const algosdk = await getAlgosdk();
  const acct = algosdk.mnemonicToSecretKey(mnemonic.trim());
  return { addr: acct.addr.toString(), sk: acct.sk };
}

async function balanceForMnemonic(mnemonic, algodServer) {
  try {
    const { addr } = await mnemonicToAccount(mnemonic);
    const algosdk = await getAlgosdk();
    const algod = new algosdk.Algodv2("", algodServer.trim(), "");
    const info = await algod.accountInformation(addr).do();
    return Number(info.amount) || 0;
  } catch (err) {
    if (err?.status === 404 || err?.response?.status === 404 || err?.message?.includes("404")) {
      return 0;
    }
    return 0;
  }
}

/**
 * Pick the mnemonic to use when local and server disagree (keep funded wallet).
 */
function hasAuthToken() {
  return Boolean(api.defaults.headers.common.Authorization);
}

async function resolveBurnerMnemonic(userId, algodServer = getDefaultAlgodServer()) {
  const local = readLocalMnemonic(userId);
  let remote = null;
  if (hasAuthToken()) {
    try {
      const res = await api.get("/api/profile/burner");
      remote = res.data?.mnemonic?.trim() || null;
    } catch (err) {
      if (err?.response?.status !== 401) {
        console.warn("Failed to fetch burner wallet from profile:", err);
      }
    }
  }

  if (local && remote && local !== remote) {
    const [localBal, remoteBal] = await Promise.all([
      balanceForMnemonic(local, algodServer),
      balanceForMnemonic(remote, algodServer),
    ]);
    const chosen = localBal >= remoteBal ? local : remote;
    writeLocalMnemonic(userId, chosen);
    if (chosen !== remote) {
      await syncBurnerWallet(chosen, userId);
    }
    return chosen;
  }

  if (local) {
    writeLocalMnemonic(userId, local);
    if (!remote) await syncBurnerWallet(local, userId);
    return local;
  }

  if (remote) {
    writeLocalMnemonic(userId, remote);
    return remote;
  }

  return null;
}

/**
 * Load or create one stable burner wallet per user (call after login).
 */
export async function ensureBurnerWallet(userId, algodServer = getDefaultAlgodServer()) {
  if (!userId) return null;
  if (activeUserId === userId && accountCache.has(userId)) {
    return readLocalMnemonic(userId);
  }
  if (initPromise && activeUserId === userId) {
    await initPromise;
    return readLocalMnemonic(userId);
  }

  activeUserId = userId;
  initPromise = (async () => {
    let mnemonic = await resolveBurnerMnemonic(userId, algodServer);
    if (!mnemonic) {
      const algosdk = await getAlgosdk();
      const newAccount = algosdk.generateAccount();
      mnemonic = algosdk.secretKeyToMnemonic(newAccount.sk);
      writeLocalMnemonic(userId, mnemonic);
      await syncBurnerWallet(mnemonic, userId);
    }
  })();

  try {
    await initPromise;
    await cacheAccountForUser(userId);
  } finally {
    initPromise = null;
  }
  return readLocalMnemonic(userId);
}

export function clearActiveBurnerUser() {
  activeUserId = null;
  initPromise = null;
  accountCache.clear();
}

/**
 * Returns the burner account for the active user. Call ensureBurnerWallet first.
 */
export function getBurnerWallet(userId = activeUserId) {
  const uid = userId || activeUserId;
  if (!uid) {
    throw new Error("Burner wallet not ready — sign in and wait a moment, then retry.");
  }
  const cached = accountCache.get(uid);
  if (cached) return cached;
  throw new Error("Burner wallet not initialized. Refresh the page after signing in.");
}

/** @deprecated Use ensureBurnerWallet */
export async function fetchBurnerWallet(userId = activeUserId) {
  if (!userId) return null;
  return ensureBurnerWallet(userId);
}

export async function syncBurnerWallet(mnemonic, userId = activeUserId) {
  try {
    const m = (mnemonic || readLocalMnemonic(userId))?.trim();
    if (!m || !userId || !hasAuthToken()) return;
    await api.post("/api/profile/burner", { mnemonic: m });
  } catch (err) {
    if (err?.response?.status !== 401) {
      console.error("Failed to sync burner wallet to profile:", err);
    }
  }
}

export function getBurnerAddress(userId = activeUserId) {
  return getBurnerWallet(userId).addr;
}

/**
 * @param {string} [algodServer]
 * @param {string} [userId]
 * @returns {Promise<number>} microAlgos
 */
export async function getBurnerBalance(algodServer = getDefaultAlgodServer(), userId = activeUserId) {
  const account = getBurnerWallet(userId);
  const algosdk = await getAlgosdk();
  const algod = new algosdk.Algodv2("", algodServer.trim(), "");

  try {
    const accountInfo = await algod.accountInformation(account.addr).do();
    return Number(accountInfo.amount);
  } catch (err) {
    if (err?.status === 404 || err?.response?.status === 404 || err?.message?.includes("404")) {
      return 0;
    }
    throw err;
  }
}

export async function fundBurnerWallet(peraAddress, amountMicroAlgos, algodServer = getDefaultAlgodServer()) {
  const burner = getBurnerWallet();
  const { txId } = await signAndSendPayment({
    from: peraAddress,
    to: burner.addr,
    amountMicroAlgos,
    noteStr: "Fund Burner Wallet",
    algodServer,
  });
  window.dispatchEvent(new CustomEvent("walletBalanceUpdate"));
  return { txId };
}

export async function sendBurnerPayment({ to, amountMicroAlgos, noteStr, algodServer = getDefaultAlgodServer() }) {
  const burner = getBurnerWallet();
  const algosdk = await getAlgosdk();
  const algod = new algosdk.Algodv2("", algodServer.trim(), "");
  const params = await algod.getTransactionParams().do();
  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: burner.addr,
    receiver: to,
    amount: Math.max(0, amountMicroAlgos),
    note: new TextEncoder().encode(noteStr || "Sentinal workflow"),
    suggestedParams: params,
  });
  const signed = txn.signTxn(burner.sk);
  const sendResult = await algod.sendRawTransaction(signed).do();
  const txId = sendResult.txid || sendResult.txId;
  await algosdk.waitForConfirmation(algod, txId, 4);
  window.dispatchEvent(new CustomEvent("walletBalanceUpdate"));
  return { txId };
}

export async function refundBurnerWallet(peraAddress, algodServer = getDefaultAlgodServer(), userId = activeUserId) {
  const burner = getBurnerWallet(userId);
  const algosdk = await getAlgosdk();
  const algod = new algosdk.Algodv2("", algodServer.trim(), "");

  let accountInfo;
  try {
    accountInfo = await algod.accountInformation(burner.addr).do();
  } catch (err) {
    throw new Error(`Could not fetch burner balance: ${err.message}`);
  }

  const totalBalance = Number(accountInfo.amount);
  const params = await algod.getTransactionParams().do();
  const txFee = Number(params.fee) || 1000;

  if (totalBalance <= txFee) {
    throw new Error("Insufficient funds to cover network fee for refund.");
  }

  const refundAmount = totalBalance - txFee;
  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: burner.addr,
    receiver: peraAddress,
    amount: refundAmount,
    note: new TextEncoder().encode("Refund from Burner Wallet"),
    suggestedParams: params,
    closeRemainderTo: peraAddress,
  });

  const signedTxn = txn.signTxn(burner.sk);
  const sendResult = await algod.sendRawTransaction(signedTxn).do();
  const txId = sendResult.txid || sendResult.txId;
  await algosdk.waitForConfirmation(algod, txId, 4);
  window.dispatchEvent(new CustomEvent("walletBalanceUpdate"));
  return { txId };
}
