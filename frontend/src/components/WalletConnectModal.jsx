import React, { useState } from "react";
import { useWallet } from "@txnlab/use-wallet-react";

/**
 * Multi-wallet connect modal (use-wallet pattern).
 * @see https://txnlab.gitbook.io/use-wallet/guides/connect-wallet-menu
 */
export default function WalletConnectModal({
  open,
  role = "user",
  onClose,
  onSelectWallet,
  onConnectPera,
  busy = false,
}) {
  const { wallets, isReady, activeWallet, activeAddress } = useWallet();
  const [connectingId, setConnectingId] = useState(null);

  if (!open) return null;

  const handleConnect = async (wallet) => {
    if (busy || connectingId) return;
    setConnectingId(wallet.walletKey || wallet.id);
    try {
      await onSelectWallet(wallet);
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/45"
      role="dialog"
      aria-labelledby="wallet-connect-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="wallet-connect-title" className="text-lg font-semibold text-slate-900">
              Connect Wallet
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Choose an Algorand wallet on TestNet. Signing in as{" "}
              <span className="font-medium text-slate-700">{role}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {activeWallet && activeAddress && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Active: {activeWallet.metadata.name} — {activeAddress.slice(0, 6)}…
            {activeAddress.slice(-4)}
          </div>
        )}

        {!isReady ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading wallets…</div>
        ) : wallets.length === 0 ? (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm text-slate-500">Wallet list unavailable in this browser.</p>
            {onConnectPera && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onConnectPera()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50"
              >
                Connect Pera Wallet
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-2">
            {onConnectPera && (
              <button
                type="button"
                disabled={Boolean(connectingId) || busy}
                onClick={() => onConnectPera()}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50 text-left"
              >
                <span className="w-8 h-8 rounded-md bg-white flex items-center justify-center border border-indigo-100">
                  <span className="material-symbols-outlined text-indigo-600 text-[18px]">account_balance_wallet</span>
                </span>
                <span className="flex-1 font-semibold text-indigo-900">Pera Wallet</span>
                <span className="text-xs text-indigo-600 font-medium">Recommended</span>
              </button>
            )}
            {wallets.map((wallet) => {
              const key = wallet.walletKey || wallet.id;
              const isConnecting = connectingId === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={Boolean(connectingId) || busy}
                  onClick={() => handleConnect(wallet)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors disabled:opacity-50 text-left"
                >
                  {wallet.metadata?.icon ? (
                    <img
                      src={wallet.metadata.icon}
                      alt=""
                      width={32}
                      height={32}
                      className="rounded-md"
                    />
                  ) : (
                    <span className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-slate-500 text-[18px]">
                        account_balance_wallet
                      </span>
                    </span>
                  )}
                  <span className="flex-1 font-medium text-slate-800">
                    {wallet.metadata?.name || wallet.id}
                  </span>
                  {isConnecting ? (
                    <span className="text-xs text-indigo-600 font-medium">Connecting…</span>
                  ) : (
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">
                      chevron_right
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          Powered by{" "}
          <a
            href="https://txnlab.gitbook.io/use-wallet"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-slate-600"
          >
            use-wallet
          </a>
          . Pera, Defly, Exodus, Kibisis, and Lute supported.
        </p>
      </div>
    </div>
  );
}
