import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import WalletButton from './WalletButton';

const navLinkClass = ({ isActive }) =>
  [
    'text-sm font-medium transition-colors font-sans',
    isActive ? 'text-primary font-semibold border-b-2 border-primary pb-1' : 'text-nav-muted hover:text-primary',
  ].join(' ');

export default function Navbar() {
  const { token, role } = useAuth();
  const { walletAddress } = useWallet();

  const dashboardPath = role === 'developer' ? '/dashboard' : '/user-dashboard';
  const dashboardLabel = role === 'developer' ? 'Creator dashboard' : 'My dashboard';

  return (
    <header className="bg-surface border-b border-surface-variant/80 flex justify-between items-center w-full px-6 md:px-8 h-16 max-w-screen-2xl mx-auto top-0 sticky z-50">
      <div className="flex items-center gap-8 md:gap-12">
        <Link to="/" className="text-xl font-semibold text-primary tracking-tighter font-headline">
          Sentinal
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <NavLink to="/about" className={navLinkClass}>
            About
          </NavLink>
          <NavLink to="/how-it-works" className={navLinkClass}>
            How it works
          </NavLink>
          <NavLink to="/marketplace" className={navLinkClass}>
            Marketplace
          </NavLink>
        </nav>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {token && (
          <Link
            to={dashboardPath}
            className="hidden sm:inline text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
          >
            {dashboardLabel}
          </Link>
        )}
        {!token && walletAddress && (
          <Link
            to="/login"
            className="text-sm font-medium text-primary hover:underline hidden sm:inline"
          >
            Continue sign in
          </Link>
        )}
        <WalletButton />
        {!token && !walletAddress && (
          <Link
            to="/connect"
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 sm:px-5 py-2.5 rounded-[6px] text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-base">account_balance_wallet</span>
            <span className="hidden xs:inline">Connect</span>
          </Link>
        )}
      </div>
    </header>
  );
}
