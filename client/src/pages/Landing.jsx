import { Link } from 'react-router-dom';
import { Terminal, ShoppingBag } from 'lucide-react';

export default function Landing() {
  return (
    <div className="bg-surface text-on-surface">
      <section className="max-w-[1100px] mx-auto px-8 pt-16 md:pt-24 pb-12">
        <div className="flex flex-col gap-6">
          <span className="font-sans text-[11px] font-bold tracking-[0.1em] text-secondary uppercase">
            Algorand-powered infrastructure
          </span>
          <h1 className="font-headline text-[40px] md:text-[52px] font-semibold text-primary leading-[1.15] tracking-tight">
            Pay-per-use
            <br />
            <span className="ml-0 md:ml-10">AI infrastructure.</span>
          </h1>
          <p className="font-sans text-[17px] text-on-surface-variant max-w-lg mt-1">
            An API marketplace where creators set per-request pricing and users pay from a prepaid wallet — no subscriptions.
          </p>
        </div>
      </section>

      <section className="max-w-screen-2xl mx-auto px-8 py-10 flex flex-col items-center">
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-[680px]">
          <Link
            to="/connect"
            className="flex-1 bg-surface-container-lowest border border-surface-variant p-8 rounded-[6px] hover:bg-surface-container-low transition-colors group"
          >
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <span className="font-sans text-[11px] font-bold tracking-wider text-secondary uppercase">Creator</span>
                <Terminal className="w-6 h-6 text-primary" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-headline text-lg font-semibold text-primary">Deploy &amp; earn</h3>
                <p className="font-sans text-[13px] leading-relaxed text-on-surface-variant">
                  Publish AI endpoints. Set pricing. Track earnings as usage grows.
                </p>
              </div>
              <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform w-6">
                arrow_forward
              </span>
            </div>
          </Link>

          <Link
            to="/connect"
            className="flex-1 bg-surface-container-lowest border border-surface-variant p-8 rounded-[6px] hover:bg-surface-container-low transition-colors group"
          >
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <span className="font-sans text-[11px] font-bold tracking-wider text-secondary uppercase">User</span>
                <ShoppingBag className="w-6 h-6 text-primary" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-headline text-lg font-semibold text-primary">Access &amp; pay</h3>
                <p className="font-sans text-[13px] leading-relaxed text-on-surface-variant">
                  Browse APIs, generate keys, use them in any project — pay only per call.
                </p>
              </div>
              <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform w-6">
                arrow_forward
              </span>
            </div>
          </Link>
        </div>
        <p className="mt-8 font-sans text-[12px] text-on-surface-variant/70 italic">
          Both flows start by connecting your Pera Wallet.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 items-center gap-6 text-center">
          <div>
            <span className="font-headline text-[28px] font-semibold text-primary">312</span>
            <p className="font-sans text-[13px] text-on-surface-variant mt-1">API requests (demo)</p>
          </div>
          <div className="border-l border-surface-variant pl-6">
            <span className="font-headline text-[28px] font-semibold text-primary">3</span>
            <p className="font-sans text-[13px] text-on-surface-variant mt-1">Active endpoints</p>
          </div>
          <div className="border-l border-surface-variant pl-6">
            <span className="font-headline text-[28px] font-semibold text-primary">14.82</span>
            <p className="font-sans text-[13px] text-on-surface-variant mt-1">ALGO earned (demo)</p>
          </div>
          <div className="border-l border-surface-variant pl-6">
            <span className="font-headline text-[28px] font-semibold text-primary">&lt; 2s</span>
            <p className="font-sans text-[13px] text-on-surface-variant mt-1">Avg. response</p>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-low py-20 md:py-24">
        <div className="max-w-[1100px] mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="space-y-8">
            <h2 className="font-headline text-2xl md:text-3xl font-semibold text-primary leading-tight">
              Infrastructure built for verifiable, per-use settlement.
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <span className="material-symbols-outlined text-secondary shrink-0">security</span>
                <div>
                  <h4 className="font-bold text-primary text-sm font-sans">Ledger-backed balances</h4>
                  <p className="text-[13px] text-on-surface-variant leading-relaxed mt-1">
                    Deposits are verified on Algorand; API usage deducts from a prepaid balance — no pop-up per inference.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="material-symbols-outlined text-secondary shrink-0">bolt</span>
                <div>
                  <h4 className="font-bold text-primary text-sm font-sans">Fast settlement</h4>
                  <p className="text-[13px] text-on-surface-variant leading-relaxed mt-1">
                    Algorand finality keeps funding and access checks aligned with low-latency AI calls.
                  </p>
                </div>
              </div>
            </div>
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              See how it works
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
          <div className="aspect-video bg-surface-container-lowest border border-surface-variant rounded-[6px] overflow-hidden relative flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/[0.03]" />
            <div className="relative z-10 text-center px-6">
              <span className="material-symbols-outlined text-5xl text-primary/40">hub</span>
              <p className="text-sm text-on-surface-variant mt-3 font-medium">Creator APIs · User keys · One proxy</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
