import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../hooks/useAuth';
import { Code2, User } from 'lucide-react';

export default function Login() {
  const { walletAddress, connectWallet } = useWallet();
  const { login, token, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleFromQuery = searchParams.get('role');

  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(() =>
    roleFromQuery === 'developer' ? 'developer' : 'user'
  );

  useEffect(() => {
    if (token) {
      navigate(role === 'developer' ? '/dashboard' : '/user-dashboard');
    }
  }, [token, role, navigate]);

  const handleConnectAndLogin = async () => {
    setLoading(true);
    let address = walletAddress;
    if (!address) {
      address = await connectWallet();
      if (!address) {
        setLoading(false);
        return;
      }
    }
    const success = await login(selectedRole);
    if (success) {
      navigate(selectedRole === 'developer' ? '/dashboard' : '/user-dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-16 bg-surface">
      <div className="w-full max-w-[440px] bg-surface-container-lowest border border-surface-variant p-8 md:p-10 rounded-[6px] shadow-[0_20px_40px_rgba(3,22,52,0.06)]">
        <h2 className="font-headline text-2xl font-semibold text-primary mb-2">Authenticate</h2>
        <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">
          Connect Pera Wallet and sign the nonce. Choose whether you&apos;re monetizing APIs or consuming them.
        </p>

        <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-3">I am a</p>
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            type="button"
            onClick={() => setSelectedRole('user')}
            className={[
              'flex flex-col items-center gap-2 p-4 rounded-[6px] border transition-all text-left',
              selectedRole === 'user'
                ? 'border-primary bg-surface-container-low shadow-sm'
                : 'border-surface-variant bg-surface-container-lowest hover:bg-surface-container-low',
            ].join(' ')}
          >
            <User className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm text-primary">User</span>
            <span className="text-[11px] text-on-surface-variant text-center leading-snug">
              Browse marketplace &amp; use APIs
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('developer')}
            className={[
              'flex flex-col items-center gap-2 p-4 rounded-[6px] border transition-all text-left',
              selectedRole === 'developer'
                ? 'border-primary bg-surface-container-low shadow-sm'
                : 'border-surface-variant bg-surface-container-lowest hover:bg-surface-container-low',
            ].join(' ')}
          >
            <Code2 className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm text-primary">Creator</span>
            <span className="text-[11px] text-on-surface-variant text-center leading-snug">
              API keys &amp; monetization
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleConnectAndLogin}
          disabled={loading}
          className="w-full py-3.5 bg-primary text-on-primary rounded-[6px] text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {loading ? (
            'Signing…'
          ) : walletAddress ? (
            <>
              <span className="material-symbols-outlined text-lg">verified_user</span>
              Sign in as {selectedRole === 'developer' ? 'creator' : 'user'}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
              Connect Pera Wallet
            </>
          )}
        </button>

        {walletAddress && !loading && (
          <p className="mt-4 text-xs text-center text-on-surface-variant font-mono">
            {walletAddress.slice(0, 10)}…{walletAddress.slice(-6)}
          </p>
        )}

        <p className="mt-8 text-center text-sm text-on-surface-variant">
          <Link to="/connect" className="text-primary font-medium hover:underline">
            ← Back to wallet selection
          </Link>
        </p>
      </div>
    </div>
  );
}
