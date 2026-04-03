import { useState, useEffect } from 'react';
import api from '../lib/api';
import EndpointCard from '../components/EndpointCard';

export default function Marketplace() {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api
      .get('/endpoints')
      .then((res) => setEndpoints(res.data))
      .catch((err) => console.error('Failed to load endpoints', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = endpoints.filter((ep) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      ep.name?.toLowerCase().includes(q) ||
      ep.description?.toLowerCase().includes(q) ||
      ep.model?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-surface">
        <div className="w-9 h-9 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-14 bg-[#f9f9f9] min-h-[calc(100vh-8rem)]">
      <div className="mb-10">
        <h1 className="font-headline text-2xl font-semibold text-primary leading-tight">Marketplace</h1>
        <p className="text-on-surface-variant text-sm mt-1">Find AI APIs. Pay per request from your prepaid balance.</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center mb-10 gap-4">
        <div className="relative w-full md:max-w-[360px]">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search models, names, providers…"
            className="w-full pl-12 pr-4 py-3 bg-surface-container-high border-0 rounded-[6px] text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">sort</span>
          Sorted by activity
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-surface-container-lowest border border-surface-variant rounded-[6px]">
          <p className="text-on-surface-variant">
            {endpoints.length === 0
              ? 'No endpoints listed yet. Creators can publish from the dashboard.'
              : 'No APIs match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((ep) => (
            <EndpointCard key={ep._id} endpoint={ep} />
          ))}
        </div>
      )}
    </div>
  );
}
