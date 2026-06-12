import React from "react";
import { useEffect, useState, useRef } from "react";
import { api } from "../api/client.js";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import {
  getBurnerAddress,
  getBurnerBalance,
  fundBurnerWallet,
  refundBurnerWallet,
  getDefaultAlgodServer,
} from "../wallet/burner.js";

/** Shorten Algorand address for display (e.g. ABC123…XYZ9). */
export function shortenWallet(a) {
  if (!a || typeof a !== "string") return "—";
  const t = a.trim();
  if (t.length < 14) return t;
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

function balanceHealth(algo, burnerAlgo) {
  const burner = burnerAlgo == null ? 0 : Number(burnerAlgo) / 1_000_000;
  const main = algo == null ? 0 : Number(algo);
  if (main >= 1 || burner >= 0.5) return "healthy";
  if (burner >= 0.1 || main >= 0.2) return "low";
  return "critical";
}

const HEALTH_DOT = {
  healthy: "bg-emerald-500",
  low: "bg-amber-400",
  critical: "bg-rose-500",
};

export default function UserLiveWalletBar({ walletAddress, variant = "compact" }) {
  const { burnerReady, isAuthenticated } = useAuth();
  const [algo, setAlgo] = useState(null);
  const [burnerAlgo, setBurnerAlgo] = useState(null);
  const [burnerAddr, setBurnerAddr] = useState(null);
  const [fundAmount, setFundAmount] = useState("1");
  const [isFunding, setIsFunding] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const panelRef = useRef(null);

  const algodServer = getDefaultAlgodServer();

  useEffect(() => {
    if (!isAuthenticated || !walletAddress) {
      setAlgo(null); setBurnerAlgo(null); setBurnerAddr(null);
      return;
    }
    if (!burnerReady) {
      setBurnerAlgo(null); setBurnerAddr(null);
      return;
    }
    let cancelled = false;
    let intervalId = null;
    async function load() {
      try {
        const { data } = await api.get("/api/user/algo-balance");
        if (!cancelled) setAlgo(data?.balanceAlgo ?? 0);
      } catch (err) {
        if (err?.response?.status === 401) {
          cancelled = true;
          if (intervalId) clearInterval(intervalId);
          return;
        }
        if (!cancelled) setAlgo(null);
      }
      try {
        setBurnerAddr(getBurnerAddress());
        const bBal = await getBurnerBalance(algodServer);
        if (!cancelled) setBurnerAlgo(bBal);
      } catch {
        if (!cancelled) { setBurnerAlgo(null); setBurnerAddr(null); }
      }
    }
    load();
    intervalId = setInterval(load, 15000);
    const onWalletUpdate = () => load();
    window.addEventListener("walletBalanceUpdate", onWalletUpdate);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
      window.removeEventListener("walletBalanceUpdate", onWalletUpdate);
    };
  }, [walletAddress, burnerReady, isAuthenticated, algodServer]);

  // Close panel on outside click
  useEffect(() => {
    if (!showManage) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowManage(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showManage]);

  const handleFund = async () => {
    if (!walletAddress) return toast.error("Connect and link your wallet first");
    if (!burnerReady) return toast.error("Burner wallet is still loading — wait a moment and retry");
    const amountFloat = parseFloat(fundAmount);
    if (isNaN(amountFloat) || amountFloat <= 0) return toast.error("Enter an amount greater than 0 ALGO");
    setIsFunding(true);
    try {
      toast.loading("Approve the transfer in your wallet…", { id: "fund-burner" });
      const micro = Math.round(amountFloat * 1_000_000);
      await fundBurnerWallet(walletAddress, micro, algodServer);
      toast.success("Burner wallet funded", { id: "fund-burner" });
      const bBal = await getBurnerBalance(algodServer);
      setBurnerAlgo(bBal);
      setShowManage(false);
    } catch (e) {
      toast.error(e?.message || "Failed to fund burner", { id: "fund-burner" });
    } finally { setIsFunding(false); }
  };

  const handleRefund = async () => {
    if (!walletAddress) return toast.error("Connect main wallet first");
    setIsRefunding(true);
    try {
      await refundBurnerWallet(walletAddress, algodServer);
      toast.success("Burner wallet refunded to Pera");
      const bBal = await getBurnerBalance(algodServer);
      setBurnerAlgo(bBal);
      setShowManage(false);
    } catch (e) {
      toast.error(e?.message || "Failed to refund burner");
    } finally { setIsRefunding(false); }
  };

  const burnerDisplay = burnerAlgo == null
    ? "…"
    : `${(Number(burnerAlgo) / 1_000_000).toFixed(3)}`;
  const algoDisplay = algo == null ? "…" : Number(algo).toFixed(3);
  const health = balanceHealth(algo, burnerAlgo);
  const estimatedRuns =
    burnerAlgo == null ? null : Math.max(0, Math.floor(Number(burnerAlgo) / 50_000));

  if (variant === "pills") {
    return (
      <div className="relative flex items-center gap-2" ref={panelRef}>
        <button
          type="button"
          onClick={() => setShowManage((v) => !v)}
          title={
            estimatedRuns != null
              ? `~${estimatedRuns} workflow run${estimatedRuns === 1 ? "" : "s"} remaining at current burner balance`
              : "Pera wallet ALGO balance"
          }
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span className="material-symbols-outlined text-indigo-600 text-[15px]">account_balance_wallet</span>
          <span className="font-mono tabular-nums">{algoDisplay}</span>
          <span className="text-[10px] text-slate-400 font-medium">ALGO</span>
          <span className={`w-1.5 h-1.5 rounded-full ${HEALTH_DOT[health]}`} />
        </button>
        <button
          type="button"
          onClick={() => setShowManage((v) => !v)}
          title={
            estimatedRuns != null
              ? `~${estimatedRuns} micro-payment run${estimatedRuns === 1 ? "" : "s"} remaining`
              : "Burner wallet balance for seamless payments"
          }
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span className="material-symbols-outlined text-amber-600 text-[15px]">local_fire_department</span>
          <span className="font-mono tabular-nums">{burnerDisplay}</span>
          <span className="text-[10px] text-slate-400 font-medium">burner</span>
          <span className={`w-1.5 h-1.5 rounded-full ${HEALTH_DOT[health]}`} />
        </button>
        {showManage && (
          <div
            className="absolute top-[calc(100%+10px)] right-0 z-[60] w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 overflow-hidden"
            style={{ animation: "walletFadeIn 140ms ease both" }}
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Wallets</span>
              <button
                onClick={() => setShowManage(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-500 text-[20px]">account_balance_wallet</span>
                  <div>
                    <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Pera Wallet</p>
                    <p className="text-xs font-mono text-indigo-800 mt-0.5">{shortenWallet(walletAddress)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold text-indigo-700">{algoDisplay}</p>
                  <p className="text-[10px] text-indigo-400 font-medium">ALGO</p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-amber-50 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-[20px]">local_fire_department</span>
                  <div>
                    <p className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider">Burner Wallet</p>
                    {burnerAddr && (
                      <p className="text-xs font-mono text-amber-800 mt-0.5">{shortenWallet(burnerAddr)}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold text-amber-700">{burnerDisplay}</p>
                  <p className="text-[10px] text-amber-400 font-medium">ALGO</p>
                </div>
              </div>
              {estimatedRuns != null && (
                <p className="text-[11px] text-slate-500">
                  ~{estimatedRuns} workflow run{estimatedRuns === 1 ? "" : "s"} remaining at current usage
                </p>
              )}
              <div className="pt-1">
                <p className="text-[11px] text-slate-500 mb-2.5 leading-relaxed">
                  Top up the burner for seamless micro-payments — no Pera pop-ups.
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg pl-3 pr-14 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                      placeholder="0.5"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">ALGO</span>
                  </div>
                  <button
                    onClick={handleFund}
                    disabled={isFunding}
                    className="h-9 px-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-semibold rounded-lg text-xs transition-all disabled:opacity-50 whitespace-nowrap shadow-sm shadow-amber-200"
                  >
                    {isFunding ? "…" : "Fund"}
                  </button>
                </div>
                <button
                  onClick={handleRefund}
                  disabled={isRefunding}
                  className="mt-2 w-full text-xs text-slate-500 hover:text-slate-800 py-1.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                >
                  {isRefunding ? "Refunding…" : "↩ Refund all back to Pera"}
                </button>
              </div>
            </div>
          </div>
        )}
        <style>{`
          @keyframes walletFadeIn {
            from { opacity: 0; transform: translateY(-6px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0)    scale(1); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="relative flex items-center" ref={panelRef}>
      {/* ── Compact pill button ── */}
      <button
        type="button"
        onClick={() => setShowManage((v) => !v)}
        className={`flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium transition-all cursor-pointer select-none ${
          showManage
            ? "bg-slate-100 border-slate-300 text-slate-900"
            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
        }`}
      >
        <span className="material-symbols-outlined text-indigo-500 text-[15px] shrink-0">
          account_balance_wallet
        </span>
        <span className="font-mono tabular-nums">{algoDisplay}</span>
        <span className="text-slate-300 mx-0.5 text-[10px]">·</span>
        <span className="material-symbols-outlined text-amber-500 text-[15px] shrink-0">
          local_fire_department
        </span>
        <span className="font-mono tabular-nums">{burnerDisplay}</span>
        <span
          className="material-symbols-outlined text-slate-400 text-[14px] ml-0.5 transition-transform duration-200"
          style={{ transform: showManage ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          expand_more
        </span>
      </button>

      {/* ── Manage popover ── */}
      {showManage && (
        <div
          className="absolute top-[calc(100%+10px)] right-0 z-[60] w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 overflow-hidden"
          style={{ animation: "walletFadeIn 140ms ease both" }}
        >
          {/* header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">Wallets</span>
            <button
              onClick={() => setShowManage(false)}
              className="text-slate-400 hover:text-slate-700 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* Main wallet card */}
            <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500 text-[20px]">
                  account_balance_wallet
                </span>
                <div>
                  <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">
                    Pera Wallet
                  </p>
                  <p className="text-xs font-mono text-indigo-800 mt-0.5">
                    {shortenWallet(walletAddress)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-bold text-indigo-700">{algoDisplay}</p>
                <p className="text-[10px] text-indigo-400 font-medium">ALGO</p>
              </div>
            </div>

            {/* Burner wallet card */}
            <div className="flex items-center justify-between bg-amber-50 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-[20px]">
                  local_fire_department
                </span>
                <div>
                  <p className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider">
                    Burner Wallet
                  </p>
                  {burnerAddr && (
                    <p className="text-xs font-mono text-amber-800 mt-0.5">
                      {shortenWallet(burnerAddr)}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-bold text-amber-700">{burnerDisplay}</p>
                <p className="text-[10px] text-amber-400 font-medium">ALGO</p>
              </div>
            </div>

            {/* Fund controls */}
            <div className="pt-1">
              <p className="text-[11px] text-slate-500 mb-2.5 leading-relaxed">
                Top up the burner for seamless micro-payments — no Pera pop-ups.
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.1"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg pl-3 pr-14 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                    placeholder="0.5"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    ALGO
                  </span>
                </div>
                <button
                  onClick={handleFund}
                  disabled={isFunding}
                  className="h-9 px-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-semibold rounded-lg text-xs transition-all disabled:opacity-50 whitespace-nowrap shadow-sm shadow-amber-200"
                >
                  {isFunding ? "…" : "Fund"}
                </button>
              </div>
              <button
                onClick={handleRefund}
                disabled={isRefunding}
                className="mt-2 w-full text-xs text-slate-500 hover:text-slate-800 py-1.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
              >
                {isRefunding ? "Refunding…" : "↩ Refund all back to Pera"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes walletFadeIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}
