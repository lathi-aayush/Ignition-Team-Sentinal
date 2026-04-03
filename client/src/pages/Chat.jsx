import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import api from '../lib/api';
import PaymentStatus from '../components/PaymentStatus';
import toast from 'react-hot-toast';

export default function Chat() {
  const { endpointId } = useParams();
  const [endpoint, setEndpoint] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('idle');
  const { initiatePayment, walletAddress } = useWallet();

  useEffect(() => {
    api
      .get(`/endpoints/${endpointId}`)
      .then((res) => setEndpoint(res.data))
      .catch((err) => {
        toast.error('Failed to load endpoint details');
        console.error(err);
      });
  }, [endpointId]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!walletAddress) {
      toast.error('Please connect wallet first');
      return;
    }

    try {
      setResponse('');
      setStatus('initiating');

      const txId = await initiatePayment(endpoint.ownerWallet, endpoint.priceAlgo);

      setStatus('confirming');

      setStatus('calling_ai');

      const res = await api.post(
        `/proxy/${endpointId}`,
        {
          prompt,
          txID: txId,
        },
        { timeout: 40000 }
      );

      setResponse(res.data.response);
      setStatus('done');
      toast.success('Generation complete!');
    } catch (error) {
      console.error(error);
      setStatus('error');
      toast.error(error.response?.data?.error || 'An error occurred during generation');
    }
  };

  if (!endpoint) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center bg-surface text-on-surface-variant">
        Loading endpoint…
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row gap-8 bg-surface min-h-[calc(100vh-4rem)]">
      <div className="w-full md:w-1/3 flex flex-col gap-6">
        <Link
          to="/marketplace"
          className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1 w-fit"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Marketplace
        </Link>

        <div className="bg-surface-container-lowest border border-surface-variant rounded-[6px] p-6">
          <div className="mb-6">
            <h2 className="font-headline text-lg font-semibold text-primary mb-1">{endpoint.name}</h2>
            <span className="text-secondary text-xs font-bold uppercase tracking-wider">{endpoint.model}</span>
          </div>

          <div className="bg-surface-container-low rounded-[6px] p-4 mb-6">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-on-surface-variant uppercase tracking-wide">Est. cost</span>
              <span className="font-bold text-primary font-headline">{endpoint.priceAlgo} ALGO</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
              Prompt
            </label>
            <textarea
              className="w-full h-40 bg-surface-container-high border-0 border-b-2 border-surface-variant focus:border-primary rounded-t-[6px] p-4 text-sm text-primary outline-none resize-none placeholder:text-on-surface-variant/60"
              placeholder="Ask anything…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={status !== 'idle' && status !== 'done' && status !== 'error'}
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!prompt.trim() || (status !== 'idle' && status !== 'done' && status !== 'error')}
            className="w-full py-3.5 bg-primary text-on-primary rounded-[6px] text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
          >
            Pay &amp; generate
          </button>
        </div>

        <PaymentStatus status={status} />
      </div>

      <div className="w-full md:w-2/3 bg-surface-container-lowest border border-surface-variant rounded-[6px] p-6 min-h-[500px] flex flex-col">
        <h3 className="text-sm font-semibold text-primary font-headline mb-4">Response</h3>

        {response ? (
          <div className="bg-surface-container-low rounded-[6px] p-6 min-h-[400px] flex-1">
            <p className="text-on-surface text-sm whitespace-pre-wrap leading-relaxed">{response}</p>
          </div>
        ) : (
          <div className="bg-surface-container-low rounded-[6px] p-6 min-h-[400px] flex-1 flex items-center justify-center text-on-surface-variant text-sm text-center px-6">
            {status === 'idle' ? 'Enter a prompt and pay to see the response.' : 'Waiting for completion…'}
          </div>
        )}
      </div>
    </div>
  );
}
