import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, ShoppingBag } from 'lucide-react';

export default function Connect() {
  const navigate = useNavigate();
  const [hover, setHover] = useState(null);

  const goLogin = (role) => {
    navigate(`/login?role=${role}`);
  };

  const dim = (side) => hover && hover !== side;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 py-16 bg-surface">
      <div className="max-w-2xl w-full text-center mb-12">
        <span className="font-sans text-[11px] font-bold tracking-[0.1em] text-secondary uppercase">
          Choose your path
        </span>
        <h1 className="font-headline text-[32px] md:text-[40px] font-semibold text-primary leading-tight mt-3">
          Two wallets. One ledger.
        </h1>
        <p className="text-on-surface-variant text-[15px] mt-2 max-w-md mx-auto">
          Hover a card to focus it — then connect with Pera to continue. Creators monetize APIs; users pay per request.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-[680px]">
        <button
          type="button"
          onClick={() => goLogin('developer')}
          onMouseEnter={() => setHover('creator')}
          onMouseLeave={() => setHover(null)}
          className={[
            'flex-1 text-left bg-surface-container-lowest border border-surface-variant p-8 rounded-[6px] transition-all duration-200 cursor-pointer group',
            dim('creator') ? 'opacity-35 scale-[0.99]' : 'opacity-100',
            'hover:bg-surface-container-low hover:shadow-[0_20px_40px_rgba(3,22,52,0.06)]',
          ].join(' ')}
        >
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-start">
              <span className="font-sans text-[11px] font-bold tracking-wider text-secondary uppercase">Creator</span>
              <Terminal className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-headline text-lg font-semibold text-primary">Deploy &amp; earn</h3>
              <p className="font-sans text-[13px] leading-relaxed text-on-surface-variant">
                Publish AI endpoints on the marketplace. Set pricing. Track earnings per request.
              </p>
            </div>
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => goLogin('user')}
          onMouseEnter={() => setHover('user')}
          onMouseLeave={() => setHover(null)}
          className={[
            'flex-1 text-left bg-surface-container-lowest border border-surface-variant p-8 rounded-[6px] transition-all duration-200 cursor-pointer group',
            dim('user') ? 'opacity-35 scale-[0.99]' : 'opacity-100',
            'hover:bg-surface-container-low hover:shadow-[0_20px_40px_rgba(3,22,52,0.06)]',
          ].join(' ')}
        >
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-start">
              <span className="font-sans text-[11px] font-bold tracking-wider text-secondary uppercase">User</span>
              <ShoppingBag className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-headline text-lg font-semibold text-primary">Access &amp; pay</h3>
              <p className="font-sans text-[13px] leading-relaxed text-on-surface-variant">
                Browse APIs, mint keys, and use them in any project. Balance deducts per call.
              </p>
            </div>
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </div>
          </div>
        </button>
      </div>

      <p className="mt-10 font-sans text-[12px] text-on-surface-variant/70 italic">
        Both flows use Pera Wallet on Algorand. Testnet demo supported.
      </p>
    </div>
  );
}
