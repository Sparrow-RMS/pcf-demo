import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RawMaterials from "./pages/RawMaterials";
import EmissionFactors from "./pages/EmissionFactors";
import Suppliers from "./pages/Suppliers";
import TransportLanes from "./pages/TransportLanes";
import Machines from "./pages/Machines";
import Plants from "./pages/Plants";
import SKUs from "./pages/SKUs";
import BOMs from "./pages/BOMs";
import Batches from "./pages/Batches";
import BatchDetail from "./pages/BatchDetail";
import Certificates from "./pages/Certificates";
import AuditLogs from "./pages/AuditLogs";
import Users from "./pages/Users";
import Layout from "./components/Layout";
import "./App.css";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role) && user.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/raw-materials" element={<RawMaterials />} />
            <Route path="/emission-factors" element={<EmissionFactors />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/transport-lanes" element={<TransportLanes />} />
            <Route path="/machines" element={<Machines />} />
            <Route path="/plants" element={<Plants />} />
            <Route path="/skus" element={<SKUs />} />
            <Route path="/boms" element={<BOMs />} />
            <Route path="/batches" element={<Batches />} />
            <Route path="/batches/:id" element={<BatchDetail />} />
            <Route path="/certificates" element={<Certificates />} />
            <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={['auditor', 'superadmin']}><AuditLogs /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute allowedRoles={['superadmin']}><Users /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
