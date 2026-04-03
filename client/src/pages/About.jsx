import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="max-w-[800px] mx-auto px-8 py-16 md:py-24">
      <span className="text-[11px] font-bold text-on-secondary-container uppercase tracking-[0.15em]">About</span>
      <h1 className="font-headline text-[36px] md:text-[44px] font-semibold text-primary leading-tight mt-3 mb-6">
        Team Sentinal
      </h1>
      <p className="text-[16px] text-on-surface-variant leading-relaxed mb-8">
        Sentinal is a hackathon prototype for <strong className="text-on-surface">pay-per-use AI infrastructure</strong> on
        Algorand. We connect API creators who monetize LLM-backed endpoints with users who want scoped keys and transparent
        per-request pricing — without locking either side into subscriptions.
      </p>
      <div className="space-y-6 text-[15px] text-on-surface-variant leading-relaxed">
        <p>
          The platform holds <strong className="text-on-surface">non-custodial wallet auth</strong> (Pera), verifies deposits
          against the chain, and maintains prepaid balances for inference. Every call is an economic event: the user&apos;s
          balance decreases, and the creator earns as usage scales.
        </p>
        <p>
          Our UI follows the <strong className="text-on-surface">Digital Ledger</strong> design language: editorial typography
          (Sora + DM Sans), tonal surfaces instead of noisy borders, and teal accents for verified states — so the product
          feels like serious financial tooling, not generic SaaS.
        </p>
      </div>
      <div className="mt-12 pt-10 border-t border-surface-variant">
        <Link
          to="/connect"
          className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-[6px] text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Get started
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}
