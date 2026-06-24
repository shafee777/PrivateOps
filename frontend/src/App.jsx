import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VaultProvider } from './context/VaultContext';
import Sidebar from './components/Sidebar';
import LockModal from './components/LockModal';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Vault from './pages/Vault';
import Notes from './pages/Notes';
import Finance from './pages/Finance';
import Search from './pages/Search';
import Timeline from './pages/Timeline';
import Settings from './pages/Settings';

// Route Guard for authenticated paths
function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

// Route Guard for auth pages (redirect to dashboard if logged in)
function PublicRoute({ children }) {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/" replace />;
}

// Master Layout for workspace
function WorkspaceLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-dark-900">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-8 relative">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/search" element={<Search />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <LockModal />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <VaultProvider>
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />

          {/* Authenticated Workspace Routes */}
          <Route 
            path="/*" 
            element={
              <PrivateRoute>
                <WorkspaceLayout />
              </PrivateRoute>
            } 
          />
        </Routes>
      </VaultProvider>
    </AuthProvider>
  );
}

export default App;
