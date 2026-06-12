import { PeraWalletConnect } from "@perawallet/connect";
import { normalizeAccountAddress, addressesEqual } from "./addressUtils.js";

export { normalizeAccountAddress, addressesEqual } from "./addressUtils.js";

const peraWallet = new PeraWalletConnect({ chainId: 416002 });
let _connectedAddress = null;

/** Pera returns Uint8Array[] (one entry per txn in the group). */
function extractPeraSignedBytes(result) {
  if (!Array.isArray(result) || !result.length) return null;
  const first = result[0];
  if (first instanceof Uint8Array) return first;
  if (Array.isArray(first) && first[0] instanceof Uint8Array) return first[0];
  return null;
}

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

  try {
    return await peraWallet.signData(
      [{ data: dataBytes, message: "Sign in to SentinelAI" }],
      signer
    );
  } catch (err) {
    const msg = String(err?.message || err || "Unknown error");
    if (/reject|cancel|denied|closed/i.test(msg)) {
      throw new Error("Sign-in cancelled in Pera Wallet.");
    }
    throw new Error(`Pera Wallet could not sign: ${msg}`);
  }
}

async function ensurePeraSessionForPayment(expectedAddress) {
  const expected = normalizeAccountAddress(expectedAddress);
  const reconnected = normalizeAccountAddress(await reconnectPera());
  if (reconnected) {
    if (!expected || (await addressesEqual(reconnected, expected))) {
      _connectedAddress = reconnected;
      return reconnected;
    }
  }

  const connected = normalizeAccountAddress(await connectPera());
  if (!connected) {
    throw new Error("Connect Pera Wallet to send ALGO.");
  }
  if (expected && !(await addressesEqual(connected, expected))) {
    throw new Error(
      `Pera account mismatch. Expected ${expected.slice(0, 6)}…${expected.slice(-4)}, got ${connected.slice(0, 6)}…${connected.slice(-4)}.`
    );
  }
  _connectedAddress = connected;
  return connected;
}

/**
 * Sign a payment txn via standalone Pera (for users who logged in without use-wallet active).
 * @returns {{ signedBytes: Uint8Array, txId: string }}
 */
export async function peraSignPaymentTransaction({
  from,
  to,
  amountMicroAlgos,
  noteStr,
  algodServer,
}) {
  const sender = normalizeAccountAddress(from) ?? normalizeAccountAddress(_connectedAddress);
  const resolvedSender = await ensurePeraSessionForPayment(sender);
  if (!peraWallet.isConnected) {
    throw new Error("Connect Pera Wallet to send ALGO.");
  }

  const algosdk = (await import("algosdk")).default;
  const server = String(algodServer || "").trim().replace(/\/$/, "");
  const receiver = normalizeAccountAddress(to);

  if (!resolvedSender || !algosdk.isValidAddress(resolvedSender)) {
    throw new Error("Invalid sender address.");
  }
  if (!receiver || !algosdk.isValidAddress(receiver)) {
    throw new Error("Invalid receiver address.");
  }

  const amt = Math.round(Number(amountMicroAlgos));
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new Error("Invalid payment amount.");
  }

  const algod = new algosdk.Algodv2("", server, "");
  const suggestedParams = await algod.getTransactionParams().do();
  const note = noteStr ? new TextEncoder().encode(noteStr) : undefined;

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: resolvedSender,
    receiver,
    amount: amt,
    note,
    suggestedParams,
  });

  let signedGroups;
  try {
    signedGroups = await peraWallet.signTransaction(
      [[{ txn, signers: [resolvedSender] }]],
      resolvedSender
    );
  } catch (err) {
    const msg = String(err?.message || err || "Unknown error");
    if (/reject|cancel|denied|closed/i.test(msg)) {
      throw new Error("Payment cancelled in Pera Wallet.");
    }
    throw new Error(`Pera Wallet could not sign: ${msg}`);
  }

  const signedBytes = extractPeraSignedBytes(signedGroups);
  if (!signedBytes) {
    throw new Error("Pera Wallet did not return signed transaction bytes.");
  }

  return { signedBytes, txId: txn.txID() };
}

