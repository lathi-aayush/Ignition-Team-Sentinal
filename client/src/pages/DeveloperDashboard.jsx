import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Key, Copy, Banknote, History, LayoutDashboard, Terminal } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function DeveloperDashboard() {
  const { initiatePayment } = useWallet();
  const [data, setData] = useState({ balance: 0, apiKeys: [], transactions: [] });
  const [loading, setLoading] = useState(true);

  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('0.5');
  const [keyName, setKeyName] = useState('');
  const [newRawKey, setNewRawKey] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const loadData = () => {
    setLoading(true);
    api
      .get('/developer/dashboard')
      .then((res) => setData(res.data))
      .catch(() => toast.error('Failed to load dashboard data'))
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
      const treasury = import.meta.env.VITE_TREASURY_WALLET || 'TREASURY_WALLET_ADDRESS_HERE';
      if (treasury === 'TREASURY_WALLET_ADDRESS_HERE') {
        toast.error('VITE_TREASURY_WALLET not set in .env. Cannot process.');
        setProcessingPayment(false);
        return;
      }

      toast('Please sign the transaction in Pera Wallet...', { icon: '⏳' });
      const amountNum = parseFloat(topUpAmount);

      const txId = await initiatePayment(treasury, amountNum);

      toast('Confirming on Algorand blockchain...', { icon: '🔄' });

      await api.post('/wallet/deposit', { txID: txId }, { timeout: 40000 });

      toast.success(`Successfully deposited ${amountNum} ALGO!`);
      setIsTopUpOpen(false);
      setTopUpAmount('0.5');
      loadData();
    } catch (err) {
      toast.error('Top up failed.');
      console.error(err);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/developer/keys', { name: keyName });
      setNewRawKey(res.data.rawKey);
      loadData();
    } catch {
      toast.error('Failed to generate key');
    }
  };

  const totalRequests = data.transactions?.filter((t) => t.type === 'usage' || t.details?.includes?.('API')).length ?? 0;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-surface text-on-surface-variant">
        Loading creator portal…
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-surface text-on-surface">
      <aside className="hidden lg:flex w-56 flex-col border-r border-surface-variant bg-surface-container-low py-8 px-3 shrink-0">
        <nav className="flex flex-col gap-1">
          <div className="flex items-center gap-2 px-3 py-2 rounded-[6px] bg-surface-container-lowest border border-surface-variant text-primary">
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Dashboard</span>
          </div>
          <Link
            to="/marketplace"
            className="flex items-center gap-2 px-3 py-2 rounded-[6px] text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <Terminal className="w-4 h-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Marketplace</span>
          </Link>
        </nav>
      </aside>

      <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-10">
          <div>
            <h1 className="font-headline text-2xl md:text-3xl font-semibold text-primary mb-1">Creator dashboard</h1>
            <p className="text-sm text-on-surface-variant">API keys, balance, and activity — Sentinal Digital Ledger.</p>
          </div>

          <div className="bg-surface-container-lowest border border-surface-variant rounded-[6px] p-4 md:p-5 flex items-center justify-between gap-6 md:min-w-[280px]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Balance</p>
              <p className="text-2xl font-bold text-primary font-headline">
                {data.balance.toFixed(4)} <span className="text-base font-normal text-on-surface-variant">ALGO</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsTopUpOpen(true)}
              className="w-11 h-11 bg-primary text-on-primary rounded-[6px] flex items-center justify-center hover:opacity-90 transition-opacity shadow-[0_12px_24px_rgba(3,22,52,0.12)]"
              aria-label="Top up"
            >
              <Banknote size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="p-5 border border-surface-variant rounded-[6px] bg-surface-container-lowest">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">API keys</p>
            <p className="text-2xl font-bold text-primary font-headline">{data.apiKeys.length}</p>
          </div>
          <div className="p-5 border border-surface-variant rounded-[6px] bg-surface-container-lowest">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Ledger lines</p>
            <p className="text-2xl font-bold text-primary font-headline">{data.transactions.length}</p>
          </div>
          <div className="p-5 border border-surface-variant rounded-[6px] bg-surface-container-lowest">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Activity (approx.)</p>
            <p className="text-2xl font-bold text-primary font-headline">{totalRequests}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-surface-container-lowest border border-surface-variant rounded-[6px] p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-semibold text-primary font-headline flex items-center gap-2">
                  <Key size={18} className="text-secondary" />
                  API keys
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsKeyModalOpen(true);
                    setNewRawKey('');
                    setKeyName('');
                  }}
                  className="text-xs px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-primary rounded-[6px] font-semibold transition-colors flex items-center gap-2"
                >
                  <Plus size={16} /> Generate key
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {data.apiKeys.map((k) => (
                  <div
                    key={k._id}
                    className="bg-surface-container-low border border-transparent rounded-[6px] p-4 flex justify-between items-center gap-4"
                  >
                    <div>
                      <p className="font-semibold text-primary text-sm">{k.name}</p>
                      <p className="text-[11px] text-on-surface-variant mt-1">
                        Created {new Date(k.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-on-surface-variant uppercase tracking-wide">Last used</p>
                      <p className="text-sm text-on-surface">{k.lastUsed ? new Date(k.lastUsed).toLocaleDateString() : '—'}</p>
                    </div>
                  </div>
                ))}
                {data.apiKeys.length === 0 && (
                  <p className="text-on-surface-variant text-sm text-center py-6">No API keys yet.</p>
                )}
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-surface-variant rounded-[6px] p-6">
              <h3 className="text-sm font-semibold text-primary font-headline mb-6 flex items-center gap-2">
                <History size={18} className="text-on-surface-variant" />
                Transaction log
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-on-surface">
                  <thead className="text-[11px] uppercase tracking-wider text-on-surface-variant">
                    <tr>
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3 pr-4">Details</th>
                      <th className="pb-3 pr-4">Amount</th>
                      <th className="pb-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((t) => (
                      <tr key={t._id} className="border-t border-surface-variant/80">
                        <td className="py-3 pr-4 capitalize text-on-surface-variant">{t.type}</td>
                        <td className="py-3 pr-4 text-on-surface-variant">{t.details}</td>
                        <td className={`py-3 pr-4 font-mono text-xs ${t.amountAlgo > 0 ? 'text-on-secondary-container' : 'text-error'}`}>
                          {t.amountAlgo > 0 ? '+' : ''}
                          {t.amountAlgo}
                        </td>
                        <td className="py-3 text-on-surface-variant text-xs">{new Date(t.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                    {data.transactions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-on-surface-variant">
                          No activity yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low border border-surface-variant rounded-[6px] p-6 h-fit">
            <h3 className="text-sm font-semibold text-primary font-headline mb-3">Quick start</h3>
            <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
              Call the gateway with your <code className="font-mono text-primary">x-api-key</code>.
            </p>
            <pre className="bg-surface-container-highest rounded-[6px] p-4 font-mono text-[11px] text-on-surface leading-relaxed whitespace-pre-wrap break-all">
              {`curl -X POST http://localhost:5000/api/generate \\
  -H 'x-api-key: YOUR_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"model":"groq","messages":[{"role":"user","content":"Hello"}]}'`}
            </pre>
          </div>
        </div>
      </div>

      {isTopUpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/20 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-[6px] p-8 max-w-sm w-full shadow-[0_20px_40px_rgba(3,22,52,0.12)]">
            <h3 className="font-headline text-xl font-semibold text-primary mb-2">Top up balance</h3>
            <p className="text-sm text-on-surface-variant mb-6">Deposit ALGO to the treasury via Pera.</p>
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
                  className="w-full text-xl font-bold bg-surface-container-high border-0 border-b-2 border-surface-variant focus:border-primary rounded-t-[6px] p-4 text-primary text-center outline-none transition-colors"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTopUpOpen(false)}
                  disabled={processingPayment}
                  className="px-4 py-2 rounded-[6px] text-sm font-medium text-on-surface-variant hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="px-6 py-2 rounded-[6px] text-sm font-semibold bg-primary text-on-primary hover:opacity-90 disabled:opacity-50"
                >
                  {processingPayment ? 'Processing…' : 'Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/20 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-[6px] p-8 max-w-md w-full shadow-[0_20px_40px_rgba(3,22,52,0.12)]">
            <h3 className="font-headline text-xl font-semibold text-primary mb-2 text-center">New API key</h3>

            {newRawKey ? (
              <div className="mt-6">
                <div className="bg-error-container/30 border border-error/20 rounded-[6px] p-4 mb-4">
                  <p className="text-error text-sm font-medium">Copy now — this secret is shown once.</p>
                </div>
                <div className="flex bg-surface-container-low border border-surface-variant rounded-[6px] p-2 items-center gap-2 mb-6">
                  <code className="text-primary font-mono text-xs flex-1 break-all px-2">{newRawKey}</code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newRawKey);
                      toast.success('Copied');
                    }}
                    className="p-3 bg-surface-container-high hover:bg-surface-container-highest rounded-[6px] text-on-surface transition-colors"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="w-full py-3 bg-primary text-on-primary rounded-[6px] text-sm font-semibold hover:opacity-90"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="mt-6 flex flex-col gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                    Key name
                  </label>
                  <input
                    required
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full bg-surface-container-high border-0 border-b-2 border-surface-variant focus:border-primary rounded-t-[6px] p-3 text-sm text-primary outline-none"
                    placeholder="e.g. Production backend"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsKeyModalOpen(false)}
                    className="px-4 py-2 rounded-[6px] text-sm text-on-surface-variant hover:text-primary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-6 py-2 rounded-[6px] text-sm font-semibold bg-primary text-on-primary">
                    Generate
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
