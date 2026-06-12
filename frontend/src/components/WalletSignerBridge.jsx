import { useEffect } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import { useWalletLogin } from "../context/PeraLoginContext.jsx";
import {
  registerWalletSigner,
  clearWalletSigner,
} from "../wallet/walletSignerBridge.js";
import { normalizeAccountAddress } from "../wallet/addressUtils.js";

/** Injects use-wallet signers into non-React payment helpers. */
export default function WalletSignerBridge() {
  const {
    signTransactions,
    signData: walletSignData,
    activeAddress,
    activeWallet,
    isReady,
  } = useWallet();
  const { openConnectModal } = useWalletLogin();

  useEffect(() => {
    if (!isReady) return;

    const activeWalletId = String(activeWallet?.id || activeWallet?.walletKey || "").toLowerCase();

    const signMessage =
      typeof walletSignData === "function" && !activeWalletId.includes("pera")
        ? async (messageBytes, address) => {
            const signer = normalizeAccountAddress(address) || activeAddress;
            if (!signer) {
              throw new Error("No active wallet address for login signing.");
            }
            return walletSignData(
              [{ data: messageBytes, message: "Sign in to SentinelAI" }],
              signer
            );
          }
        : null;

    registerWalletSigner({
      signTransactions,
      getActiveAddress: () => activeAddress,
      getActiveWalletId: () => activeWallet?.id || activeWallet?.walletKey || "",
      getActiveWalletName: () => activeWallet?.metadata?.name || activeWallet?.id || "Wallet",
      openConnectModal,
      signMessage,
    });

    return () => clearWalletSigner();
  }, [
    signTransactions,
    walletSignData,
    activeAddress,
    activeWallet,
    isReady,
    openConnectModal,
  ]);

  return null;
}
