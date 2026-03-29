import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { todayISO, DEFAULT_MEAL_CATEGORIES, DEFAULT_GROCERY_CHANNELS, DEFAULT_MEAL_SLOTS } from '../utils/helpers';
import { requestNotificationPermission } from '../utils/notifications';

export default function Settings({ showToast }) {
  const { user, profile, updateProfile, signOut } = useAuth();
  const { exportAllData } = useData();

  const [newCategory, setNewCategory] = useState('');
  const [newChannel, setNewChannel] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const [showSlots, setShowSlots] = useState(false);

  const mealCategories = profile?.meal_categories || DEFAULT_MEAL_CATEGORIES;
  const groceryChannels = profile?.grocery_channels || DEFAULT_GROCERY_CHANNELS;
  const mealSlots = profile?.meal_slots || DEFAULT_MEAL_SLOTS;

  function handleExportData() {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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

  async function addCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed || mealCategories.includes(trimmed)) return;
    await updateProfile({ meal_categories: [...mealCategories, trimmed] });
    setNewCategory('');
    showToast(`"${trimmed}" category added`);
  }

  async function removeCategory(cat) {
    if (mealCategories.length <= 1) return;
    await updateProfile({ meal_categories: mealCategories.filter((c) => c !== cat) });
    showToast(`"${cat}" category removed`);
  }

  async function addChannel() {
    const trimmed = newChannel.trim();
    if (!trimmed || groceryChannels.includes(trimmed)) return;
    await updateProfile({ grocery_channels: [...groceryChannels, trimmed] });
    setNewChannel('');
    showToast(`"${trimmed}" channel added`);
  }

  async function removeChannel(ch) {
    if (groceryChannels.length <= 1) return;
    await updateProfile({ grocery_channels: groceryChannels.filter((c) => c !== ch) });
    showToast(`"${ch}" channel removed`);
  }

  async function toggleDarkMode() {
    const newVal = !profile?.dark_mode;
    await updateProfile({ dark_mode: newVal });
    document.documentElement.setAttribute('data-theme', newVal ? 'dark' : 'light');
  }

  async function toggleNotifications() {
    if (!profile?.notifications_enabled && 'Notification' in window) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        showToast('Notifications blocked by browser');
        return;
      }
    }
    await updateProfile({ notifications_enabled: !profile?.notifications_enabled });
  }

  return (
    <div className="page">
      <div className="page-title">Settings</div>
      <div className="page-subtitle">Customize your Ghar</div>

      {/* Account */}
      <div className="card">
        <div className="card-title">Account</div>
        <div className="text-sm mb-8">{user?.email}</div>
        {profile?.display_name && <div className="text-sm text-muted">{profile.display_name}</div>}
      </div>

      {/* Appearance */}
      <div className="card">
        <div className="card-title">Appearance</div>
        <div className="toggle-row">
          <div>
            <div className="fw-600">Dark Mode</div>
            <div className="text-xs text-muted">Easy on the eyes at night</div>
          </div>
          <div
            className={`toggle-switch ${profile?.dark_mode ? 'on' : ''}`}
            onClick={toggleDarkMode}
          />
        </div>
      </div>

      {/* Meal Settings */}
      <div className="card">
        <div className="card-title">Meals</div>

        <div className="toggle-row">
          <div>
            <div className="fw-600">Ramadan Mode</div>
            <div className="text-xs text-muted">Changes labels to Sehri & Iftar</div>
          </div>
          <div
            className={`toggle-switch ${profile?.ramadan_mode ? 'on' : ''}`}
            onClick={() => updateProfile({ ramadan_mode: !profile?.ramadan_mode })}
          />
        </div>

        {/* Meal Categories */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
          <div
            className="flex-between clickable"
            onClick={() => setShowCategories(!showCategories)}
            style={{ minHeight: 48 }}
          >
            <div className="fw-600">Meal Categories</div>
            <span className="text-muted">{showCategories ? '\u25B2' : '\u25BC'}</span>
          </div>

          {showCategories && (
            <div className="mt-8">
              <div className="pill-row mb-12" style={{ flexWrap: 'wrap' }}>
                {mealCategories.map((cat) => (
                  <span key={cat} className="pill" style={{ gap: 6 }}>
                    {cat}
                    <span
                      className="clickable"
                      onClick={(e) => { e.stopPropagation(); removeCategory(cat); }}
                      style={{ opacity: 0.6, fontSize: '0.7rem' }}
                    >
                      {'\u2715'}
                    </span>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="New category..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary btn-sm" onClick={addCategory} disabled={!newCategory.trim()}>Add</button>
              </div>
            </div>
          )}
        </div>

        {/* Meal Slots */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
          <div className="flex-between clickable" onClick={() => setShowSlots(!showSlots)} style={{ minHeight: 48 }}>
            <div className="fw-600">Meal Slots</div>
            <span className="text-muted">{showSlots ? '\u25B2' : '\u25BC'}</span>
          </div>
          <div className="text-xs text-muted" style={{ marginTop: -4 }}>Customize which meal slots appear in your planner (e.g. Lunch, Tea Time)</div>

          {showSlots && (
            <div className="mt-8">
              <div className="pill-row mb-12" style={{ flexWrap: 'wrap' }}>
                {mealSlots.map((slot) => (
                  <span key={slot} className="pill" style={{ gap: 6 }}>
                    {slot}
                    {mealSlots.length > 1 && (
                      <span className="clickable" onClick={(e) => { e.stopPropagation(); updateProfile({ meal_slots: mealSlots.filter((s) => s !== slot) }); showToast(`"${slot}" removed`); }} style={{ opacity: 0.6, fontSize: '0.7rem' }}>{'\u2715'}</span>
                    )}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" placeholder="e.g. Lunch, Tea Time" value={newSlot} onChange={(e) => setNewSlot(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newSlot.trim() && !mealSlots.includes(newSlot.trim())) { updateProfile({ meal_slots: [...mealSlots, newSlot.trim()] }); showToast(`"${newSlot.trim()}" added`); setNewSlot(''); } }} style={{ flex: 1 }} />
                <button className="btn btn-primary btn-sm" onClick={() => { if (newSlot.trim() && !mealSlots.includes(newSlot.trim())) { updateProfile({ meal_slots: [...mealSlots, newSlot.trim()] }); showToast(`"${newSlot.trim()}" added`); setNewSlot(''); } }} disabled={!newSlot.trim()}>Add</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grocery Settings */}
      <div className="card">
        <div className="card-title">Grocery</div>

        <div className="form-group">
          <label className="form-label">Weekly budget ({'\u20A8'})</label>
          <input
            className="form-input" type="number" placeholder="e.g. 5000"
            value={profile?.weekly_budget || ''}
            onChange={(e) => updateProfile({ weekly_budget: e.target.value ? parseFloat(e.target.value) : null })}
          />
        </div>

        {/* Channels */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
          <div
            className="flex-between clickable"
            onClick={() => setShowChannels(!showChannels)}
            style={{ minHeight: 48 }}
          >
            <div className="fw-600">Shopping Channels</div>
            <span className="text-muted">{showChannels ? '\u25B2' : '\u25BC'}</span>
          </div>

          {showChannels && (
            <div className="mt-8">
              <div className="pill-row mb-12" style={{ flexWrap: 'wrap' }}>
                {groceryChannels.map((ch) => (
                  <span key={ch} className="pill" style={{ gap: 6 }}>
                    {ch}
                    <span
                      className="clickable"
                      onClick={(e) => { e.stopPropagation(); removeChannel(ch); }}
                      style={{ opacity: 0.6, fontSize: '0.7rem' }}
                    >
                      {'\u2715'}
                    </span>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="New channel..."
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addChannel()}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary btn-sm" onClick={addChannel} disabled={!newChannel.trim()}>Add</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="card">
        <div className="card-title">Notifications</div>
        <div className="toggle-row">
          <div>
            <div className="fw-600">Enable Notifications</div>
            <div className="text-xs text-muted">Chore reminders and streak updates</div>
          </div>
          <div
            className={`toggle-switch ${profile?.notifications_enabled ? 'on' : ''}`}
            onClick={toggleNotifications}
          />
        </div>
      </div>

      {/* Data */}
      <div className="card">
        <div className="card-title">Data</div>
        <button className="btn btn-secondary btn-block mb-12" onClick={handleExportData}>
          Export all data
        </button>
        <button className="btn btn-danger btn-block" onClick={handleSignOut}>
          Sign out
        </button>
      </div>

      <div className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 24, marginBottom: 24 }}>
        Ghar v2.1.0
      </div>
    </div>
  );
}
