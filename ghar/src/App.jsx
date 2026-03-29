import { useState, useCallback, useEffect } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import BottomNav from './components/BottomNav';
import QuickAdd from './components/QuickAdd';
import Auth from './pages/Auth';
import Tutorial from './pages/Tutorial';
import Dashboard from './pages/Dashboard';
import Meals from './pages/Meals';
import Planner from './pages/Planner';
import Grocery from './pages/Grocery';
import Pantry from './pages/Pantry';
import Chores from './pages/Chores';
import Settings from './pages/Settings';
import More from './pages/More';

function AppContent({ guestMode, exitGuest }) {
  const { user, profile, loading: authLoading } = useAuth();
  const data = useData();

  const [activePage, setActivePage] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [toastKey, setToastKey] = useState(0);

  useEffect(() => {
    if (!guestMode && profile?.dark_mode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (!guestMode) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [profile?.dark_mode, guestMode]);

  const showToast = useCallback((message) => {
    setToast(message);
    setToastKey((k) => k + 1);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Loading (only for signed-in users)
  if (!guestMode && (authLoading || (user && data.dataLoading))) {
    return (
      <div className="app-shell">
        <div className="loading-page">
          <div className="loading-logo">{'\uD83C\uDFE0'}</div>
          <div className="loading-text">Loading Ghar...</div>
        </div>
      </div>
    );
  }

  // Auth screen (only for non-guest, non-signed-in)
  if (!guestMode && !user) {
    return null; // Handled by parent
  }

  // Tutorial (signed-in users only)
  if (!guestMode && profile && !profile.tutorial_completed) {
    return (
      <div className="app-shell">
        <Tutorial />
      </div>
    );
  }

  const uncheckedGrocery = data.grocery.filter((g) => !g.checked).length;

  function renderPage() {
    switch (activePage) {
      case 'meals': return <Meals showToast={showToast} />;
      case 'planner': return <Planner showToast={showToast} setActivePage={setActivePage} />;
      case 'grocery': return <Grocery showToast={showToast} />;
      case 'pantry': return <Pantry showToast={showToast} />;
      case 'chores': return <Chores showToast={showToast} />;
      case 'settings':
        return guestMode ? (
          <div className="page">
            <div className="page-title">Guest Mode</div>
            <div className="page-subtitle">You're exploring without an account</div>
            <div className="card">
              <p className="text-sm mb-12">Create an account to save your data, sync across devices, and unlock all settings.</p>
              <button className="btn btn-primary btn-block" onClick={exitGuest}>Create Account or Sign In</button>
            </div>
          </div>
        ) : <Settings showToast={showToast} />;
      case 'more': return <More setActivePage={setActivePage} />;
      default: return <Dashboard setActivePage={setActivePage} showToast={showToast} onSettingsOpen={() => setActivePage('settings')} />;
    }
  }

  return (
    <div className="app-shell">
      {guestMode && (
        <div className="guest-banner" onClick={exitGuest}>
          Exploring as guest &middot; <strong>Sign up to save your data</strong>
        </div>
      )}
      {renderPage()}
      <QuickAdd showToast={showToast} />
      <BottomNav activePage={activePage} setActivePage={setActivePage} groceryCount={uncheckedGrocery} />
      {toast && <div key={toastKey} className="toast">{toast}</div>}
    </div>
  );
}

export default function App() {
  const [guestMode, setGuestMode] = useState(false);

  function handleGuestMode() {
    setGuestMode(true);
  }

  function exitGuest() {
    setGuestMode(false);
  }

  return (
    <AuthProvider>
      <DataProvider guestMode={guestMode}>
        {guestMode ? (
          <AppContent guestMode={true} exitGuest={exitGuest} />
        ) : (
          <AuthGate onGuestMode={handleGuestMode} exitGuest={exitGuest} />
        )}
      </DataProvider>
    </AuthProvider>
  );
}

function AuthGate({ onGuestMode, exitGuest }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="app-shell">
        <Auth onGuestMode={onGuestMode} />
      </div>
    );
  }

  return <AppContent guestMode={false} exitGuest={exitGuest} />;
}
