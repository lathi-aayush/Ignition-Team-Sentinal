import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../api/client.js";
import { callProxyX402Use } from "../api/proxyX402Use.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useWalletAction } from "../hooks/useWalletAction.js";
import GuestConnectBanner from "../components/GuestConnectBanner.jsx";
import { getPublicApiBase } from "../utils/apiBase.js";
import { shortenWallet } from "../components/UserLiveWalletBar.jsx";
import {
  addressesEqual,
  connectPera,
  normalizeAccountAddress,
  reconnectPera,
} from "../wallet/pera.js";
import { signAndSendPayment } from "../wallet/signPayment.js";
import { chargeForTokens, wordsToApproxTokens } from "../utils/tokenPricing.js";
import { useTokenEstimate } from "../hooks/useTokenEstimate.js";
import { getBurnerWallet } from "../wallet/burner.js";
import { StarRating } from "../components/MarketplaceCard.jsx";
import { testnetTxUrl } from "../utils/explorer.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ServiceDetail() {
  const { id } = useParams();
  const { user, logout, burnerReady, isAuthenticated } = useAuth();
  const { runWithWallet } = useWalletAction();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [algodServer, setAlgodServer] = useState("https://testnet-api.algonode.cloud");
  const [prompt, setPrompt] = useState("");
  const [invokeBusy, setInvokeBusy] = useState(false);
  const [costAck, setCostAck] = useState(false);
  /** @type {null | 'quoting' | 'sign' | 'confirming_chain' | 'release' | 'done' | 'error'} */
  const [payStage, setPayStage] = useState(null);
  const [payError, setPayError] = useState(null);
  const [lastTxId, setLastTxId] = useState(null);
  const [aiPreview, setAiPreview] = useState(null);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [quotedCharge, setQuotedCharge] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const apiBase = getPublicApiBase();

  const ppt = Number(service?.pricePerThousandTokens);
  const minC = Number(service?.minimumChargeAlgo);

  const promptWordCount = useMemo(() => {
    const w = prompt.trim().split(/\s+/).filter(Boolean).length;
    return w;
  }, [prompt]);

  const localInputTokenEstimate = useMemo(() => wordsToApproxTokens(promptWordCount), [promptWordCount]);

  const localEstimateAlgo = useMemo(() => {
    if (!service || !Number.isFinite(ppt) || !Number.isFinite(minC)) return null;
    if (localInputTokenEstimate <= 0) return null;
    return chargeForTokens(localInputTokenEstimate, ppt, minC);
  }, [service, ppt, minC, localInputTokenEstimate]);

  const { estimatedAlgo, minApplies } = useTokenEstimate(prompt, ppt, minC);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data: svc }, { data: net }] = await Promise.all([
          api.get(`/api/services/${id}`),
          api.get("/api/public/network").catch(() => ({})),
        ]);
        if (!cancelled) {
          setService(svc);
          if (net?.algodServer) setAlgodServer(net.algodServer);
        }
      } catch {
        toast.error("Service not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function loadReviews() {
    if (!id) return;
    setReviewsLoading(true);
    try {
      const { data } = await api.get(`/api/reviews/${id}`);
      setReviews(Array.isArray(data) ? data : []);
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, [id]);

  useEffect(() => {
    if (!id || !/^[a-f0-9]{24}$/i.test(id) || !isAuthenticated) {
      setApiKey(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/api/access/${id}`);
        const existing = Array.isArray(data) ? data[0]?.key : null;
        if (!cancelled && existing) setApiKey(existing);
      } catch {
        /* no key yet */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated, user?.walletAddress]);

  async function submitReview(e) {
    e.preventDefault();
    if (!user) {
      toast.error("Sign in to leave a review");
      return;
    }
    setSubmittingReview(true);
    try {
      const { data } = await api.post("/api/reviews", {
        serviceId: id,
        rating: reviewRating,
        reviewText: reviewText.trim(),
      });
      if (data?.averageRating != null) {
        setService((prev) =>
          prev
            ? {
                ...prev,
                averageRating: data.averageRating,
                reviewCount: data.reviewCount,
              }
            : prev
        );
      }
      await loadReviews();
      setShowReviewModal(false);
      setReviewText("");
      toast.success("Review saved");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Could not save review");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function generateKey() {
    if (!id || !/^[a-f0-9]{24}$/i.test(id)) {
      toast.error("Invalid service");
      return;
    }
    setGenerating(true);
    try {
      const { data } = await api.post("/api/access/generate", { serviceId: id });
      if (data?.key) {
        setApiKey(data.key);
        setShowKeyModal(true);
        toast.success("Proxy key ready");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || "Could not generate key");
    } finally {
      setGenerating(false);
    }
  }

  function handleCopyKey() {
    if (!apiKey) return;
    navigator.clipboard
      .writeText(apiKey)
      .then(() => toast.success("Copied"))
      .catch(() => toast.error("Copy failed"));
  }

  function handleCopySnippet() {
    if (!apiKey) return;
    if (service?.x402Enabled) {
      const snippet = `# x402 via proxy API (Bearer required):
# 1) POST /api/use without X-Payment → HTTP 402 + payment requirements
curl -sS "${apiBase}/api/use" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"Hello"}'

# 2) Sign ALGO payment, submit on-chain, retry with X-Payment header
curl -sS "${apiBase}/api/use" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -H "X-Payment: <BASE64_EXACT_AVM_PAYLOAD>" \\
  -d '{"prompt":"Hello"}'`;
      navigator.clipboard.writeText(snippet).then(() => toast.success("x402 cURL copied"));
      return;
    }
    const snippet = `# 1) Quote (no txId) — returns paymentRef + chargeAlgo
curl -sS "${apiBase}/api/use" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"Hello"}'

# 2) Pay that exact ALGO to developerWallet with paymentRef in note, then complete:
curl -sS "${apiBase}/api/use" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"txId":"<YOUR_TX_ID>","paymentRef":"<UUID_FROM_QUOTE>"}'`;
    navigator.clipboard.writeText(snippet).then(() => toast.success("cURL copied"));
  }

  async function runPaidInvoke() {
    if (!apiKey || !service || !prompt.trim()) {
      toast.error("Enter a prompt and ensure you have a proxy key");
      return;
    }
    if (!costAck) {
      toast.error("Confirm you understand pricing to continue");
      return;
    }
    const sessionWallet = normalizeAccountAddress(user?.walletAddress);
    if (!sessionWallet) {
      toast.error("Session missing wallet");
      return;
    }
    const to = normalizeAccountAddress(service.creatorWallet);
    if (!to) {
      toast.error("Invalid developer wallet on this service");
      return;
    }

    setInvokeBusy(true);
    setPayError(null);
    setAiPreview(null);
    setLastTxId(null);
    setLastReceipt(null);
    setQuotedCharge(null);
    setPayStage("quoting");

    try {
      if (service.x402Enabled) {
        if (!burnerReady) {
          throw new Error("Burner wallet is still loading. Wait a moment and try again.");
        }
        setQuotedCharge(Number(service.minimumChargeAlgo) || null);
        setPayStage("sign");
        const burnerWallet = getBurnerWallet();
        const { aiResponse, txId, receipt } = await callProxyX402Use({
          apiKey,
          serviceId: service._id,
          body: { prompt: prompt.trim() },
          algodServer,
          burnerWallet,
        });
        setLastTxId(txId);
        setLastReceipt(receipt || null);
        setPayStage("done");
        const text =
          aiResponse?.choices?.[0]?.message?.content ??
          aiResponse?.message?.content ??
          JSON.stringify(aiResponse);
        setAiPreview(typeof text === "string" ? text : String(text));
        toast.success("x402 payment verified — AI response ready");
        return;
      }

      const { data: quote } = await api.post(
        "/api/use",
        { prompt: prompt.trim() },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );

      if (!quote?.awaitingPayment || !quote.paymentRef) {
        throw new Error("Unexpected quote response from server");
      }

      const micro = Number(quote.expectedMicroAlgos);
      const charge = Number(quote.chargeAlgo);
      if (!Number.isFinite(micro) || micro <= 0) {
        throw new Error("Invalid charge from server");
      }

      setQuotedCharge(charge);
      setPayStage("sign");

      if (!burnerReady) {
        throw new Error("Burner wallet is still loading. Wait a moment and try again.");
      }
      const burnerWallet = getBurnerWallet();
      const algosdk = (await import("algosdk")).default;
      const algod = new algosdk.Algodv2("", algodServer.trim(), "");
      let burnerBalanceInfo;
      try {
        burnerBalanceInfo = await algod.accountInformation(burnerWallet.addr).do();
      } catch (e) {
        throw new Error("Burner wallet has zero balance. Please click 'Manage' > 'Fund' in the top bar.");
      }

      const params = await algod.getTransactionParams().do();
      const txFee = Number(params.fee) || 1000;
      
      if (Number(burnerBalanceInfo.amount) < micro + txFee) {
        throw new Error(`Burner wallet does not have enough funds for this request. Required: ${(micro + txFee) / 1000000} ALGO. Please click 'Manage' > 'Fund' in the top bar.`);
      }

      const note = new TextEncoder().encode(quote.paymentRef);
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: burnerWallet.addr,
        receiver: to,
        amount: Math.round(micro),
        note,
        suggestedParams: params,
      });

      const signedTxn = txn.signTxn(burnerWallet.sk);
      const submitted = await algod.sendRawTransaction(signedTxn).do();
      const txId = submitted?.txid ?? submitted?.txId;
      if (!txId) {
        throw new Error("Network did not return a transaction id after submit.");
      }
      await algosdk.waitForConfirmation(algod, txId, 4);

      setLastTxId(txId);
      setPayStage("confirming_chain");
      await sleep(3000);

      setPayStage("release");
      const { data: final } = await api.post(
        "/api/use",
        { txId, paymentRef: quote.paymentRef },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );

      const receipt = final?.sentinelReceipt;
      const { sentinelReceipt: _sr, ...aiShape } = final || {};
      const text =
        aiShape?.choices?.[0]?.message?.content ??
        aiShape?.message?.content ??
        JSON.stringify(aiShape);
      setAiPreview(typeof text === "string" ? text : String(text));
      setLastReceipt(receipt || null);
      setPayStage("done");
      toast.success("AI response ready");
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || "Request failed";
      setPayError(msg);
      setPayStage("error");
      toast.error(typeof msg === "string" ? msg : "Request failed");
    } finally {
      setInvokeBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="pt-4 pb-8 w-full flex items-center justify-center min-h-[40vh]">
        <p className="text-on-surface-variant animate-pulse">Loading service…</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="pt-4 pb-8 w-full flex flex-col items-center justify-center gap-4 min-h-[40vh]">
        <p className="text-on-surface-variant">Service not found.</p>
        <Link to="/marketplace/browse" className="text-sm text-secondary hover:underline">
          ← Back to Marketplace
        </Link>
      </div>
    );
  }

  const canProxy = service.providerConfigured === true;
  const x402Enabled = Boolean(service.x402Enabled);
  const devShort = shortenWallet(service.creatorWallet);

  return (
    <div className="font-body text-on-surface pt-4 pb-8 w-full">
      <Link to="/marketplace/browse" className="text-sm text-secondary hover:underline">
        ← Marketplace
      </Link>

      <div className="mt-4 pb-4">
        <h1 className="font-headline text-3xl font-semibold text-primary">{service.title}</h1>
        <div className="mt-3">
          <StarRating rating={service.averageRating} reviewCount={service.reviewCount} size="lg" />
        </div>
        <p className="mt-4 text-on-surface-variant leading-relaxed">{service.description}</p>

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <span className="px-3 py-1 rounded-md bg-white border border-surface-variant">
            Provider: <strong>{service.aiProvider ?? "—"}</strong>
          </span>
          <span className="px-3 py-1 rounded-md bg-white border border-surface-variant font-mono text-xs">
            {service.modelName || "—"}
          </span>
          <span className="px-3 py-1 rounded-md bg-white border border-surface-variant">
            Calls: <strong>{service.totalUses ?? 0}</strong>
          </span>
          {x402Enabled && (
            <span className="px-3 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
              x402 via proxy
            </span>
          )}
          {service.creatorWallet && (
            <span className="px-3 py-1 rounded-md bg-white border border-surface-variant">
              Creator:{" "}
              <Link
                to={`/marketplace/creators/${encodeURIComponent(service.creatorWallet)}`}
                className="text-secondary hover:underline font-medium"
              >
                {devShort}
              </Link>
            </span>
          )}
        </div>

        <div className="mt-8 p-6 bg-white border border-surface-variant rounded-md editorial-shadow space-y-6">
          <div>
            <p className="text-sm text-on-surface-variant">Pay per token (input + output), with a minimum per call</p>
            <p className="font-mono text-lg font-semibold text-secondary mt-1">
              {Number.isFinite(ppt) ? ppt.toFixed(6) : "—"} ALGO / 1k tokens
            </p>
            <p className="text-xs text-on-surface-variant mt-1 font-mono">
              Min per paid call: {Number.isFinite(minC) ? `${minC.toFixed(6)} ALGO` : "—"} · Paid to {devShort}
            </p>
          </div>

          {!canProxy && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              This listing is not wired to a live model yet. Ask the creator to republish with a provider key.
            </p>
          )}

          {!isAuthenticated && (
            <GuestConnectBanner
              message="Connect Pera Wallet to get an API key and call this service."
              className="mb-4"
            />
          )}

          <div className="border-t border-surface-variant pt-6">
            <p className="text-sm text-on-surface-variant mb-3">
              Generate a <code className="font-mono text-xs">sk-sentinel-…</code> proxy key.{" "}
              {x402Enabled
                ? `Calls use x402 on POST /api/use (${Number.isFinite(minC) ? minC.toFixed(6) : "min"} ALGO per call).`
                : "Each call: quote → pay on-chain → complete to unlock the AI response."}
            </p>
            <button
              type="button"
              disabled={generating || !canProxy}
              onClick={() => runWithWallet(() => generateKey())}
              className="w-full sm:w-auto bg-primary text-white px-8 py-3 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
            >
              {generating ? "Working…" : isAuthenticated ? "Get proxy API key" : "Connect wallet to get API key"}
            </button>
          </div>

          {apiKey && canProxy && (
            <div className="border-t border-surface-variant pt-6 space-y-4">
              <h2 className="font-semibold text-primary">
                {x402Enabled ? "Try this API (x402)" : "Try this API"}
              </h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Enter your prompt…"
                className="w-full border border-outline-variant rounded-md px-3 py-2 text-sm"
              />
              <label className="flex items-start gap-2 text-sm text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={costAck}
                  onChange={(e) => setCostAck(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I understand each call charges from my burner wallet
                  {x402Enabled && Number.isFinite(minC) ? ` (min ${minC.toFixed(6)} ALGO)` : ""}.
                </span>
              </label>
              <button
                type="button"
                disabled={invokeBusy || !prompt.trim()}
                onClick={runPaidInvoke}
                className="bg-secondary text-on-secondary px-6 py-2.5 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {invokeBusy ? "Processing…" : x402Enabled ? "Run with x402" : "Run paid invoke"}
              </button>
              {aiPreview && (
                <div className="mt-4 p-4 bg-surface-container rounded-md border border-outline-variant">
                  <p className="text-xs font-semibold text-on-surface-variant mb-2">AI response</p>
                  <p className="text-sm whitespace-pre-wrap">{aiPreview}</p>
                  {lastTxId && (
                    <p className="mt-3 text-xs text-on-surface-variant font-mono">
                      Payment tx:{" "}
                      <a
                        href={testnetTxUrl(lastTxId)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        {lastTxId.slice(0, 10)}…
                      </a>
                      {lastReceipt?.paymentProtocol === "x402" ? " (x402)" : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {apiKey && canProxy && (
            <div className="border-t border-surface-variant pt-6 space-y-4">
              <h2 className="font-semibold text-primary">Studio Chat</h2>
              <p className="text-sm text-on-surface-variant">
                Open this service in Sentinal Studio for a full chat experience.
              </p>
              <Link
                to={`/studio/chat?serviceId=${service._id}`}
                className="inline-flex items-center gap-2 border border-outline-variant px-6 py-2.5 rounded-md text-sm font-medium hover:bg-slate-50"
              >
                <span className="material-symbols-outlined text-[20px]">chat</span>
                Open in Studio Chat
              </Link>
            </div>
          )}
        </div>

        <section className="mt-8 p-6 bg-white border border-surface-variant rounded-md editorial-shadow">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold text-primary">Reviews</h2>
            <button
              type="button"
              onClick={() => runWithWallet(() => setShowReviewModal(true))}
              className="text-sm bg-secondary text-on-secondary px-4 py-2 rounded-md hover:opacity-90"
            >
              Write a review
            </button>
          </div>
          {reviewsLoading ? (
            <p className="text-sm text-on-surface-variant">Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No reviews yet. Be the first to share feedback.</p>
          ) : (
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li key={r.id} className="border-b border-surface-variant pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    {r.photoURL ? (
                      <img src={r.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold">
                        {(r.displayName || r.userWallet || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {r.displayName || shortenWallet(r.userWallet)}
                      </p>
                      <StarRating rating={r.rating} showCount={false} />
                    </div>
                  </div>
                  {r.reviewText ? (
                    <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">{r.reviewText}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {showKeyModal && apiKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-md border border-surface-variant p-8 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-headline text-xl font-semibold text-primary">Your proxy key</h2>
            <p className="text-sm text-on-surface-variant mt-2">
              {x402Enabled ? (
                <>
                  This service uses x402 on <code className="font-mono text-xs">POST /api/use</code>. Send your proxy key
                  as <code className="font-mono text-xs">Authorization: Bearer …</code>, receive HTTP 402, pay on-chain,
                  then retry with the <code className="font-mono text-xs">X-Payment</code> header.
                </>
              ) : (
                <>
                  Call <code className="font-mono text-xs">POST /api/use</code> without <code className="font-mono text-xs">txId</code>{" "}
                  to receive <code className="font-mono text-xs">paymentRef</code> + exact{" "}
                  <code className="font-mono text-xs">chargeAlgo</code>. Pay with <code className="font-mono text-xs">paymentRef</code>{" "}
                  in the note, then POST again with <code className="font-mono text-xs">txId</code> +{" "}
                  <code className="font-mono text-xs">paymentRef</code>.
                </>
              )}
            </p>
            <div className="mt-4 p-4 bg-surface-container rounded-md font-mono text-xs break-all border border-outline-variant select-all">
              {apiKey}
            </div>
            <p className="text-xs text-on-surface-variant mt-4">Endpoint</p>
            <div className="mt-1 p-3 bg-surface-container rounded-md font-mono text-[11px] break-all border border-outline-variant">
              {apiBase}/api/use
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCopyKey}
                className="bg-secondary text-on-secondary px-4 py-2 rounded-md text-sm"
              >
                Copy key
              </button>
              <button
                type="button"
                onClick={handleCopySnippet}
                className="border border-outline-variant px-4 py-2 rounded-md text-sm"
              >
                Copy cURL
              </button>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="text-sm text-on-surface-variant underline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={submitReview}
            className="bg-surface-container-lowest max-w-md w-full rounded-md border border-surface-variant p-6 shadow-xl"
          >
            <h2 className="font-headline text-xl font-semibold text-primary">Write a review</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              One review per account. Submitting again updates your rating.
            </p>
            <div className="mt-4">
              <p className="text-xs font-medium text-on-surface-variant mb-2">Rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className={`text-2xl ${star <= reviewRating ? "text-amber-500" : "text-slate-300"}`}
                    aria-label={`${star} stars`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <label className="block mt-4">
              <span className="text-xs font-medium text-on-surface-variant">Comment (optional)</span>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={4}
                maxLength={2000}
                className="mt-1 w-full border border-outline-variant rounded-md px-3 py-2 text-sm"
                placeholder="Share your experience with this API…"
              />
            </label>
            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={submittingReview}
                className="bg-primary text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
              >
                {submittingReview ? "Saving…" : "Submit review"}
              </button>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-sm text-on-surface-variant underline"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {payStage === "error" && payError && (
        <div className="fixed bottom-6 left-6 right-6 max-w-lg mx-auto z-50 bg-red-50 border border-red-200 text-red-900 text-sm px-4 py-3 rounded-md shadow-lg">
          {payError}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => {
              setPayStage(null);
              setPayError(null);
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
