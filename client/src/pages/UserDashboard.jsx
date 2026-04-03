import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Banknote, History, Zap, AlertTriangle } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import api from '../lib/api';
import toast from 'react-hot-toast';

const LOW_BALANCE_ALGO = 0.15;

export default function UserDashboard() {
  const { initiatePayment, walletAddress } = useWallet();
  const [data, setData] = useState({ balance: 0, transactions: [] });
  const [loading, setLoading] = useState(true);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('0.5');
  const [processingPayment, setProcessingPayment] = useState(false);

  const loadData = () => {
    setLoading(true);
    api
      .get('/developer/user-dashboard')
      .then((res) => {
        const b = res.data?.balance;
        const balance = typeof b === 'number' && !Number.isNaN(b) ? b : parseFloat(b) || 0;
        const transactions = Array.isArray(res.data?.transactions) ? res.data.transactions : [];
        setData({ balance, transactions });
      })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTopUp = async (e) => {
    e.preventDefault();
    if (processingPayment) return;
    setProcessingPayment(true);
    try {
      const treasury = import.meta.env.VITE_TREASURY_WALLET?.trim();
      if (!treasury) {
        toast.error('Set VITE_TREASURY_WALLET in client/.env (same address as server TREASURY_WALLET).');
        setProcessingPayment(false);
        return;
      }

      if (!walletAddress) {
        toast.error('Connect Pera Wallet first (use the navbar or log in again).');
        setProcessingPayment(false);
        return;
      }

      const amountNum = parseFloat(topUpAmount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        toast.error('Enter a valid ALGO amount.');
        setProcessingPayment(false);
        return;
      }

      toast('Please sign the transaction in Pera Wallet...', { icon: '⏳' });
      const txId = await initiatePayment(treasury, amountNum);

      toast('Confirming on Algorand blockchain...', { icon: '🔄' });
      await api.post('/wallet/deposit', { txID: txId }, { timeout: 40000 });

      toast.success(`Deposited ${amountNum} ALGO successfully!`);
      setIsTopUpOpen(false);
      setTopUpAmount('0.5');
      loadData();
    } catch (err) {
      const alreadyShown =
        err?.message === 'Wallet address missing' ||
        err?.message === 'Recipient address missing' ||
        err?.message === 'Invalid recipient address';
      if (!alreadyShown) {
        toast.error('Top up failed.');
      }
      console.error(err);
    } finally {
      setProcessingPayment(false);
    }
  };

  const transactions = Array.isArray(data.transactions) ? data.transactions : [];
  const balance = typeof data.balance === 'number' && !Number.isNaN(data.balance) ? data.balance : Number(data.balance) || 0;

  const usedAlgo = transactions
    .filter((t) => t.type !== 'deposit')
    .reduce((acc, t) => acc + Math.abs(Number(t.amountAlgo) || 0), 0);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-surface text-on-surface-variant">
        Loading…
      </div>
    );
  }

  const lowBalance = balance < LOW_BALANCE_ALGO;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-14 bg-surface min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6 mb-8">
        <div>
          <h1 className="font-headline text-2xl md:text-3xl font-semibold text-primary mb-1">User dashboard</h1>
          <p className="text-sm text-on-surface-variant">Prepaid balance for pay-per-use API calls.</p>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary mt-3 hover:underline"
          >
            Browse marketplace
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>
        <div className="bg-surface-container-lowest border border-surface-variant rounded-[6px] px-4 py-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary-container/40 text-on-secondary-container rounded-[6px] flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Balance</p>
              <p className="text-lg font-bold text-primary font-headline">{balance.toFixed(4)} ALGO</p>
            </div>
          </div>
          <div className="h-8 w-px bg-surface-variant hidden sm:block" />
          <div>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wide">Used (session log)</p>
            <p className="text-sm font-mono text-on-surface">{usedAlgo.toFixed(4)} ALGO</p>
          </div>
          <button
            type="button"
            onClick={() => setIsTopUpOpen(true)}
            className="ml-auto px-4 py-2 bg-primary text-on-primary rounded-[6px] text-sm font-semibold hover:opacity-90 flex items-center gap-2"
          >
            <Banknote size={16} /> Top up
          </button>
        </div>
      </div>

      {lowBalance && (
        <div className="mb-8 flex items-start gap-3 bg-error-container/40 border border-error/20 rounded-[6px] p-4">
          <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-primary">Low balance</p>
            <p className="text-xs text-on-surface-variant mt-1">
              Add ALGO before calling paid APIs. Suggested minimum: {LOW_BALANCE_ALGO} ALGO for demos.
            </p>
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest border border-surface-variant rounded-[6px] p-6 mb-8">
        <h3 className="text-sm font-semibold text-primary font-headline mb-2 flex items-center gap-2">
          <Zap size={16} className="text-secondary" /> How it works
        </h3>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          Top up once. Each inference debits your platform balance — creators earn per request. Use keys from the marketplace
          in any project that calls Sentinal&apos;s proxy.
        </p>
      </div>

      <div className="bg-surface-container-lowest border border-surface-variant rounded-[6px] p-6">
        <h3 className="text-sm font-semibold text-primary font-headline mb-6 flex items-center gap-2">
          <History size={18} className="text-on-surface-variant" />
          Transaction history
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Details</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t._id} className="border-t border-surface-variant/80">
                  <td className="py-3 pr-4">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-[4px] ${
                        t.type === 'deposit' ? 'bg-secondary-container/50 text-on-secondary-container' : 'bg-error-container/30 text-error'
                      }`}
                    >
                      {t.type === 'deposit' ? 'Deposit' : 'Usage'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-on-surface-variant">{t.details}</td>
                  <td className={`py-3 pr-4 font-mono text-xs ${t.type === 'deposit' ? 'text-on-secondary-container' : 'text-error'}`}>
                    {t.type === 'deposit' ? '+' : '-'}
                    {t.amountAlgo} ALGO
                  </td>
                  <td className="py-3 text-on-surface-variant text-xs">{new Date(t.timestamp).toLocaleString()}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-on-surface-variant">
                    No transactions yet. Top up to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isTopUpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/20 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-[6px] p-8 max-w-sm w-full shadow-[0_20px_40px_rgba(3,22,52,0.12)]">
            <h3 className="font-headline text-xl font-semibold text-primary mb-2">Top up balance</h3>
            <p className="text-sm text-on-surface-variant mb-6">Send ALGO to your platform balance via Pera.</p>
            <form onSubmit={handleTopUp} className="flex flex-col gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                  Amount (ALGO)
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  disabled={processingPayment}
                  className="w-full text-xl font-bold bg-surface-container-high border-0 border-b-2 border-surface-variant focus:border-primary rounded-t-[6px] p-4 text-primary text-center outline-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTopUpOpen(false)}
                  disabled={processingPayment}
                  className="px-4 py-2 rounded-[6px] text-sm text-on-surface-variant hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="px-6 py-2 rounded-[6px] text-sm font-semibold bg-primary text-on-primary disabled:opacity-50"
                >
                  {processingPayment ? 'Processing…' : 'Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
