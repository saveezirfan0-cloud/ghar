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

function AppContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const data = useData();

  const [activePage, setActivePage] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [toastKey, setToastKey] = useState(0);

  // Apply dark mode from profile
  useEffect(() => {
    if (profile?.dark_mode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [profile?.dark_mode]);

  const showToast = useCallback((message) => {
    setToast(message);
    setToastKey((k) => k + 1);
    setTimeout(() => setToast(null), 2500);
  }, []);

  if (authLoading || (user && data.dataLoading)) {
    return (
      <div className="app-shell">
        <div className="loading-page">
          <div className="loading-logo">{'\uD83C\uDFE0'}</div>
          <div className="loading-text">Loading Ghar...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-shell">
        <Auth />
      </div>
    );
  }

  if (profile && !profile.tutorial_completed) {
    return (
      <div className="app-shell">
        <Tutorial />
      </div>
    );
  }

  const uncheckedGrocery = data.grocery.filter((g) => !g.checked).length;

  function renderPage() {
    switch (activePage) {
      case 'meals':
        return <Meals showToast={showToast} />;
      case 'planner':
        return <Planner showToast={showToast} setActivePage={setActivePage} />;
      case 'grocery':
        return <Grocery showToast={showToast} />;
      case 'pantry':
        return <Pantry showToast={showToast} />;
      case 'chores':
        return <Chores showToast={showToast} />;
      case 'settings':
        return <Settings showToast={showToast} />;
      case 'more':
        return <More setActivePage={setActivePage} />;
      default:
        return (
          <Dashboard
            setActivePage={setActivePage}
            showToast={showToast}
            onSettingsOpen={() => setActivePage('settings')}
          />
        );
    }
  }

  return (
    <div className="app-shell">
      {renderPage()}
      <QuickAdd showToast={showToast} />
      <BottomNav activePage={activePage} setActivePage={setActivePage} groceryCount={uncheckedGrocery} />
      {toast && <div key={toastKey} className="toast">{toast}</div>}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
