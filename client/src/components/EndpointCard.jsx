import { Link } from 'react-router-dom';

export default function EndpointCard({ endpoint }) {
  return (
    <div className="group bg-surface-container-lowest p-6 rounded-[6px] border border-transparent hover:border-primary transition-all duration-200 hover:shadow-[0_20px_40px_rgba(3,22,52,0.06)] flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <h2 className="font-headline text-[15px] font-semibold text-primary leading-snug">{endpoint.name}</h2>
        <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-2 py-0.5 rounded-[4px] uppercase tracking-wider">
          {endpoint.model || 'Active'}
        </span>
      </div>
      <p className="font-mono text-[11px] text-on-surface-variant mb-4 truncate opacity-80">
        {endpoint.ownerWallet ? `${endpoint.ownerWallet.slice(0, 6)}…${endpoint.ownerWallet.slice(-4)}` : 'On-chain owner'}
      </p>
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary text-[18px]">payments</span>
        <span className="text-sm font-bold text-primary">
          {endpoint.priceAlgo} ALGO <span className="text-on-surface-variant font-normal">/ request</span>
        </span>
      </div>
      <div className="flex items-center gap-2 mb-5">
        <span className="material-symbols-outlined text-on-surface-variant text-[16px]">data_exploration</span>
        <span className="text-xs text-on-surface-variant">{endpoint.totalCalls ?? 0} calls</span>
      </div>
      <p className="text-sm text-on-surface-variant mb-6 line-clamp-2 leading-relaxed flex-1">{endpoint.description}</p>
      <div className="mt-auto flex flex-col gap-2">
        <Link
          to={`/chat/${endpoint._id}`}
          className="w-full py-2.5 text-center border-2 border-primary text-primary font-semibold rounded-[6px] text-sm transition-all group-hover:bg-primary group-hover:text-on-primary"
        >
          Open playground
        </Link>
      </div>
    </div>
  );
}
