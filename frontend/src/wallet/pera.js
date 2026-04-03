// Pera may return accounts as plain strings OR { address: "..." } depending on version / web.
// AlgSDK requires real Algorand address strings — otherwise you get "Address must not be null or undefined".

let _peraWallet = null;
let _connectedAddress = null;

export function normalizeAccountAddress(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const s = raw.trim();
    return s.length ? s : null;
  }
  if (typeof raw === "object" && raw !== null) {
    const a = raw.address ?? raw.addr ?? raw.publicAddress;
    if (typeof a === "string" && a.trim().length) return a.trim();
  }
  return null;
}

async function getPeraWallet() {
  if (!_peraWallet) {
    const { PeraWalletConnect } = await import("@perawallet/connect");
    _peraWallet = new PeraWalletConnect({ chainId: 416002 });
  }
  return _peraWallet;
}

export async function reconnectPera() {
  try {
    const peraWallet = await getPeraWallet();
    const accounts = await peraWallet.reconnectSession();
    const first = Array.isArray(accounts) ? accounts[0] : null;
    _connectedAddress = normalizeAccountAddress(first);
    return _connectedAddress;
  } catch {
    _connectedAddress = null;
    return null;
  }
}

export async function connectPera() {
  const peraWallet = await getPeraWallet();
  const accounts = await peraWallet.connect();
  if (!accounts?.length) throw new Error("No accounts returned from Pera.");
  const addr = normalizeAccountAddress(accounts[0]);
  if (!addr) throw new Error("Could not read wallet address from Pera.");
  _connectedAddress = addr;
  return _connectedAddress;
}

/** Compare two Algorand addresses (handles casing / encoding differences). */
export async function addressesEqual(a, b) {
  const A = normalizeAccountAddress(a);
  const B = normalizeAccountAddress(b);
  if (!A || !B) return false;
  const algosdk = (await import("algosdk")).default;
  try {
    return (
      algosdk.encodeAddress(algosdk.decodeAddress(A)) ===
      algosdk.encodeAddress(algosdk.decodeAddress(B))
    );
  } catch {
    return A === B;
  }
}

export async function disconnectPera() {
  try {
    const peraWallet = await getPeraWallet();
    await peraWallet.disconnect();
  } catch {
    /* ignore */
  } finally {
    _connectedAddress = null;
  }
}

export async function signAndSendPayment({
  from,
  to,
  amountMicroAlgos,
  noteStr,
  algodServer,
}) {
  const algosdk = (await import("algosdk")).default;

  const signer =
    normalizeAccountAddress(from) ?? normalizeAccountAddress(_connectedAddress);
  const toAddr = normalizeAccountAddress(to);
  const amt = Number(amountMicroAlgos);

  if (!signer) {
    throw new Error("No sender address. Connect Pera Wallet first.");
  }
  if (!toAddr) {
    throw new Error("Receiver address missing — check service payout wallet on the server.");
  }
  if (!algosdk.isValidAddress(signer)) {
    throw new Error("Sender is not a valid Algorand address.");
  }
  if (!algosdk.isValidAddress(toAddr)) {
    throw new Error("Receiver is not a valid Algorand address.");
  }
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new Error("Invalid payment amount.");
  }
  if (!algodServer || typeof algodServer !== "string" || !algodServer.trim()) {
    throw new Error("Algod URL missing.");
  }

  const peraWallet = await getPeraWallet();
  const algod = new algosdk.Algodv2("", algodServer.trim(), "");
  const suggestedParams = await algod.getTransactionParams().do();
  const note = noteStr ? new TextEncoder().encode(noteStr) : undefined;

  // algosdk v3+ uses `sender` / `receiver` (not `from` / `to`). Wrong keys = undefined addresses.
  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: signer,
    receiver: toAddr,
    amount: Math.round(amt),
    note,
    suggestedParams,
  });

  // Do not pass signer as 2nd arg: Pera's composeTransaction sets signers=[] when
  // signerAddress is set but txn.signers doesn't include it — with no txn.signers that
  // skips signing and causes "Group transaction does not need to be signed by Wallet user".
  const signedTxns = await peraWallet.signTransaction([[{ txn }]]);
  const submitted = await algod.sendRawTransaction(signedTxns[0]).do();
  const txid = submitted?.txid ?? submitted?.txId;
  if (!txid) {
    throw new Error("Network did not return a transaction id after submit.");
  }
  await algosdk.waitForConfirmation(algod, txid, 100);
  return { txId: txid };
}
