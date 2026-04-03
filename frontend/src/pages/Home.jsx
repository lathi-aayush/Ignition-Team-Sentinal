import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { connectPera, reconnectPera } from "../wallet/pera.js";
import { useEffect, useState } from "react";

export default function Home() {
  const navigate = useNavigate();
  const { login, user, logout, isAuthenticated } = useAuth();
  const [busy, setBusy] = useState(false);
  const [reconnected, setReconnected] = useState(null);

  useEffect(() => {
    reconnectPera().then((a) => setReconnected(a));
  }, []);

  async function enterAsRole(role) {
    if (isAuthenticated && user && user.role !== role) {
      toast.error("Log out first, then enter as the other role.");
      return;
    }
    if (isAuthenticated && user && user.role === role) {
      navigate(role === "user" ? "/user/marketplace" : "/creator");
      return;
    }
    setBusy(true);
    try {
      let address = reconnected;
      if (!address) {
        address = await connectPera();
      }
      await login(address, role);
      toast.success(role === "user" ? "Signed in as User" : "Signed in as Creator");
      navigate(role === "user" ? "/user/marketplace" : "/creator");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Wallet connection failed");
    } finally {
      setBusy(false);
    }
  }

  async function headerConnect() {
    setBusy(true);
    try {
      const address = await connectPera();
      toast.success("Wallet connected — choose User or Creator below.");
      setReconnected(address);
    } catch (e) {
      toast.error(e?.message || "Connect failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-surface selection:bg-secondary-container selection:text-on-secondary-container min-h-screen">
      <header className="bg-[#F9F9F9] dark:bg-[#1A1C1C] flex justify-between items-center w-full px-8 h-16 max-w-screen-2xl mx-auto top-0 sticky z-50">
        <div className="flex items-center gap-12">
          <span className="text-xl font-semibold text-[#031634] dark:text-white tracking-tighter font-headline">
            Sentinal
          </span>
          <nav className="hidden md:flex items-center gap-8">
            <span className="text-[#5A5A5A] dark:text-[#A0A0A0] text-sm font-medium font-body">
              How It Works
            </span>
            <span className="text-[#5A5A5A] dark:text-[#A0A0A0] text-sm font-medium font-body">
              Marketplace
            </span>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                logout();
                toast.success("Signed out");
              }}
              className="text-sm font-medium text-on-surface-variant hover:text-primary"
            >
              Sign out
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={headerConnect}
            className="flex items-center gap-2 bg-[#031634] text-white px-5 py-2.5 rounded-md hover:opacity-90 active:scale-95 transition-all font-body text-sm font-medium disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">account_balance_wallet</span>
            {busy ? "…" : "Connect Wallet"}
          </button>
        </div>
      </header>

      <main>
        <section className="max-w-[1100px] mx-auto px-8 pt-24 pb-16">
          <div className="flex flex-col gap-6">
            <span className="font-body text-[11px] font-bold tracking-[0.1em] text-secondary uppercase">
              ALGORAND-POWERED INFRASTRUCTURE
            </span>
            <h1 className="font-headline text-[52px] font-semibold text-primary leading-[1.15] tracking-tight">
              Pay-per-use <br />
              <span className="ml-[40px]">AI infrastructure.</span>
            </h1>
            <p className="font-body text-[18px] text-on-surface-variant max-w-lg mt-2">
              Creators deploy. Users pay. No subscriptions.
            </p>
          </div>
        </section>

        <section className="max-w-screen-2xl mx-auto px-8 py-12 flex flex-col items-center">
          <div className="flex flex-col md:flex-row gap-6 w-full max-w-[680px]">
            <button
              type="button"
              disabled={busy}
              onClick={() => enterAsRole("creator")}
              className="flex-1 text-left bg-surface-container-lowest border border-surface-variant p-8 rounded-md hover:bg-surface-container-low transition-colors group cursor-pointer disabled:opacity-50"
            >
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-start">
                  <span className="font-body text-[11px] font-bold tracking-wider text-secondary uppercase">
                    CREATOR
                  </span>
                  <span className="material-symbols-outlined text-primary">terminal</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-headline text-lg font-semibold text-primary">Deploy &amp; Earn</h3>
                  <p className="font-body text-[13px] leading-relaxed text-on-surface-variant">
                    Publish AI endpoints. Set pricing. Track earnings.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-primary font-bold">
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </div>
              </div>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => enterAsRole("user")}
              className="flex-1 text-left bg-surface-container-lowest border border-surface-variant p-8 rounded-md hover:bg-surface-container-low transition-colors group cursor-pointer disabled:opacity-50"
            >
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-start">
                  <span className="font-body text-[11px] font-bold tracking-wider text-secondary uppercase">
                    USER
                  </span>
                  <span className="material-symbols-outlined text-primary">storefront</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-headline text-lg font-semibold text-primary">Access &amp; Pay</h3>
                  <p className="font-body text-[13px] leading-relaxed text-on-surface-variant">
                    Browse AI APIs. Pay per request. No commitment.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-primary font-bold">
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </div>
              </div>
            </button>
          </div>
          <p className="mt-8 font-body text-[12px] text-on-surface-variant/70 italic">
            Both flows start by connecting your Pera Wallet.
          </p>
        </section>
      </main>

      <footer className="bg-surface border-t border-surface-variant py-12 px-8 mt-24">
        <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex flex-col gap-2">
            <span className="text-lg font-semibold text-primary tracking-tighter font-headline">Sentinal</span>
            <p className="text-[11px] text-on-surface-variant font-medium tracking-wide font-body uppercase">
              © 2026 SENTINAL INFRASTRUCTURE
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
