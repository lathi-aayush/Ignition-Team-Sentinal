import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../hooks/useAuth';

export default function Connect() {
  const { walletAddress, connectWallet } = useWallet();
  const { login, token, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleFromQuery = searchParams.get('role');

  const [selectedRole, setSelectedRole] = useState(() =>
    roleFromQuery === 'developer' ? 'developer' : 'user'
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const r = searchParams.get('role');
    if (r === 'developer') setSelectedRole('developer');
    if (r === 'user') setSelectedRole('user');
  }, [searchParams]);

  useEffect(() => {
    if (token) {
      navigate(role === 'developer' ? '/dashboard' : '/user-dashboard');
    }
  }, [token, role, navigate]);

  const handleConnectAndLogin = async () => {
    setBusy(true);
    try {
      let address = walletAddress;
      if (!address) {
        address = await connectWallet();
        if (!address) {
          return;
        }
      }
      const success = await login(selectedRole);
      if (success) {
        navigate(selectedRole === 'developer' ? '/dashboard' : '/user-dashboard');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    setBusy(false);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 py-12">
      {/* Tonal background — Stitch / screen.png */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      <main className="relative z-10 w-full flex flex-col items-center">
        <header className="mb-10 md:mb-12">
          <h1 className="text-3xl font-extrabold tracking-tighter font-headline text-primary uppercase text-center">
            Sentinal
          </h1>
        </header>

        <div className="w-full max-w-[400px] flex flex-col gap-8">
          <section className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(3,22,52,0.04)] border border-outline-variant/10">
            <div className="mb-8">
              <h2 className="text-xl font-bold font-headline text-on-surface mb-2 tracking-tight">
                Connect Your Wallet
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Choose a role and connect your Pera Wallet to continue.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <button
                type="button"
                onClick={() => setSelectedRole('developer')}
                className={[
                  'w-full flex items-center p-4 rounded-xl border-2 transition-all duration-200 text-left group',
                  selectedRole === 'developer'
                    ? 'border-primary bg-surface-container-low'
                    : 'border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low',
                ].join(' ')}
              >
                <div
                  className={[
                    'w-10 h-10 rounded-lg flex items-center justify-center mr-4 shadow-sm shrink-0',
                    selectedRole === 'developer'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-highest text-on-surface-variant',
                  ].join(' ')}
                >
                  <span className="material-symbols-outlined text-[20px]">terminal</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={[
                      'font-bold leading-none mb-1',
                      selectedRole === 'developer' ? 'text-on-surface' : 'text-on-surface-variant',
                    ].join(' ')}
                  >
                    Continue as Creator
                  </p>
                  <p className="text-xs text-on-surface-variant">Deploy and manage API infrastructures</p>
                </div>
                <div
                  className={[
                    'h-5 w-5 rounded-full shrink-0',
                    selectedRole === 'developer'
                      ? 'border-4 border-primary bg-white'
                      : 'border border-outline-variant/30',
                  ].join(' ')}
                  aria-hidden
                />
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('user')}
                className={[
                  'w-full flex items-center p-4 rounded-xl border-2 transition-all duration-200 text-left group',
                  selectedRole === 'user'
                    ? 'border-primary bg-surface-container-low'
                    : 'border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low',
                ].join(' ')}
              >
                <div
                  className={[
                    'w-10 h-10 rounded-lg flex items-center justify-center mr-4 shrink-0',
                    selectedRole === 'user'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container-highest text-on-surface-variant',
                  ].join(' ')}
                >
                  <span className="material-symbols-outlined text-[20px]">grid_view</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={[
                      'font-bold leading-none mb-1',
                      selectedRole === 'user' ? 'text-on-surface' : 'text-on-surface-variant',
                    ].join(' ')}
                  >
                    Continue as User
                  </p>
                  <p className="text-xs text-on-surface-variant">Access marketplace and API services</p>
                </div>
                <div
                  className={[
                    'h-5 w-5 rounded-full shrink-0',
                    selectedRole === 'user'
                      ? 'border-4 border-primary bg-white'
                      : 'border border-outline-variant/30',
                  ].join(' ')}
                  aria-hidden
                />
              </button>
            </div>

            <button
              type="button"
              onClick={handleConnectAndLogin}
              disabled={busy}
              className="w-full bg-primary text-on-primary h-14 rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] hover:bg-primary/95 shadow-lg shadow-primary/10 disabled:opacity-60 disabled:pointer-events-none"
            >
              <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
              <span>{walletAddress && !busy ? 'Sign in with Pera' : 'Connect with Pera Wallet'}</span>
            </button>

            <p className="mt-6 text-center text-[11px] text-on-surface-variant font-medium tracking-wide uppercase">
              New to Algorand?{' '}
              <a
                className="text-primary hover:underline underline-offset-4 ml-1"
                href="https://perawallet.app"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Pera Wallet
              </a>
            </p>
          </section>

          {busy && (
            <div className="bg-surface-container-high/50 backdrop-blur-md rounded-xl px-6 py-4 border border-outline-variant/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className="size-5 shrink-0 border-2 border-outline-variant border-t-primary rounded-full animate-spin"
                  aria-hidden
                />
                <p className="text-sm font-medium text-on-surface truncate">
                  Connecting to Pera Wallet…
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs font-bold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <p className="relative z-10 mt-10 text-center text-sm text-on-surface-variant">
          <Link to="/" className="text-primary font-medium hover:underline">
            ← Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
