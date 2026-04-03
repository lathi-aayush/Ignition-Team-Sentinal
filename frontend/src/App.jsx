import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Home from "./pages/Home.jsx";
import UserMarketplace from "./pages/UserMarketplace.jsx";
import ServiceDetail from "./pages/ServiceDetail.jsx";
import CreatorDashboard from "./pages/CreatorDashboard.jsx";
import CreateService from "./pages/CreateService.jsx";

function Guard({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body text-on-surface-variant">
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (user.role !== role) {
    return <Navigate to={user.role === "user" ? "/user/marketplace" : "/creator"} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/user/marketplace"
        element={
          <Guard role="user">
            <UserMarketplace />
          </Guard>
        }
      />
      <Route
        path="/user/services/:id"
        element={
          <Guard role="user">
            <ServiceDetail />
          </Guard>
        }
      />
      <Route
        path="/creator"
        element={
          <Guard role="creator">
            <CreatorDashboard />
          </Guard>
        }
      />
      <Route
        path="/creator/new"
        element={
          <Guard role="creator">
            <CreateService />
          </Guard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
