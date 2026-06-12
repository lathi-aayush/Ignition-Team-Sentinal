import { getWalletSigner } from "./walletSignerBridge.js";
import { reconnectPera, connectPera, signData as peraSignData } from "./pera.js";
import { normalizeAccountAddress } from "./addressUtils.js";

/** Set when user picks a wallet in the login modal (before bridge activeWallet updates). */
let loginWalletId = "";

export function setLoginWalletId(id) {
  loginWalletId = String(id || "").toLowerCase();
}

function isPeraWalletId(id) {
  return String(id || "").toLowerCase().includes("pera");
}

function isPeraContext(bridge) {
  const id = String(bridge?.getActiveWalletId?.() || loginWalletId || "").toLowerCase();
  const label = String(bridge?.getActiveWalletName?.() || "").toLowerCase();
  return isPeraWalletId(id) || label.includes("pera");
}

function isUnsupportedSignDataError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  return msg.includes("signdata") || msg.includes("method not supported");
}

/** Ensure standalone @perawallet/connect session for signData. */
export async function syncPeraSessionForLogin(expectedAddress) {
  const expected = normalizeAccountAddress(expectedAddress);
  const reconnected = normalizeAccountAddress(await reconnectPera());
  if (reconnected) {
    if (!expected || reconnected === expected) return reconnected;
  }

  const connected = normalizeAccountAddress(await connectPera());
  if (!connected) {
    throw new Error("Could not connect Pera Wallet for sign-in.");
  }
  if (expected && connected !== expected) {
    throw new Error(
      `Pera account mismatch. Expected ${expected.slice(0, 6)}…${expected.slice(-4)}, got ${connected.slice(0, 6)}…${connected.slice(-4)}.`
    );
  }
  return connected;
}

/**
 * Sign auth challenge bytes for login / register / link-wallet.
 * Pera via use-wallet does not expose signData — always use @perawallet/connect.
 */
export async function signLoginChallenge(messageBytes, walletAddress) {
  const bridge = getWalletSigner();

  if (isPeraContext(bridge)) {
    await syncPeraSessionForLogin(walletAddress);
    return peraSignData(messageBytes, walletAddress);
  }

  if (typeof bridge?.signMessage === "function") {
    try {
      return await bridge.signMessage(messageBytes, walletAddress);
    } catch (err) {
      if (!isUnsupportedSignDataError(err)) throw err;
      await syncPeraSessionForLogin(walletAddress);
      return peraSignData(messageBytes, walletAddress);
    }
  }

  await syncPeraSessionForLogin(walletAddress);
  return peraSignData(messageBytes, walletAddress);
}
