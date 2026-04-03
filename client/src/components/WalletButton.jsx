import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';

export default function WalletButton() {
  const { role, logout } = useAuth();
  const { walletAddress } = useWallet();

  if (!walletAddress) return null;

  const truncated = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  return (
    <div className="flex items-center gap-2">
      {role && (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-on-secondary-container bg-secondary-container/80 px-2 py-1 rounded-[6px]">
          {role === 'developer' ? 'Creator' : 'User'}
        </span>
      )}
      <button
        type="button"
        onClick={logout}
        className="px-3 py-2 bg-surface-container-lowest border border-surface-variant rounded-[6px] text-sm text-on-surface hover:bg-surface-container-high transition-colors"
      >
        {truncated} · Disconnect
      </button>
    </div>
  );
}
