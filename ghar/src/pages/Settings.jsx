import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Branding from '../components/Branding';
import { todayISO, DEFAULT_MEAL_CATEGORIES, DEFAULT_GROCERY_CHANNELS, DEFAULT_MEAL_SLOTS, DEFAULT_PANTRY_CATEGORIES } from '../utils/helpers';
import { requestNotificationPermission } from '../utils/notifications';
import { supabase } from '../lib/supabase';

export default function Settings({ showToast }) {
  const { user, profile, updateProfile, signOut } = useAuth();
  const { exportAllData } = useData();

  const [newCategory, setNewCategory] = useState('');
  const [newChannel, setNewChannel] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const [newPantryCat, setNewPantryCat] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const [showSlots, setShowSlots] = useState(false);
  const [showPantryCats, setShowPantryCats] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);

  const mealCategories = profile?.meal_categories || DEFAULT_MEAL_CATEGORIES;
  const groceryChannels = profile?.grocery_channels || DEFAULT_GROCERY_CHANNELS;
  const mealSlots = profile?.meal_slots || DEFAULT_MEAL_SLOTS;
  const pantryCategories = profile?.pantry_categories || DEFAULT_PANTRY_CATEGORIES;

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

        {/* Calories & Servings */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
          <div className="toggle-row">
            <div>
              <div className="fw-600">Show Calories</div>
              <div className="text-xs text-muted">Display calories per serving on meals</div>
            </div>
            <div className={`toggle-switch ${profile?.show_calories ? 'on' : ''}`} onClick={() => updateProfile({ show_calories: !profile?.show_calories })} />
          </div>
          <div className="toggle-row">
            <div>
              <div className="fw-600">Cooking for X People</div>
              <div className="text-xs text-muted">Show total calories based on servings</div>
            </div>
            <div className={`toggle-switch ${profile?.show_servings ? 'on' : ''}`} onClick={() => updateProfile({ show_servings: !profile?.show_servings })} />
          </div>
          {profile?.show_servings && (
            <div className="form-group">
              <label className="form-label">Number of people</label>
              <input className="form-input" type="number" min="1" max="20" value={profile?.default_servings || 2} onChange={(e) => updateProfile({ default_servings: Math.max(1, parseInt(e.target.value) || 2) })} style={{ width: 100 }} />
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

      {/* Pantry Categories */}
      <div className="card">
        <div className="card-title">Pantry</div>
        <div className="flex-between clickable" onClick={() => setShowPantryCats(!showPantryCats)} style={{ minHeight: 48 }}>
          <div className="fw-600">Pantry Categories</div>
          <span className="text-muted">{showPantryCats ? '\u25B2' : '\u25BC'}</span>
        </div>
        {showPantryCats && (
          <div className="mt-8">
            <div className="pill-row mb-12" style={{ flexWrap: 'wrap' }}>
              {pantryCategories.map((cat) => (
                <span key={cat} className="pill" style={{ gap: 6 }}>
                  {cat}
                  {pantryCategories.length > 1 && (
                    <span className="clickable" onClick={(e) => { e.stopPropagation(); updateProfile({ pantry_categories: pantryCategories.filter((c) => c !== cat) }); showToast(`"${cat}" removed`); }} style={{ opacity: 0.6, fontSize: '0.7rem' }}>{'\u2715'}</span>
                  )}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" placeholder="New category..." value={newPantryCat} onChange={(e) => setNewPantryCat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newPantryCat.trim() && !pantryCategories.includes(newPantryCat.trim())) { updateProfile({ pantry_categories: [...pantryCategories, newPantryCat.trim()] }); showToast(`"${newPantryCat.trim()}" added`); setNewPantryCat(''); } }} style={{ flex: 1 }} />
              <button className="btn btn-primary btn-sm" onClick={() => { if (newPantryCat.trim() && !pantryCategories.includes(newPantryCat.trim())) { updateProfile({ pantry_categories: [...pantryCategories, newPantryCat.trim()] }); showToast(`"${newPantryCat.trim()}" added`); setNewPantryCat(''); } }} disabled={!newPantryCat.trim()}>Add</button>
            </div>
          </div>
        )}
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

      {/* Feedback */}
      <div className="card">
        <div className="card-title">Feedback</div>
        <p className="text-sm text-muted mb-12">Got ideas, found a bug, or want a feature? Tell us!</p>
        <div className="form-group">
          <textarea className="form-input" rows={3} placeholder="What's on your mind?" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} style={{ minHeight: 80, resize: 'vertical' }} />
        </div>
        <button className="btn btn-secondary btn-block" onClick={async () => {
          if (!feedbackText.trim()) return;
          setFeedbackSending(true);
          try {
            await supabase.from('feedback').insert({ user_id: user.id, message: feedbackText.trim() });
            showToast('Thanks for your feedback!');
            setFeedbackText('');
          } catch {
            showToast('Could not send feedback. Try again.');
          }
          setFeedbackSending(false);
        }} disabled={!feedbackText.trim() || feedbackSending}>
          {feedbackSending ? 'Sending...' : 'Submit Feedback'}
        </button>
        <p className="text-xs text-muted mt-8">Your feedback is saved to our database and helps us prioritize features.</p>
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

      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <div className="text-xs text-muted" style={{ textAlign: 'center', marginBottom: 8 }}>Ghar v2.2.0</div>
        <Branding />
      </div>
    </div>
  );
}
