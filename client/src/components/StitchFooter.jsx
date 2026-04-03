import { Link } from 'react-router-dom';
import pkg from '../../package.json';

const nodeUrl = import.meta.env.VITE_ALGORAND_NODE || '';
const isTestnet = /testnet/i.test(nodeUrl);

export default function StitchFooter() {
  const networkLabel = isTestnet ? 'Testnet active' : 'Mainnet active';
  const explorerUrl = isTestnet
    ? 'https://testnet.explorer.algorand.org'
    : 'https://explorer.algorand.org';

  return (
    <footer className="mt-auto py-8 w-full max-w-4xl mx-auto px-6 border-t border-outline-variant/5 flex flex-col md:flex-row justify-between items-center text-on-surface-variant">
      <div className="flex items-center gap-6 mb-4 md:mb-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-secondary shrink-0" aria-hidden />
          <span className="text-[0.65rem] font-bold tracking-widest uppercase font-label">
            {networkLabel}
          </span>
        </div>
        <div className="text-[0.65rem] font-bold tracking-widest uppercase font-label">
          v{pkg.version}
        </div>
      </div>
      <div className="flex items-center gap-8">
        <Link
          to="/about"
          className="text-[0.65rem] font-bold tracking-widest uppercase font-label hover:text-primary transition-colors"
        >
          Privacy protocol
        </Link>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[0.65rem] font-bold tracking-widest uppercase font-label hover:text-primary transition-colors"
        >
          Ledger status
        </a>
      </div>
    </footer>
  );
}
