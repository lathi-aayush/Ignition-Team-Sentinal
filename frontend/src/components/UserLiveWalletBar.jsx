import React from "react";
import { useEffect, useState, useRef } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

/** Shorten Algorand address for display (e.g. ABC123…XYZ9). */
export function shortenWallet(a) {
  if (!a || typeof a !== "string") return "—";
  const t = a.trim();
  if (t.length < 14) return t;
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

function balanceHealth(algo) {
  const main = algo == null ? 0 : Number(algo);
  if (main >= 1) return "healthy";
  if (main >= 0.2) return "low";
  return "critical";
}

const HEALTH_DOT = {
  healthy: "bg-emerald-500",
  low: "bg-amber-400",
  critical: "bg-rose-500",
};

export default function UserLiveWalletBar({ walletAddress, variant = "compact" }) {
  const { isAuthenticated } = useAuth();
  const [algo, setAlgo] = useState(null);
  const [showManage, setShowManage] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !walletAddress) {
      setAlgo(null);
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
  }, [walletAddress, isAuthenticated]);

  useEffect(() => {
    if (!showManage) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowManage(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showManage]);

  const algoDisplay = algo == null ? "…" : Number(algo).toFixed(3);
  const health = balanceHealth(algo);

  if (variant === "pills") {
    return (
      <div className="relative flex items-center gap-2" ref={panelRef}>
        <button
          type="button"
          onClick={() => setShowManage((v) => !v)}
          title="Pera wallet ALGO balance — payments are signed directly from this wallet"
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span className="material-symbols-outlined text-indigo-600 text-[15px]">account_balance_wallet</span>
          <span className="font-mono tabular-nums">{algoDisplay}</span>
          <span className="text-[10px] text-slate-400 font-medium">ALGO</span>
          <span className={`w-1.5 h-1.5 rounded-full ${HEALTH_DOT[health]}`} />
        </button>
        {showManage && (
          <WalletPopover
            walletAddress={walletAddress}
            algoDisplay={algoDisplay}
            onClose={() => setShowManage(false)}
          />
        )}
        <WalletStyles />
      </div>
    );
  }

  return (
    <div className="relative flex items-center" ref={panelRef}>
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
        <span className="text-[10px] text-slate-400 font-medium ml-0.5">ALGO</span>
        <span className={`w-1.5 h-1.5 rounded-full ${HEALTH_DOT[health]}`} />
        <span
          className="material-symbols-outlined text-slate-400 text-[14px] ml-0.5 transition-transform duration-200"
          style={{ transform: showManage ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          expand_more
        </span>
      </button>

      {showManage && (
        <WalletPopover
          walletAddress={walletAddress}
          algoDisplay={algoDisplay}
          onClose={() => setShowManage(false)}
        />
      )}
      <WalletStyles />
    </div>
  );
}

function WalletPopover({ walletAddress, algoDisplay, onClose }) {
  return (
    <div
      className="absolute top-[calc(100%+10px)] right-0 z-[60] w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 overflow-hidden"
      style={{ animation: "walletFadeIn 140ms ease both" }}
    >
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">Pera Wallet</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-500 text-[20px]">
              account_balance_wallet
            </span>
            <div>
              <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">
                Linked address
              </p>
              <p className="text-xs font-mono text-indigo-800 mt-0.5">{shortenWallet(walletAddress)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold text-indigo-700">{algoDisplay}</p>
            <p className="text-[10px] text-indigo-400 font-medium">ALGO</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Marketplace and Studio payments are signed directly from your Pera wallet — approve each charge in the Pera app.
        </p>
      </div>
    </div>
  );
}

function WalletStyles() {
  return (
    <style>{`
      @keyframes walletFadeIn {
        from { opacity: 0; transform: translateY(-6px) scale(0.98); }
        to   { opacity: 1; transform: translateY(0)    scale(1); }
      }
    `}</style>
  );
}
