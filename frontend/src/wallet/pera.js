import { PeraWalletConnect } from "@perawallet/connect";
import { normalizeAccountAddress } from "./addressUtils.js";

export { normalizeAccountAddress, addressesEqual } from "./addressUtils.js";

const peraWallet = new PeraWalletConnect({ chainId: 416002 });
let _connectedAddress = null;

export async function reconnectPera() {
  try {
    const accounts = await peraWallet.reconnectSession();
    const first = Array.isArray(accounts) ? accounts[0] : null;
    _connectedAddress = normalizeAccountAddress(first);
    return _connectedAddress;
  } catch (err) {
    const stale =
      err?.message?.includes("Missing or invalid topic") ||
      err?.message?.includes("No matching key");
    if (stale) {
      try {
        await peraWallet.disconnect();
      } catch {
        /* ignore */
      }
    }
    _connectedAddress = null;
    return null;
  }
}

export async function connectPera() {
  try {
    const accounts = await peraWallet.connect();
    if (!accounts?.length) throw new Error("No accounts returned from Pera.");
    const addr = normalizeAccountAddress(accounts[0]);
    if (!addr) throw new Error("Could not read wallet address from Pera.");
    _connectedAddress = addr;
    return _connectedAddress;
  } catch (e) {
    if (
      e?.message?.includes("Session currently connected") || 
      e?.name === "PeraWalletConnectError" ||
      e?.message?.includes("already connected")
    ) {
      console.log("[Pera Connect] Catching active session, attempting reconnection...");
      try {
        const accounts = await peraWallet.reconnectSession();
        if (accounts && accounts.length > 0) {
          const addr = normalizeAccountAddress(accounts[0]);
          if (addr) {
            _connectedAddress = addr;
            return _connectedAddress;
          }
        }
      } catch (reconErr) {
        console.warn("[Pera Connect] Reconnection failed, forcing reset...", reconErr);
      }
      
      // Force disconnect and retry fresh connection
      await disconnectPera();
      const retryAccounts = await peraWallet.connect();
      if (!retryAccounts?.length) throw new Error("No accounts returned from Pera.");
      const addr = normalizeAccountAddress(retryAccounts[0]);
      _connectedAddress = addr;
      return _connectedAddress;
    }
    throw e;
  }
}

export async function disconnectPera() {
  try {
    await peraWallet.disconnect();
  } catch {
    /* ignore */
  } finally {
    _connectedAddress = null;
  }
}

/**
 * Prompts the Pera Wallet user to sign cryptographic challenge data
 */
export async function signData(dataBytes, address) {
  if (!peraWallet.isConnected) {
    console.log("[Pera signData] Not connected. Attempting reconnection...");
    try {
      await reconnectPera();
    } catch (err) {
      console.warn("Auto-reconnect failed:", err);
    }
  }

  if (!peraWallet.isConnected) {
    throw new Error("Pera Wallet is not connected. Please connect your wallet first.");
  }

  const signer = normalizeAccountAddress(address) ?? normalizeAccountAddress(_connectedAddress);
  if (!signer) {
    throw new Error("No signer address found. Connect Pera Wallet first.");
  }

  return await peraWallet.signData([{ data: dataBytes, message: "Sign in to SentinelAI" }], signer);
}

