import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from './hooks/useWallet';
import { AuthProvider, useAuth } from './hooks/useAuth';

import Navbar from './components/Navbar';
import StitchFooter from './components/StitchFooter';
import Landing from './pages/Landing';
import About from './pages/About';
import HowItWorks from './pages/HowItWorks';
import Connect from './pages/Connect';
import Login from './pages/Login';
import Marketplace from './pages/Marketplace';
import Chat from './pages/Chat';
import DeveloperDashboard from './pages/DeveloperDashboard';
import UserDashboard from './pages/UserDashboard';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { token, role } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) {
    return <Navigate to={role === 'developer' ? '/dashboard' : '/user-dashboard'} replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-surface text-on-surface">
      <Navbar />
      <main className="flex-1 w-full relative">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/connect" element={<Connect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/chat/:endpointId" element={<Chat />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="developer">
                <DeveloperDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-dashboard"
            element={
              <ProtectedRoute requiredRole="user">
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <StitchFooter />
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <AuthProvider>
        <Router>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#ffffff',
                color: '#1a1c1c',
                border: '1px solid #e2e2e2',
                borderRadius: '6px',
                boxShadow: '0 20px 40px rgba(3, 22, 52, 0.06)',
              },
            }}
          />
          <AppRoutes />
        </Router>
      </AuthProvider>
    </WalletProvider>
  );
}
