import { useState, createContext, useContext } from 'react';
import api from '../lib/api';
import { useWallet } from './useWallet';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [role, setRole] = useState(localStorage.getItem('role') || null);
  const { walletAddress, signMessage, disconnectWallet } = useWallet();

  // role param: 'developer' | 'user' — only used on first-time registration
  const login = async (role = 'user') => {
    if (!walletAddress) {
      toast.error('Please connect wallet first');
      return false;
    }
    try {
      const res1 = await api.get(`/auth/nonce?wallet=${walletAddress}`);
      const nonce = res1.data.nonce;
      const signature = await signMessage(nonce);

      const res2 = await api.post('/auth/verify', {
        walletAddress,
        signedMessage: signature,
        role // sent so backend assigns role on first login
      });

      const newToken = res2.data.token;
      const userRole = res2.data.role;

      setToken(newToken);
      setRole(userRole);
      localStorage.setItem('token', newToken);
      localStorage.setItem('role', userRole);

      toast.success('Successfully authenticated!');
      return true;
    } catch (err) {
      console.error('Auth Error', err);
      toast.error(err.response?.data?.error || 'Authentication failed.');
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    disconnectWallet();
  };

  return (
    <AuthContext.Provider value={{ token, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
