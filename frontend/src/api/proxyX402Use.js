import { api } from "./client.js";
import {
  signAndSendPayment,
  buildXPaymentHeaderFromSignedBytes,
} from "../wallet/signPayment.js";

/**
 * Proxy-authenticated x402 on POST /api/use (Bearer sk-sentinel-* required).
 * Payment is signed directly from the user's linked Pera wallet.
 */
export async function callProxyX402Use({
  apiKey,
  serviceId,
  body,
  algodServer,
  fromWallet,
}) {
  const headers = { Authorization: `Bearer ${apiKey}` };

  let challengeData;
  try {
    await api.post("/api/use", body, { headers });
    throw new Error("Expected HTTP 402 Payment Required");
  } catch (e) {
    if (e?.response?.status !== 402) {
      const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message;
      throw new Error(msg || "x402 challenge request failed");
    }
    challengeData = e.response.data;
  }

  const accept = challengeData?.accepts?.[0];
  if (!accept?.payTo || accept.maxAmountRequired == null) {
    throw new Error("Invalid x402 payment challenge from server");
  }

  const receiver = String(accept.payTo).trim();
  const amountMicroAlgos = Math.round(Number(accept.maxAmountRequired));
  if (!Number.isFinite(amountMicroAlgos) || amountMicroAlgos <= 0) {
    throw new Error("Invalid x402 charge amount from server");
  }

  const { txId, signedBytes } = await signAndSendPayment({
    from: fromWallet,
    to: receiver,
    amountMicroAlgos,
    noteStr: `x402:sentinel:${serviceId}`,
    algodServer,
  });

  const xPaymentHeader = buildXPaymentHeaderFromSignedBytes(signedBytes);

  const { data: final } = await api.post("/api/use", body, {
    headers: { ...headers, "X-Payment": xPaymentHeader },
  });

  const receipt = final?.sentinelReceipt ?? null;
  const { sentinelReceipt: _sr, ...aiResponse } = final || {};

  return { aiResponse, txId, receipt };
}
