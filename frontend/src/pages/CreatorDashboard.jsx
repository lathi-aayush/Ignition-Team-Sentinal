import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function CreatorDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/api/creator/stats");
        if (!cancelled) setStats(data);
      } catch {
        toast.error("Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const services = stats?.services ?? [];

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-surface-container-high px-6 py-3 flex justify-between items-center h-16">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-headline font-semibold text-xl tracking-tighter text-primary">
            Sentinal
          </Link>
          <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">
            Creator
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="bg-surface-container-low border border-outline-variant/30 rounded px-3 py-1.5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-secondary">account_balance_wallet</span>
            <span className="text-sm font-mono truncate max-w-[180px] text-primary">{user?.walletAddress}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              window.location.href = "/";
            }}
            className="text-sm text-on-surface-variant"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-4xl mx-auto pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <div>
            <h1 className="font-headline text-2xl font-semibold text-primary">Overview</h1>
            <p className="text-sm text-on-surface-variant mt-1">Your APIs and earnings</p>
          </div>
          <Link
            to="/creator/new"
            className="inline-flex items-center justify-center bg-primary text-on-primary px-5 py-2.5 rounded-md text-sm font-medium hover:opacity-90"
          >
            Create service
          </Link>
        </div>

        {loading ? (
          <p className="text-on-surface-variant">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              <div className="bg-white border border-surface-variant p-6 rounded-md">
                <p className="text-xs text-on-surface-variant uppercase tracking-wide">Total revenue</p>
                <p className="font-headline text-2xl text-primary mt-2">
                  {(stats?.totalRevenue ?? 0).toFixed(4)} ALGO
                </p>
              </div>
              <div className="bg-white border border-surface-variant p-6 rounded-md">
                <p className="text-xs text-on-surface-variant uppercase tracking-wide">Total uses</p>
                <p className="font-headline text-2xl text-primary mt-2">{stats?.totalUses ?? 0}</p>
              </div>
              <div className="bg-white border border-surface-variant p-6 rounded-md">
                <p className="text-xs text-on-surface-variant uppercase tracking-wide">Services</p>
                <p className="font-headline text-2xl text-primary mt-2">{stats?.serviceCount ?? 0}</p>
              </div>
            </div>

            <div className="tonal-separator mb-8" />

            <h2 className="font-headline text-lg font-semibold text-primary mb-4">Your services</h2>
            {services.length === 0 ? (
              <p className="text-on-surface-variant text-sm">No services yet. Create one to get started.</p>
            ) : (
              <div className="space-y-3">
                {services.map((s) => (
                  <div
                    key={s._id}
                    className="bg-white border border-surface-variant rounded-md p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold text-primary">{s.title}</p>
                      <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{s.description}</p>
                    </div>
                    <div className="text-right text-sm font-mono">
                      <p className="text-secondary">{Number(s.price).toFixed(4)} ALGO</p>
                      <p className="text-on-surface-variant text-xs mt-1">
                        uses {s.totalUses ?? 0} · revenue {(s.totalRevenue ?? 0).toFixed(4)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
