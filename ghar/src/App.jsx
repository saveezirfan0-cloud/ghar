import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  uid, todayISO, getLastSunday,
  DEFAULT_DAILY_CHORES, DEFAULT_WEEKLY_CHORES
} from './utils/helpers';
import BottomNav from './components/BottomNav';
import QuickAdd from './components/QuickAdd';
import Dashboard from './pages/Dashboard';
import Meals from './pages/Meals';
import Planner from './pages/Planner';
import Grocery from './pages/Grocery';
import Chores from './pages/Chores';

function initChores() {
  const daily = DEFAULT_DAILY_CHORES.map((c) => ({
    id: uid(), ...c, type: 'daily', completed: false, lastCompleted: null, snoozedUntil: null
  }));
  const weekly = DEFAULT_WEEKLY_CHORES.map((c) => ({
    id: uid(), ...c, type: 'weekly', completed: false, lastCompleted: null, snoozedUntil: null
  }));
  return [...daily, ...weekly];
}

const DEFAULT_SETTINGS = {
  ramadanMode: false,
  streakCount: 0,
  lastStreakDate: null,
  weeklyBudget: null,
  chaosMode: false,
  installPromptDismissed: false
};

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastKey, setToastKey] = useState(0);

  const [meals, setMeals] = useLocalStorage('ghar_meals', []);
  const [plan, setPlan] = useLocalStorage('ghar_plan', { notes: {} });
  const [grocery, setGrocery] = useLocalStorage('ghar_grocery', []);
  const [pantry, setPantry] = useLocalStorage('ghar_pantry', []);
  const [chores, setChores] = useLocalStorage('ghar_chores', null);
  const [settings, setSettings] = useLocalStorage('ghar_settings', DEFAULT_SETTINGS);

  // Initialize default chores on first launch
  useEffect(() => {
    if (chores === null) {
      setChores(initChores());
    }
  }, [chores, setChores]);

  // Auto-reset chores on app open
  useEffect(() => {
    if (!chores || chores.length === 0) return;
    const today = todayISO();
    const lastSunday = getLastSunday();
    let changed = false;

    const updated = chores.map((c) => {
      // Unsnooze if snoozedUntil <= today
      if (c.snoozedUntil && c.snoozedUntil <= today) {
        changed = true;
        c = { ...c, snoozedUntil: null };
      }

      // Reset daily chores
      if (c.type === 'daily' && c.completed && c.lastCompleted && c.lastCompleted < today) {
        changed = true;
        return { ...c, completed: false };
      }

      // Reset weekly chores
      if (c.type === 'weekly' && c.completed && c.lastCompleted && c.lastCompleted < lastSunday) {
        changed = true;
        return { ...c, completed: false };
      }

      return c;
    });

    if (changed) setChores(updated);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Streak wilt logic: if missed a day, wilt one level
  useEffect(() => {
    if (!settings.lastStreakDate || !settings.streakCount) return;
    const today = todayISO();
    const lastDate = settings.lastStreakDate;
    if (lastDate < today) {
      const diff = Math.floor((new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
      if (diff > 1) {
        setSettings((prev) => ({
          ...prev,
          streakCount: Math.max(0, (prev.streakCount || 0) - 1)
        }));
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = useCallback((message) => {
    setToast(message);
    setToastKey((k) => k + 1);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const uncheckedGrocery = grocery.filter((g) => !g.checked).length;

  // Settings panel
  function handleExportData() {
    const data = { meals, plan, grocery, pantry, chores, settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghar-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported');
  }

  function handleImportData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.meals) setMeals(data.meals);
        if (data.plan) setPlan(data.plan);
        if (data.grocery) setGrocery(data.grocery);
        if (data.pantry) setPantry(data.pantry);
        if (data.chores) setChores(data.chores);
        if (data.settings) setSettings(data.settings);
        showToast('Data imported successfully');
      } catch {
        showToast('Invalid backup file');
      }
    };
    reader.readAsText(file);
  }

  function handleClearAll() {
    const input = window.prompt('Type "delete" to clear all data:');
    if (input !== 'delete') return;
    setMeals([]);
    setPlan({ notes: {} });
    setGrocery([]);
    setPantry([]);
    setChores(initChores());
    setSettings(DEFAULT_SETTINGS);
    showToast('All data cleared');
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

            <div className="card">
              <div className="toggle-row">
                <div>
                  <div className="fw-600">Ramadan Mode</div>
                  <div className="text-xs text-muted">Changes meal labels to Sehri & Iftar</div>
                </div>
                <div
                  className={`toggle-switch ${settings.ramadanMode ? 'on' : ''}`}
                  onClick={() => setSettings((s) => ({ ...s, ramadanMode: !s.ramadanMode }))}
                />
              </div>
            </div>

            <div className="card">
              <div className="form-group">
                <label className="form-label">Weekly budget ({'\u20A8'})</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 5000"
                  value={settings.weeklyBudget || ''}
                  onChange={(e) => setSettings((s) => ({ ...s, weeklyBudget: e.target.value ? parseFloat(e.target.value) : null }))}
                />
              </div>
            </div>

            <div className="card">
              <button className="btn btn-secondary btn-block mb-12" onClick={handleExportData}>
                Export all data
              </button>
              <label className="btn btn-secondary btn-block mb-12" style={{ cursor: 'pointer' }}>
                Import data
                <input type="file" accept=".json" onChange={handleImportData} style={{ display: 'none' }} />
              </label>
              <button className="btn btn-danger btn-block" onClick={handleClearAll}>
                Clear all data
              </button>
            </div>

            <div className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 24 }}>
              Ghar v1.0.0
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderPage() {
    switch (activePage) {
      case 'meals':
        return <Meals meals={meals} setMeals={setMeals} plan={plan} setPlan={setPlan} showToast={showToast} />;
      case 'planner':
        return (
          <Planner
            meals={meals} plan={plan} setPlan={setPlan}
            grocery={grocery} setGrocery={setGrocery}
            pantry={pantry} settings={settings}
            showToast={showToast} setActivePage={setActivePage}
          />
        );
      case 'grocery':
        return (
          <Grocery
            grocery={grocery} setGrocery={setGrocery}
            pantry={pantry} setPantry={setPantry}
            settings={settings} setSettings={setSettings}
            showToast={showToast}
          />
        );
      case 'chores':
        return (
          <Chores
            chores={chores || []} setChores={setChores}
            settings={settings} setSettings={setSettings}
            showToast={showToast}
          />
        );
      default:
        return (
          <Dashboard
            settings={settings} setSettings={setSettings}
            meals={meals} plan={plan}
            chores={chores || []} setChores={setChores}
            grocery={grocery}
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

      <QuickAdd
        onAddMeal={(m) => setMeals((prev) => [...prev, m])}
        onAddGrocery={(g) => setGrocery((prev) => [...prev, g])}
        onAddChore={(c) => setChores((prev) => [...(prev || []), c])}
        showToast={showToast}
      />

      <BottomNav
        activePage={activePage}
        setActivePage={setActivePage}
        groceryCount={uncheckedGrocery}
      />

      {toast && <div key={toastKey} className="toast">{toast}</div>}
    </div>
  );
}
