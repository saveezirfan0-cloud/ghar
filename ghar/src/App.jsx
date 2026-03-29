import { useState, useCallback } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import { todayISO } from './utils/helpers';
import BottomNav from './components/BottomNav';
import QuickAdd from './components/QuickAdd';
import Auth from './pages/Auth';
import Tutorial from './pages/Tutorial';
import Dashboard from './pages/Dashboard';
import Meals from './pages/Meals';
import Planner from './pages/Planner';
import Grocery from './pages/Grocery';
import Chores from './pages/Chores';

function AppContent() {
  const { user, profile, loading: authLoading, updateProfile, signOut } = useAuth();
  const data = useData();

  const [activePage, setActivePage] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastKey, setToastKey] = useState(0);

  const showToast = useCallback((message) => {
    setToast(message);
    setToastKey((k) => k + 1);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Loading state
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

  // Not logged in
  if (!user) {
    return (
      <div className="app-shell">
        <Auth />
      </div>
    );
  }

  // Tutorial not completed
  if (profile && !profile.tutorial_completed) {
    return (
      <div className="app-shell">
        <Tutorial />
      </div>
    );
  }

  const uncheckedGrocery = data.grocery.filter((g) => !g.checked).length;

  // Settings panel
  function handleExportData() {
    const exportData = data.exportAllData();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghar-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported');
  }

  async function handleSignOut() {
    if (window.confirm('Sign out of Ghar?')) {
      await signOut();
    }
  }

  if (showSettings) {
    return (
      <div className="app-shell">
        <div className="settings-overlay">
          <div className="settings-content">
            <div className="settings-header">
              <span className="settings-back" onClick={() => setShowSettings(false)}>{'\u2190'}</span>
              <h2 className="page-title" style={{ marginBottom: 0 }}>Settings</h2>
            </div>

            {profile && (
              <div className="card">
                <div className="text-sm fw-600 mb-8">Signed in as</div>
                <div className="text-sm">{user.email}</div>
                {profile.display_name && <div className="text-sm text-muted">{profile.display_name}</div>}
              </div>
            )}

            <div className="card">
              <div className="toggle-row">
                <div>
                  <div className="fw-600">Ramadan Mode</div>
                  <div className="text-xs text-muted">Changes meal labels to Sehri & Iftar</div>
                </div>
                <div
                  className={`toggle-switch ${profile?.ramadan_mode ? 'on' : ''}`}
                  onClick={() => updateProfile({ ramadan_mode: !profile?.ramadan_mode })}
                />
              </div>
            </div>

            <div className="card">
              <div className="toggle-row">
                <div>
                  <div className="fw-600">Notifications</div>
                  <div className="text-xs text-muted">Chore reminders and streak updates</div>
                </div>
                <div
                  className={`toggle-switch ${profile?.notifications_enabled ? 'on' : ''}`}
                  onClick={async () => {
                    if (!profile?.notifications_enabled && 'Notification' in window) {
                      const result = await Notification.requestPermission();
                      if (result !== 'granted') {
                        showToast('Notifications blocked by browser');
                        return;
                      }
                    }
                    updateProfile({ notifications_enabled: !profile?.notifications_enabled });
                  }}
                />
              </div>
            </div>

            <div className="card">
              <div className="form-group">
                <label className="form-label">Weekly budget ({'\u20A8'})</label>
                <input
                  className="form-input" type="number" placeholder="e.g. 5000"
                  value={profile?.weekly_budget || ''}
                  onChange={(e) => updateProfile({ weekly_budget: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
            </div>

            <div className="card">
              <button className="btn btn-secondary btn-block mb-12" onClick={handleExportData}>
                Export all data
              </button>
              <button className="btn btn-danger btn-block" onClick={handleSignOut}>
                Sign out
              </button>
            </div>

            <div className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 24 }}>
              Ghar v2.0.0
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderPage() {
    switch (activePage) {
      case 'meals':
        return <Meals showToast={showToast} />;
      case 'planner':
        return <Planner showToast={showToast} setActivePage={setActivePage} />;
      case 'grocery':
        return <Grocery showToast={showToast} />;
      case 'chores':
        return <Chores showToast={showToast} />;
      default:
        return (
          <Dashboard
            setActivePage={setActivePage}
            showToast={showToast}
            onSettingsOpen={() => setShowSettings(true)}
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
