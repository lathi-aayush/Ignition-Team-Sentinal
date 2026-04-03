import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function UserMarketplace() {
  const { user, logout } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/api/services");
        if (!cancelled) setServices(data);
      } catch {
        toast.error("Failed to load services");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="antialiased min-h-screen bg-[#f9f9f9]">
      <header className="bg-white dark:bg-slate-900 fixed top-0 z-50 w-full border-b border-slate-100 dark:border-slate-800 h-16 px-6 flex justify-between items-center font-body text-sm">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-bold tracking-tight font-headline text-slate-900 dark:text-white">
            Sentinal
          </Link>
          <nav className="hidden md:flex space-x-6">
            <span className="text-slate-900 dark:text-white font-semibold px-3 py-2 rounded-md">Marketplace</span>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-100 dark:border-slate-700">
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 text-[18px]">
              account_balance_wallet
            </span>
            <span className="font-mono font-medium text-slate-900 dark:text-slate-100 text-xs truncate max-w-[140px]">
              {user?.walletAddress}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              window.location.href = "/";
            }}
            className="text-slate-500 hover:text-slate-900 text-sm"
          >
            Sign out
          </button>
        </div>
      </header>

      <aside className="fixed left-0 top-16 bottom-0 w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800 flex flex-col py-8 font-body text-[0.875rem] overflow-y-auto hidden md:flex">
        <div className="px-6 mb-8">
          <h3 className="text-slate-900 dark:text-white font-semibold">User</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Verified Role</p>
        </div>
        <Link
          to="/user/marketplace"
          className="flex items-center space-x-3 px-6 py-3 text-slate-900 dark:text-white font-semibold border-r-2 border-slate-900 dark:border-slate-50 bg-slate-100 dark:bg-slate-900"
        >
          <span className="material-symbols-outlined">storefront</span>
          <span>Marketplace</span>
        </Link>
      </aside>

      <main className="md:pl-64 pt-24 px-6 pb-16 max-w-5xl">
        <h1 className="font-headline text-2xl font-semibold text-primary mb-2">Marketplace</h1>
        <p className="text-on-surface-variant text-sm mb-8">Browse AI APIs and pay per use in ALGO.</p>

        {loading ? (
          <p className="text-on-surface-variant">Loading services…</p>
        ) : services.length === 0 ? (
          <p className="text-on-surface-variant">No services yet. Ask a creator to publish one.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {services.map((s) => (
              <Link
                key={s._id}
                to={`/user/services/${s._id}`}
                className="block bg-white border border-surface-variant rounded-md p-6 hover:border-secondary transition-colors editorial-shadow"
              >
                <h2 className="font-headline font-semibold text-primary text-lg">{s.title}</h2>
                <p className="text-sm text-on-surface-variant mt-2 line-clamp-3">{s.description}</p>
                <p className="mt-4 text-secondary font-mono text-sm font-semibold">{Number(s.price).toFixed(4)} ALGO</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
