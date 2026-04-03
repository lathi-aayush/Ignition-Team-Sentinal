import { useState, useEffect } from 'react';
import { Activity, Plus, Play, Pause, ExternalLink } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function OwnerDashboard() {
  const [data, setData] = useState({ stats: {}, transactions: [], endpoints: [] });
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', model: 'claude', apiKey: '', priceAlgo: 0.05 });

  const loadData = () => {
      setLoading(true);
      api.get('/owner/analytics')
        .then(res => setData(res.data))
        .catch(err => toast.error('Failed to load dashboard data'))
        .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateEndpoint = async (e) => {
    e.preventDefault();
    try {
        await api.post('/endpoints', formData);
        toast.success("Endpoint created successfully");
        setIsModalOpen(false);
        setFormData({ name: '', description: '', model: 'claude', apiKey: '', priceAlgo: 0.05 });
        loadData();
    } catch (err) {
        toast.error("Failed to create endpoint");
    }
  };

  const handleToggle = async (id) => {
      try {
          await api.patch(`/endpoints/${id}/toggle`);
          loadData();
          toast.success("Status updated");
      } catch (err) {
          toast.error("Failed to update status");
      }
  };

  // Group transactions by date for the chart
  const chartData = [];
  if (data.transactions.length > 0) {
      const grouped = {};
      data.transactions.forEach(t => {
          const date = new Date(t.timestamp).toLocaleDateString();
          grouped[date] = (grouped[date] || 0) + 1;
      });
      for (const [date, calls] of Object.entries(grouped)) {
          chartData.push({ date, calls });
      }
      chartData.reverse(); // Ensure chronological
  }

  if (loading) return <div className="p-10 text-center text-zinc-400">Loading Dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-zinc-400 text-sm font-medium mb-2">Total Earned</h3>
            <p className="text-3xl font-bold text-white">{data.stats.totalEarned?.toFixed(2) || 0} ALGO</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-zinc-400 text-sm font-medium mb-2">Total API Calls</h3>
            <p className="text-3xl font-bold text-white">{data.stats.totalCalls || 0}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-zinc-400 text-sm font-medium mb-2">Active Endpoints</h3>
            <p className="text-3xl font-bold text-white">{data.stats.activeEndpoints || 0} / {data.endpoints.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Area: Chart & Traxs */}
          <div className="lg:col-span-2 flex flex-col gap-8">
              {/* Chart */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6">Call Volume (past 7 days)</h3>
                  <div className="h-[300px]">
                      {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <XAxis dataKey="date" stroke="#52525b" />
                                <YAxis stroke="#52525b" />
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                                <Line type="monotone" dataKey="calls" stroke="#6366f1" strokeWidth={3} />
                            </LineChart>
                        </ResponsiveContainer>
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-500">No activity yet.</div>
                      )}
                  </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6">Recent Transactions</h3>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-zinc-300">
                          <thead className="bg-zinc-950 text-zinc-400">
                              <tr>
                                  <th className="px-4 py-3 rounded-tl-lg">TxID</th>
                                  <th className="px-4 py-3">Endpoint</th>
                                  <th className="px-4 py-3">Amount</th>
                                  <th className="px-4 py-3 rounded-tr-lg">Time</th>
                              </tr>
                          </thead>
                          <tbody>
                              {data.transactions.slice(0, 10).map(t => (
                                  <tr key={t._id} className="border-b border-zinc-800/50">
                                      <td className="px-4 py-3 font-mono text-xs">
                                          <a href={`https://testnet.algoexplorer.io/tx/${t.txID}`} target="_blank" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                            {t.txID.slice(0, 8)}... <ExternalLink size={12} />
                                          </a>
                                      </td>
                                      <td className="px-4 py-3">{t.endpointId?.name || 'Unknown'}</td>
                                      <td className="px-4 py-3 text-green-400">+{t.amountPaid}</td>
                                      <td className="px-4 py-3">{new Date(t.timestamp).toLocaleTimeString()}</td>
                                  </tr>
                              ))}
                              {data.transactions.length === 0 && (
                                  <tr><td colSpan="4" className="text-center py-6 text-zinc-500">No transactions yet.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>

          {/* Right Sidebar: Endpoints */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-fit">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">Your Endpoints</h3>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center hover:bg-indigo-500/20 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                  {data.endpoints.map(ep => (
                      <div key={ep._id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                              <span className="font-bold text-white">{ep.name}</span>
                              <button 
                                onClick={() => handleToggle(ep._id)}
                                className={`p-1.5 rounded-md ${ep.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}
                              >
                                  {ep.isActive ? <Pause size={14} /> : <Play size={14} />}
                              </button>
                          </div>
                          <div className="flex justify-between text-xs text-zinc-500">
                              <span>{ep.model}</span>
                              <span>{ep.priceAlgo} ALGO / call</span>
                          </div>
                      </div>
                  ))}
                  {data.endpoints.length === 0 && (
                      <div className="text-center py-4 text-zinc-500 text-sm">No endpoints created yet.</div>
                  )}
              </div>
          </div>
      </div>

      {/* Basic Create Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
                  <h3 className="text-2xl font-bold text-white mb-6">New Sandbox Endpoint</h3>
                  <form onSubmit={handleCreateEndpoint} className="flex flex-col gap-4">
                      <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1">Entity Name</label>
                          <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. Acme Legal AI" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
                          <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 h-24 resize-none" placeholder="What does this AI do?" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1">Model Provider</label>
                          <select value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500">
                              <option value="claude">Anthropic Claude</option>
                              <option value="gpt-4">OpenAI GPT-4</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1">API Key</label>
                          <input required type="password" value={formData.apiKey} onChange={e => setFormData({...formData, apiKey: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500" placeholder="sk-ant-..." />
                          <p className="text-xs text-zinc-500 mt-1">Stored securely using AES-256 encryption.</p>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1">Price per Execution (ALGO)</label>
                          <input required type="number" step="0.001" value={formData.priceAlgo} onChange={e => setFormData({...formData, priceAlgo: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500" />
                      </div>
                      
                      <div className="flex justify-end gap-3 mt-4">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-lg font-medium text-zinc-400 hover:text-white transition-colors">Cancel</button>
                          <button type="submit" className="px-6 py-3 rounded-lg font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">Create</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
