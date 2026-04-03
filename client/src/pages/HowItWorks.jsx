export default function HowItWorks() {
  return (
    <div className="bg-surface min-h-[calc(100vh-8rem)]">
      <section className="pt-12 md:pt-20 pb-10 flex flex-col items-center text-center px-6">
        <span className="text-[11px] font-bold text-on-secondary-container uppercase tracking-[0.15em] mb-4">
          How it works
        </span>
        <h1 className="font-headline text-[34px] md:text-[40px] leading-tight font-semibold text-primary mb-5">
          Two roles. One system.
        </h1>
        <p className="text-[16px] text-on-surface-variant max-w-[560px] leading-relaxed">
          Sentinal connects AI creators with users through payment verification and a prepaid balance — built for Algorand
          testnet demos and hackathon judging.
        </p>
      </section>

      <section className="max-w-[1000px] mx-auto px-6 pb-20">
        <div className="flex flex-col md:flex-row justify-between gap-12 md:gap-8">
          <div className="w-full md:w-[48%]">
            <div className="mb-10">
              <span className="text-[11px] font-bold text-on-secondary-container uppercase tracking-[0.15em]">
                For creators
              </span>
            </div>
            <div className="space-y-14">
              {[
                ['1', 'Connect wallet', 'Pera Wallet on Algorand.'],
                ['2', 'Create keys & endpoints', 'Offer AI via the proxy; set per-use pricing.'],
                ['3', 'Get discovered', 'Users browse the marketplace and mint keys.'],
                ['4', 'Earn per request', 'Verified usage credits your side of the ledger.'],
              ].map(([n, title, desc], i, arr) => (
                <div
                  key={n}
                  className={`relative flex gap-6 step-line ${i === arr.length - 1 ? 'step-last' : ''}`}
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-full border border-primary flex items-center justify-center text-[12px] font-bold text-primary bg-surface z-10">
                    {n}
                  </div>
                  <div className="pt-0.5">
                    <h3 className="text-[17px] font-semibold text-primary font-headline mb-1">{title}</h3>
                    <p className="text-[14px] text-on-surface-variant">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full md:w-[48%]">
            <div className="mb-10">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.15em]">For users</span>
            </div>
            <div className="space-y-14">
              {[
                ['1', 'Connect wallet', 'Authenticate with your Algorand address.'],
                ['2', 'Browse marketplace', 'Compare pricing and popularity.'],
                ['3', 'Generate an API key', 'Requires minimum balance; key works in any project.'],
                ['4', 'Pay per request', 'Usage debits your prepaid balance automatically.'],
              ].map(([n, title, desc], i, arr) => (
                <div
                  key={n}
                  className={`relative flex gap-6 step-line ${i === arr.length - 1 ? 'step-last' : ''}`}
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-full border border-primary flex items-center justify-center text-[12px] font-bold text-primary bg-surface z-10">
                    {n}
                  </div>
                  <div className="pt-0.5">
                    <h3 className="text-[17px] font-semibold text-primary font-headline mb-1">{title}</h3>
                    <p className="text-[14px] text-on-surface-variant">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-low p-8 rounded-[6px] md:col-span-2">
            <h4 className="text-xl font-semibold text-primary font-headline mb-3">Real-time verification</h4>
            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
              Deposits hit the treasury address; the indexer confirms credits to your platform balance before you call the
              model. Requests stay off-chain fast while funding stays accountable.
            </p>
            <div className="h-36 bg-surface-container-lowest rounded-[6px] p-5 flex flex-col gap-3 justify-center">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-on-secondary-container" />
                <div className="h-2 flex-1 max-w-[200px] bg-surface-container-high rounded-full" />
              </div>
              <div className="flex items-center gap-3 opacity-60">
                <div className="w-2 h-2 rounded-full bg-outline-variant" />
                <div className="h-2 flex-1 max-w-[280px] bg-surface-container-high rounded-full" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-on-secondary-container" />
                <div className="h-2 flex-1 max-w-[160px] bg-surface-container-high rounded-full" />
              </div>
            </div>
          </div>
          <div className="bg-primary text-on-primary p-8 rounded-[6px] flex flex-col justify-between">
            <span className="material-symbols-outlined text-secondary-container text-4xl">verified_user</span>
            <div>
              <h4 className="text-xl font-semibold font-headline mb-2">Pera integrated</h4>
              <p className="text-sm text-primary-container leading-relaxed">
                Non-custodial signing for login and top-ups. Keys and balances live in your app, not in a black box.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
