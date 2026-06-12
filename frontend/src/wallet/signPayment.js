import { getWalletSigner } from "./walletSignerBridge.js";
import { normalizeAccountAddress, addressesEqual } from "./addressUtils.js";
import { getDefaultAlgodServer } from "../utils/algodConfig.js";

function defaultAlgodServer() {
  return getDefaultAlgodServer();
}

async function getAlgosdk() {
  return (await import("algosdk")).default;
}

/**
 * Ensure a wallet is connected via use-wallet (opens picker if needed).
 */
export async function ensureConnectedWallet() {
  let bridge = getWalletSigner();
  if (bridge?.getActiveAddress?.()) return bridge.getActiveAddress();

  if (!bridge?.openConnectModal) {
    throw new Error(
      "Wallet signer is not ready. Refresh the page and connect a wallet (Pera, Defly, Exodus, Kibisis, or Lute)."
    );
  }

  const ok = await bridge.openConnectModal({ navigate: false });
  if (!ok) {
    throw new Error("Wallet connection cancelled.");
  }

  for (let i = 0; i < 30; i++) {
    bridge = getWalletSigner();
    const addr = bridge?.getActiveAddress?.();
    if (addr) return addr;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Wallet connected but address not ready. Wait a moment and try again.");
}

async function signTxnGroup(txns) {
  const bridge = getWalletSigner();
  if (!bridge?.signTransactions) {
    throw new Error(
      "Connect a wallet to pay — Pera, Defly, Exodus, Kibisis, or Lute."
    );
  }

  const signed = await bridge.signTransactions(txns);
  const missing = signed.findIndex((b) => !b);
  if (missing >= 0) {
    const name = bridge.getActiveWalletName?.() || "Wallet";
    throw new Error(`${name} did not sign transaction ${missing + 1}.`);
  }
  return signed;
}

function isPeraWalletContext(bridge) {
  const id = String(bridge?.getActiveWalletId?.() || "").toLowerCase();
  const name = String(bridge?.getActiveWalletName?.() || "").toLowerCase();
  return id.includes("pera") || name.includes("pera");
}

/**
 * Build + sign a payment txn with the active use-wallet provider.
 * @returns {{ signedBytes: Uint8Array, txId: string }}
 */
export async function signPaymentTransaction({
  from,
  to,
  amountMicroAlgos,
  noteStr,
  algodServer = defaultAlgodServer(),
}) {
  const bridge = getWalletSigner();
  const connected = bridge?.getActiveAddress?.();

  if (bridge?.signTransactions && connected) {
    try {
      return await signPaymentTransactionViaBridge({
        from,
        to,
        amountMicroAlgos,
        noteStr,
        algodServer,
        connected,
      });
    } catch (err) {
      if (!isPeraWalletContext(bridge)) throw err;
    }
  }

  const { peraSignPaymentTransaction, reconnectPera } = await import("./pera.js");
  await reconnectPera().catch(() => {});
  return peraSignPaymentTransaction({
    from,
    to,
    amountMicroAlgos,
    noteStr,
    algodServer,
  });
}

async function signPaymentTransactionViaBridge({
  from,
  to,
  amountMicroAlgos,
  noteStr,
  algodServer,
  connected,
}) {
  const algosdk = await getAlgosdk();
  const sender = normalizeAccountAddress(from) || connected;
  const receiver = normalizeAccountAddress(to);

  if (!sender || !algosdk.isValidAddress(sender)) {
    throw new Error("Invalid sender address.");
  }
  if (!receiver || !algosdk.isValidAddress(receiver)) {
    throw new Error("Invalid receiver address.");
  }
  if (!(await addressesEqual(sender, connected))) {
    throw new Error(
      `Payment must be signed by your connected wallet (${connected.slice(0, 6)}…${connected.slice(-4)}). Reconnect the same account in your wallet app.`
    );
  }

  const amt = Math.round(Number(amountMicroAlgos));
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new Error("Invalid payment amount.");
  }

  const algod = new algosdk.Algodv2("", algodServer.replace(/\/$/, ""), "");
  const suggestedParams = await algod.getTransactionParams().do();
  const note = noteStr ? new TextEncoder().encode(noteStr) : undefined;

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver,
    amount: amt,
    note,
    suggestedParams,
  });

  const [signedBytes] = await signTxnGroup([txn]);
  return { signedBytes, txId: txn.txID() };
}

