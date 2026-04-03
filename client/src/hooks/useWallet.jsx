import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import algosdk from 'algosdk';
import toast from 'react-hot-toast';

const peraWallet = new PeraWalletConnect();

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState(null);

  const handleDisconnectWallet = useCallback(async () => {
    await peraWallet.disconnect();
    setWalletAddress(null);
  }, []);

  useEffect(() => {
    peraWallet.reconnectSession().then((accounts) => {
      if (accounts.length) {
        setWalletAddress(accounts[0]);
      }
    });

    peraWallet.connector?.on('disconnect', handleDisconnectWallet);

    return () => {
      peraWallet.connector?.off('disconnect', handleDisconnectWallet);
    };
  }, [handleDisconnectWallet]);

  const handleConnectWallet = async () => {
    try {
      const newAccounts = await peraWallet.connect();
      setWalletAddress(newAccounts[0]);
      toast.success("Wallet connected!");
      return newAccounts[0];
    } catch (error) {
      if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
        toast.error("Failed to connect wallet.");
      }
      return null;
    }
  };

  const signMessage = async (messageStr) => {
      try {
          const enc = new TextEncoder();
          const messageBytes = enc.encode(messageStr);
          const signature = await peraWallet.signData([{ data: messageBytes, message: 'SentinelAI Authentication' }], walletAddress);
          return signature[0];
      } catch (err) {
          console.error(err);
          toast.error("User rejected signature");
          throw err;
      }
  };

  const initiatePayment = async (recipientAddress, priceAlgo) => {
      const algodNodeHost = import.meta.env.VITE_ALGORAND_NODE || 'https://testnet-api.algonode.cloud';

      let fromAddr = walletAddress;
      if (!fromAddr) {
        try {
          const accounts = await peraWallet.reconnectSession();
          if (accounts?.length) {
            fromAddr = accounts[0];
            setWalletAddress(fromAddr);
          }
        } catch {
          /* reconnect failed */
        }
      }

      if (!fromAddr) {
        toast.error('Wallet not connected. Open Pera and connect, then try again.');
        throw new Error('Wallet address missing');
      }

      if (!recipientAddress || typeof recipientAddress !== 'string') {
        toast.error('Treasury address missing. Set VITE_TREASURY_WALLET in client .env');
        throw new Error('Recipient address missing');
      }

      const trimmedTo = recipientAddress.trim();
      if (!algosdk.isValidAddress(trimmedTo)) {
        toast.error('Invalid treasury address. Check VITE_TREASURY_WALLET in client .env');
        throw new Error('Invalid recipient address');
      }

      try {
          const algodClient = new algosdk.Algodv2('', algodNodeHost, '');
          const params = await algodClient.getTransactionParams().do();

          const noteBytes = new TextEncoder().encode('SentinelAI payment');

          const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
              from: fromAddr,
              to: trimmedTo,
              amount: algosdk.algosToMicroalgos(priceAlgo),
              suggestedParams: params,
              note: noteBytes,
          });

          const singleTxnGroup = [{ txn }];
          const signedTxn = await peraWallet.signTransaction([singleTxnGroup]);

          const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
          return txId;
      } catch (err) {
          console.error("Payment Error:", err);
          const skipGenericToast =
            err?.message === 'Wallet address missing' ||
            err?.message === 'Recipient address missing' ||
            err?.message === 'Invalid recipient address';
          if (!skipGenericToast) {
            toast.error("Payment failed or cancelled.");
          }
          throw err;
      }
  }

  return (
    <WalletContext.Provider value={{
      walletAddress,
      connectWallet: handleConnectWallet,
      disconnectWallet: handleDisconnectWallet,
      signMessage,
      initiatePayment
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
