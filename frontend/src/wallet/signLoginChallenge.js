import { getWalletSigner } from "./walletSignerBridge.js";
import { reconnectPera, signData as peraSignData } from "./pera.js";
import { normalizeAccountAddress } from "./addressUtils.js";

function isPeraWalletLabel(label) {
  return String(label || "").toLowerCase().includes("pera");
}

function isUnsupportedSignDataError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  return msg.includes("signdata") || msg.includes("method not supported");
}

/**
 * Sign auth challenge bytes for login / register / link-wallet.
 * Pera via @txnlab/use-wallet does not expose signData — use standalone @perawallet/connect.
 */
export async function signLoginChallenge(messageBytes, walletAddress) {
  const bridge = getWalletSigner();
  const walletLabel = bridge?.getActiveWalletName?.() || "";

  if (isPeraWalletLabel(walletLabel)) {
    await reconnectPera();
    return peraSignData(messageBytes, walletAddress);
  }

  if (typeof bridge?.signMessage === "function") {
    try {
      return await bridge.signMessage(messageBytes, walletAddress);
    } catch (err) {
      if (!isUnsupportedSignDataError(err)) throw err;
    }
  }

  await reconnectPera();
  return peraSignData(messageBytes, walletAddress);
}

/** Sync standalone Pera SDK session after use-wallet connect. */
export async function syncPeraSessionForLogin(expectedAddress) {
  const expected = normalizeAccountAddress(expectedAddress);
  if (!expected) return null;

  const reconnected = normalizeAccountAddress(await reconnectPera());
  if (reconnected && reconnected === expected) return reconnected;

  return normalizeAccountAddress(await reconnectPera());
}
