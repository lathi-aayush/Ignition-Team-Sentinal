import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext.jsx";
import PeraRegistrationModal from "../components/PeraRegistrationModal.jsx";
import WalletConnectModal from "../components/WalletConnectModal.jsx";
import { setLoginWalletId } from "../wallet/signLoginChallenge.js";
import { connectPera } from "../wallet/pera.js";

const WalletLoginContext = createContext(null);

function isUserCancelError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  return /cancel|reject|denied|closed|user refused|aborted/.test(msg);
}

function formatConnectError(err) {
  if (err?.response?.data?.error) return String(err.response.data.error);
  if (err?.code === "ERR_NETWORK" || !err?.response) {
    return "Cannot reach the server. Check your connection and try again.";
  }
  return err?.message || "Wallet login failed";
}

export function PeraLoginProvider({ children }) {
  const navigate = useNavigate();
  const { login, user, isAuthenticated } = useAuth();

  const [busy, setBusy] = useState(false);
  const [showReg, setShowReg] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [regRole, setRegRole] = useState("user");
  const [regWallet, setRegWallet] = useState("");
  const [regRedirect, setRegRedirect] = useState("/dashboard/home");
  const [pendingConnect, setPendingConnect] = useState({
    role: "user",
    redirect: "/marketplace/browse",
    shouldNavigate: true,
  });
  const regResolveRef = useRef(null);
  const connectPromiseRef = useRef(null);

  const resolveConnectPromise = useCallback((value) => {
    connectPromiseRef.current?.(value);
    connectPromiseRef.current = null;
  }, []);

  const finishRegistration = useCallback(
    (redirect) => {
      setShowReg(false);
      const target = redirect || regRedirect || "/dashboard/home";
      navigate(regRole === "creator" ? "/creator" : target);
      regResolveRef.current?.(true);
      regResolveRef.current = null;
      resolveConnectPromise(true);
    },
    [navigate, regRedirect, regRole, resolveConnectPromise]
  );

  const completeLogin = useCallback(
    async (addr, { role, afterLogin, shouldNavigate }) => {
      toast.loading("Signing in...", { id: "wallet-login" });
      const res = await login(addr, role);

      if (res.needsProfile || res.isNewUser) {
        setRegWallet(addr);
        setRegRole(role);
        setRegRedirect(afterLogin);
        setShowReg(true);
        toast.success("Wallet connected! Choose a display name to finish setup.", {
          id: "wallet-login",
          duration: 5000,
        });
        return new Promise((resolve) => {
          regResolveRef.current = resolve;
        });
      }

      toast.success(`Welcome back${res.user.displayName ? `, ${res.user.displayName}` : ""}!`, {
        id: "wallet-login",
      });
      if (shouldNavigate) navigate(afterLogin);
      resolveConnectPromise(true);
      return true;
    },
    [login, navigate, resolveConnectPromise]
  );

  const connectWithWallet = useCallback(
    async (wallet, options = {}) => {
      const role = options.role || pendingConnect.role || "user";
      const afterLogin =
        options.redirect ||
        pendingConnect.redirect ||
        (role === "creator" ? "/creator" : "/dashboard/home");
      const shouldNavigate = options.navigate !== false;

      if (isAuthenticated && user) {
        const hasCapability =
          user.role === role || (role === "user" && user.role === "creator");
        if (hasCapability) {
          if (shouldNavigate && options.redirect) navigate(afterLogin);
          return true;
        }
      }

      setBusy(true);
      setShowWalletModal(false);
      const walletName = wallet.metadata?.name || wallet.id;

      try {
        toast.loading(`Connecting ${walletName}...`, { id: "wallet-login" });
        const walletKey = String(wallet.id || wallet.walletKey || wallet.metadata?.name || "").toLowerCase();

        if (walletKey.includes("pera")) {
          setLoginWalletId(wallet.id || wallet.walletKey || "pera");
          if (typeof wallet.setActive === "function") wallet.setActive();
          const addr = await connectPera();
          return await completeLogin(addr, { role, afterLogin, shouldNavigate });
        }

        setLoginWalletId(wallet.id || wallet.walletKey || "");
        if (typeof wallet.setActive === "function") wallet.setActive();
        const accounts = await wallet.connect();
        const addr =
          wallet.activeAccount?.address ||
          accounts?.[0]?.address ||
          accounts?.[0];
        if (!addr || typeof addr !== "string") {
          throw new Error("Could not read wallet address after connect.");
        }

        await new Promise((r) => setTimeout(r, 150));

        return await completeLogin(addr, { role, afterLogin, shouldNavigate });
      } catch (e) {
        console.error(e);
        toast.error(formatConnectError(e), { id: "wallet-login" });
        try {
          await wallet.disconnect();
        } catch {
          /* ignore */
        }
        resolveConnectPromise(false);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [completeLogin, isAuthenticated, user, navigate, pendingConnect, resolveConnectPromise]
  );

  /** Opens multi-wallet picker (use-wallet). Resolves when login finishes or modal closes. */
  const openConnectModal = useCallback((options = {}) => {
    const role = options.role || "user";
    const afterLogin =
      options.redirect || (role === "creator" ? "/creator" : "/marketplace/browse");
    setPendingConnect({
      role,
      redirect: afterLogin,
      shouldNavigate: options.navigate !== false,
    });
    setShowWalletModal(true);
    return new Promise((resolve) => {
      connectPromiseRef.current = resolve;
    });
  }, []);

  /** Connect via standalone Pera Wallet, then sign in. */
  const connectWithPera = useCallback(
    async (options = {}) => {
      const role = options.role || "user";
      const afterLogin =
        options.redirect || (role === "creator" ? "/creator" : "/dashboard/home");
      const shouldNavigate = options.navigate !== false;

      if (isAuthenticated && user) {
        const hasCapability =
          user.role === role || (role === "user" && user.role === "creator");
        if (hasCapability) {
          if (shouldNavigate && options.redirect) navigate(afterLogin);
          return true;
        }
      }

      setBusy(true);
      setShowWalletModal(false);
      try {
        toast.loading("Open Pera Wallet to connect…", { id: "wallet-login" });
        setLoginWalletId("pera");
        const addr = await connectPera();
        return await completeLogin(addr, { role, afterLogin, shouldNavigate });
      } catch (e) {
        console.error(e);
        if (!isUserCancelError(e)) {
          toast.error(formatConnectError(e), { id: "wallet-login" });
        } else {
          toast.error("Wallet connection cancelled.", { id: "wallet-login" });
        }
        resolveConnectPromise(false);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [completeLogin, isAuthenticated, user, navigate, resolveConnectPromise]
  );

  /** Opens multi-wallet picker for Defly, Exodus, etc. */
  const connectWithOtherWallets = useCallback(
    (options = {}) => openConnectModal(options),
    [openConnectModal]
  );

  const value = useMemo(
    () => ({
      connectWithPera,
      enterWithPera: connectWithPera,
      connectWithOtherWallets,
      connectWithWallet,
      openConnectModal,
      busy,
    }),
    [connectWithPera, connectWithOtherWallets, connectWithWallet, openConnectModal, busy]
  );

  return (
    <WalletLoginContext.Provider value={value}>
      {children}
      <WalletConnectModal
        open={showWalletModal}
        role={pendingConnect.role}
        busy={busy}
        onClose={() => {
          setShowWalletModal(false);
          resolveConnectPromise(false);
        }}
        onSelectWallet={(wallet) => connectWithWallet(wallet, pendingConnect)}
        onConnectPera={() => connectWithPera(pendingConnect)}
      />
      <PeraRegistrationModal
        open={showReg}
        walletAddress={regWallet}
        role={regRole}
        redirect={regRedirect}
        onClose={() => {
          setShowReg(false);
          regResolveRef.current?.(false);
          regResolveRef.current = null;
          resolveConnectPromise(false);
        }}
        onComplete={finishRegistration}
      />
    </WalletLoginContext.Provider>
  );
}

export function usePeraLogin() {
  const ctx = useContext(WalletLoginContext);
  if (!ctx) throw new Error("usePeraLogin must be used within PeraLoginProvider");
  return ctx;
}

/** Alias for multi-wallet login hook. */
export function useWalletLogin() {
  return usePeraLogin();
}
