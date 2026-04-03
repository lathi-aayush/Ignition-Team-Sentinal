import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  addressesEqual,
  connectPera,
  normalizeAccountAddress,
  reconnectPera,
  signAndSendPayment,
} from "../wallet/pera.js";

export default function ServiceDetail() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/api/services/${id}`);
        if (!cancelled) setService(data);
      } catch {
        toast.error("Service not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function payAndAccess() {
    // 1. Validate session wallet from auth context
    const sessionWallet = normalizeAccountAddress(user?.walletAddress);
    if (!sessionWallet) {
      toast.error("Session missing wallet. Sign out and sign in again.");
      return;
    }

    // 2. Validate service ID format
    if (!id || !/^[a-f0-9]{24}$/i.test(id)) {
      toast.error("Invalid service link.");
      return;
    }

    setPaying(true);
    setApiKey(null);

    try {
      // 3. Try to reconnect existing Pera session first
      let active = await reconnectPera(); // returns null if no prior session

      // 4. No prior session — open the connect modal
      if (!active) {
        try {
          active = await connectPera();
        } catch (connectErr) {
          // User dismissed the modal or connection failed
          toast.error("Pera Wallet connection cancelled or failed. Please try again.");
          return;
        }
      }

      // 5. Defensive: active must be a non-empty string at this point
      if (!active || typeof active !== "string") {
        toast.error("Could not retrieve wallet address from Pera. Please try again.");
        return;
      }

      // 6. Ensure live wallet matches the signed-in session wallet
      if (!(await addressesEqual(active, sessionWallet))) {
        toast.error(
          "Pera account doesn't match your signed-in wallet. Sign out and sign in with the correct account."
        );
        return;
      }

      // 7. Create payment intent on backend
      const { data: intent } = await api.post("/api/payment/create", { serviceId: id });
      const receiver = normalizeAccountAddress(intent?.receiver);
      const micro = Number(intent?.amountMicroAlgos);
      if (!receiver || !Number.isFinite(micro) || micro <= 0) {
        toast.error("Invalid payment details from server (missing receiver or amount).");
        return;
      }

      // 8. Sign and send — `active` is the verified live address
      const { txId } = await signAndSendPayment({
        from: active,
        to: receiver,
        amountMicroAlgos: micro,
        noteStr: intent.note,
        algodServer: intent.algodServer,
      });

      toast.success("Transaction sent. Verifying…");

      // 9. Verify on backend and retrieve API key
      const { data: verified } = await api.post("/api/payment/verify", {
        txId,
        paymentIntentId: intent.paymentIntentId,
      });

      if (verified?.apiKey) {
        setApiKey(verified.apiKey);
        setShowKeyModal(true);
        toast.success("Payment verified. API key ready.");
      } else {
        toast.error("Payment verified but no API key returned. Contact support.");
      }
    } catch (e) {
      console.error("payAndAccess error:", e);
      const d = e?.response?.data;
      const validation =
        Array.isArray(d?.errors) && d.errors[0]?.msg
          ? d.errors.map((x) => x.msg).join(" ")
          : null;
      const msg = d?.error || validation || e?.message || "Payment failed";
      const detail = d?.detail;
      toast.error(detail ? `${msg}: ${detail}` : msg);
    } finally {
      setPaying(false);
    }
  }

  function handleCopyKey() {
    if (!apiKey) return;
    navigator.clipboard
      .writeText(apiKey)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Copy failed. Please copy manually."));
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-6 bg-surface flex items-center justify-center">
        <p className="text-on-surface-variant animate-pulse">Loading service…</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen pt-24 px-6 bg-surface flex flex-col items-center justify-center gap-4">
        <p className="text-on-surface-variant">Service not found.</p>
        <Link to="/user/marketplace" className="text-sm text-secondary hover:underline">
          ← Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      {/* Navbar */}
      <nav className="bg-white flex justify-between items-center h-16 px-6 w-full border-b border-slate-100 fixed top-0 z-40">
        <Link to="/user/marketplace" className="text-sm text-secondary hover:underline">
          ← Marketplace
        </Link>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-container-low">
          <span className="material-symbols-outlined text-sm text-on-surface-variant">
            account_balance_wallet
          </span>
          <span className="text-sm font-mono truncate max-w-[160px]">
            {user?.walletAddress ?? "—"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="text-sm text-on-surface-variant hover:text-on-surface"
        >
          Sign out
        </button>
      </nav>

      {/* Main content */}
      <div className="pt-24 px-6 max-w-3xl mx-auto pb-24">
        <h1 className="font-headline text-3xl font-semibold text-primary">{service.title}</h1>
        <p className="mt-4 text-on-surface-variant leading-relaxed">{service.description}</p>

        <div className="mt-8 p-6 bg-white border border-surface-variant rounded-md editorial-shadow">
          <p className="text-sm text-on-surface-variant">Price</p>
          <p className="font-mono text-2xl font-semibold text-secondary mt-1">
            {Number(service.price).toFixed(4)} ALGO
          </p>
          <button
            type="button"
            disabled={paying}
            onClick={payAndAccess}
            className="mt-6 w-full sm:w-auto bg-primary text-white px-8 py-3 rounded-md font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {paying ? "Processing…" : "Pay & Get Access"}
          </button>
        </div>
      </div>

      {/* API Key Modal */}
      {showKeyModal && apiKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="api-key-modal-title"
        >
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-md border border-surface-variant p-8 shadow-xl">
            <h2
              id="api-key-modal-title"
              className="font-headline text-xl font-semibold text-primary"
            >
              Your API Key
            </h2>
            <p className="text-sm text-on-surface-variant mt-2">
              Store this key securely — it will not be shown again in full.
            </p>
            <div className="mt-4 p-4 bg-surface-container rounded-md font-mono text-xs break-all border border-outline-variant select-all">
              {apiKey}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleCopyKey}
                className="bg-secondary text-on-secondary px-4 py-2 rounded-md text-sm hover:opacity-90 transition-opacity"
              >
                Copy Key
              </button>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="text-sm text-on-surface-variant underline hover:text-on-surface"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}