/**
 * Sign, broadcast, and confirm an ALGO payment using any connected wallet.
 */
export async function signAndSendPayment({
  from,
  to,
  amountMicroAlgos,
  noteStr,
  algodServer = defaultAlgodServer(),
  confirmRounds = 4,
}) {
  const algosdk = await getAlgosdk();
  const server = algodServer.replace(/\/$/, "");
  const { signedBytes, txId } = await signPaymentTransaction({
    from,
    to,
    amountMicroAlgos,
    noteStr,
    algodServer: server,
  });

  const algod = new algosdk.Algodv2("", server, "");
  const submitted = await algod.sendRawTransaction(signedBytes).do();
  const submittedId = submitted?.txid ?? submitted?.txId ?? txId;
  if (!submittedId) {
    throw new Error("Network did not return a transaction id after submit.");
  }

  const rounds = Number.isFinite(confirmRounds) && confirmRounds > 0 ? confirmRounds : 4;
  await algosdk.waitForConfirmation(algod, submittedId, rounds);
  return { txId: submittedId, signedBytes };
}

/**
 * Atomic group: Payment + contract purchase() app call.
 */
export async function signAndSendContractPurchase({
  from,
  appId,
  contractAddress,
  amountMicroAlgos,
  noteStr,
  algodServer = defaultAlgodServer(),
  confirmRounds = 4,
}) {
  const algosdk = await getAlgosdk();
  const connected = await ensureConnectedWallet();
  const sender = normalizeAccountAddress(from) || connected;
  const receiver = normalizeAccountAddress(contractAddress);
  const applicationId = Number(appId);
  const amount = Math.round(Number(amountMicroAlgos));

  if (!sender || !algosdk.isValidAddress(sender)) {
    throw new Error("Invalid sender address.");
  }
  if (!receiver || !algosdk.isValidAddress(receiver)) {
    throw new Error("Invalid contract address.");
  }
  if (!(await addressesEqual(sender, connected))) {
    throw new Error("Contract purchase must be signed by your connected wallet.");
  }
  if (!Number.isSafeInteger(applicationId) || applicationId <= 0) {
    throw new Error("Invalid contract application ID.");
  }
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Invalid contract purchase amount.");
  }

  const server = algodServer.replace(/\/$/, "");
  const algod = new algosdk.Algodv2("", server, "");
  const suggestedParams = await algod.getTransactionParams().do();

  const payment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver,
    amount,
    note: noteStr ? new TextEncoder().encode(noteStr) : undefined,
    suggestedParams,
  });
  const appCall = algosdk.makeApplicationNoOpTxnFromObject({
    sender,
    appIndex: applicationId,
    appArgs: [algosdk.ABIMethod.fromSignature("purchase(pay)void").getSelector()],
    suggestedParams,
  });
  algosdk.assignGroupID([payment, appCall]);

  const signed = await signTxnGroup([payment, appCall]);
  const submitted = await algod.sendRawTransaction(signed).do();
  const txId = submitted?.txid ?? submitted?.txId;
  if (!txId) {
    throw new Error("Network did not return a transaction id after submit.");
  }

  const rounds = Number.isFinite(confirmRounds) && confirmRounds > 0 ? confirmRounds : 4;
  await algosdk.waitForConfirmation(algod, txId, rounds);
  return { txId };
}

/** Build x402 X-Payment header from already-signed payment txn bytes. */
export function buildXPaymentHeaderFromSignedBytes(signedBytes) {
  const signedB64 = Buffer.from(signedBytes).toString("base64");
  const payload = { paymentGroup: [signedB64], paymentIndex: 0 };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/** Build x402 X-Payment header bytes after signing + submitting. */
export async function buildX402PaymentHeader({
  from,
  to,
  amountMicroAlgos,
  noteStr = "Sentinel Studio overage",
  algodServer = defaultAlgodServer(),
}) {
  const { signedBytes } = await signAndSendPayment({
    from,
    to,
    amountMicroAlgos,
    noteStr,
    algodServer,
    confirmRounds: 4,
  });
  return buildXPaymentHeaderFromSignedBytes(signedBytes);
}
