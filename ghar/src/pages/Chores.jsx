import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Sheet from '../components/Sheet';
import { getRandomNudge, todayISO, ENERGY_LEVELS } from '../utils/helpers';
import { notifyStreakUpdate } from '../utils/notifications';

const SUGGESTED_CHORES = {
  'Daily Essentials': [
    { name: 'Dishes / Bartan dhona', type: 'daily', duration_minutes: 15, energy_level: 'medium' },
    { name: 'Wipe kitchen counter', type: 'daily', duration_minutes: 3, energy_level: 'low' },
    { name: 'Sweep / Jhaaru', type: 'daily', duration_minutes: 10, energy_level: 'medium' },
    { name: 'Make beds / Bistar banana', type: 'daily', duration_minutes: 5, energy_level: 'low' },
    { name: 'Take out trash', type: 'daily', duration_minutes: 3, energy_level: 'low' },
    { name: 'Quick tidy living room', type: 'daily', duration_minutes: 5, energy_level: 'low' },
    { name: 'Wipe dining table', type: 'daily', duration_minutes: 2, energy_level: 'low' },
    { name: 'Evening kitchen cleanup', type: 'daily', duration_minutes: 10, energy_level: 'medium' },
  ],
  'Weekly Cleaning': [
    { name: 'Mopping / Pocha lagana', type: 'weekly', duration_minutes: 25, energy_level: 'high' },
    { name: 'Clean bathrooms', type: 'weekly', duration_minutes: 30, energy_level: 'high' },
    { name: 'Laundry / Kapde dhona', type: 'weekly', duration_minutes: 15, energy_level: 'medium' },
    { name: 'Iron clothes / Istri karna', type: 'weekly', duration_minutes: 20, energy_level: 'medium' },
    { name: 'Change bed sheets', type: 'weekly', duration_minutes: 10, energy_level: 'medium' },
    { name: 'Dust furniture / Jhaarank', type: 'weekly', duration_minutes: 15, energy_level: 'medium' },
    { name: 'Clean kitchen stove / Chulha', type: 'weekly', duration_minutes: 15, energy_level: 'medium' },
    { name: 'Clean fridge', type: 'weekly', duration_minutes: 20, energy_level: 'medium' },
    { name: 'Organize closet', type: 'weekly', duration_minutes: 15, energy_level: 'low' },
    { name: 'Vacuum / carpet cleaning', type: 'weekly', duration_minutes: 15, energy_level: 'high' },
    { name: 'Wash curtains', type: 'weekly', duration_minutes: 10, energy_level: 'medium' },
    { name: 'Water plants', type: 'weekly', duration_minutes: 5, energy_level: 'low' },
  ],
  'Kitchen': [
    { name: 'Check masala stock', type: 'weekly', duration_minutes: 5, energy_level: 'low' },
    { name: 'Clean atta dabba / containers', type: 'weekly', duration_minutes: 10, energy_level: 'low' },
    { name: 'Organize fridge', type: 'weekly', duration_minutes: 10, energy_level: 'low' },
    { name: 'Prep roti dough', type: 'daily', duration_minutes: 10, energy_level: 'medium' },
    { name: 'Soak daal / beans', type: 'daily', duration_minutes: 2, energy_level: 'low' },
  ],
  'Child Care': [
    { name: 'Pack school bag / lunch', type: 'daily', duration_minutes: 10, energy_level: 'medium' },
    { name: 'School uniform ready', type: 'daily', duration_minutes: 5, energy_level: 'low' },
    { name: 'Homework help', type: 'daily', duration_minutes: 30, energy_level: 'high' },
    { name: 'Bath time', type: 'daily', duration_minutes: 15, energy_level: 'medium' },
    { name: 'Tidy kids room', type: 'daily', duration_minutes: 10, energy_level: 'medium' },
    { name: 'Wash kids clothes', type: 'weekly', duration_minutes: 15, energy_level: 'medium' },
    { name: 'Clean toys', type: 'weekly', duration_minutes: 10, energy_level: 'low' },
    { name: 'Organize school supplies', type: 'weekly', duration_minutes: 10, energy_level: 'low' },
    { name: 'Milk / formula prep', type: 'daily', duration_minutes: 5, energy_level: 'low' },
  ],
};

export default function Chores({ showToast }) {
  const { profile, updateProfile } = useAuth();
  const { chores, addChore, updateChore, deleteChore: removeChore } = useData();

  const [activeTab, setActiveTab] = useState('daily');
  const [energyFilter, setEnergyFilter] = useState(null);
  const [oneMinMode, setOneMinMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('daily');
  const [formDuration, setFormDuration] = useState('');
  const [formEnergy, setFormEnergy] = useState('medium');

  const filtered = useMemo(() => {
    const today = todayISO();
    let list = chores.filter((c) => c.type === activeTab).map((c) => ({
      ...c,
      _snoozed: c.snoozed_until && c.snoozed_until > today
    }));
    if (energyFilter) list = list.filter((c) => c.energy_level === energyFilter);
    if (oneMinMode) list = list.filter((c) => c.duration_minutes && c.duration_minutes <= 1);
    list.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a._snoozed !== b._snoozed) return a._snoozed ? 1 : -1;
      return 0;
    });
    return list;
  }, [chores, activeTab, energyFilter, oneMinMode]);

  const dailyChores = useMemo(() => chores.filter((c) => c.type === 'daily'), [chores]);
  const completedDaily = useMemo(() => dailyChores.filter((c) => c.completed).length, [dailyChores]);
  const totalDaily = dailyChores.length;
  const allDone = completedDaily === totalDaily && totalDaily > 0 && activeTab === 'daily';

  const existingNames = useMemo(() => new Set(chores.map((c) => c.name.toLowerCase())), [chores]);

  async function handleToggle(choreId) {
    const chore = chores.find((c) => c.id === choreId);
    if (!chore) return;
    const newCompleted = !chore.completed;
    await updateChore(choreId, { completed: newCompleted, last_completed: newCompleted ? todayISO() : chore.last_completed });
    if (newCompleted) {
      showToast(getRandomNudge());
      const updatedDaily = dailyChores.map((c) => c.id === choreId ? { ...c, completed: true } : c);
      const allComplete = updatedDaily.every((c) => c.completed);
      if (allComplete && profile?.last_streak_date !== todayISO()) {
        const newStreak = (profile?.streak_count || 0) + 1;
        await updateProfile({ streak_count: newStreak, last_streak_date: todayISO() });
        if (profile?.notifications_enabled) notifyStreakUpdate(newStreak);
      }
    }
  }

  async function handleAdd() {
    if (!formName.trim()) return;
    await addChore({ name: formName.trim(), type: formType, duration_minutes: formDuration ? parseInt(formDuration) : null, energy_level: formEnergy });
    showToast(`"${formName.trim()}" added`);
    setFormName(''); setFormDuration(''); setShowForm(false);
  }

  async function addSuggested(chore) {
    if (existingNames.has(chore.name.toLowerCase())) {
      showToast('Already added!');
      return;
    }
    await addChore(chore);
    showToast(`"${chore.name}" added`);
  }

  function handleLongPress(e, chore) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({ choreId: chore.id, x: Math.min(rect.left, window.innerWidth - 200), y: rect.bottom });
  }

  async function snoozeToTomorrow(choreId) {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    await updateChore(choreId, { snoozed_until: tomorrow.toISOString().split('T')[0] });
    setContextMenu(null); showToast('Snoozed until tomorrow');
  }

  async function snoozeToNextWeek(choreId) {
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
    await updateChore(choreId, { snoozed_until: nextWeek.toISOString().split('T')[0] });
    setContextMenu(null); showToast('Snoozed until next week');
  }

  async function handleDeleteChore(choreId) {
    await removeChore(choreId);
    setContextMenu(null); showToast('Chore deleted');
  }

  return (
    <div className="page">
      <div className="page-title">Chores</div>
      <div className="page-subtitle">Keep your space in order</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <span className={`pill ${activeTab === 'daily' ? 'active' : ''}`} onClick={() => setActiveTab('daily')}>Daily</span>
        <span className={`pill ${activeTab === 'weekly' ? 'active' : ''}`} onClick={() => setActiveTab('weekly')}>Weekly</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {ENERGY_LEVELS.map((e) => (
          <span key={e.value} className={`pill ${energyFilter === e.value ? 'active' : ''}`} onClick={() => setEnergyFilter(energyFilter === e.value ? null : e.value)}>{e.icon} {e.label}</span>
        ))}
        <span className={`pill ${oneMinMode ? 'active' : ''}`} onClick={() => setOneMinMode(!oneMinMode)}>1-min mode</span>
      </div>

      {activeTab === 'daily' && totalDaily > 0 && (
        <div className="mb-12">
          <div className="text-sm text-muted">{completedDaily} of {totalDaily} done</div>
          <div className="progress-bar">
            <div className={`progress-fill ${allDone ? 'complete' : ''}`} style={{ width: `${(completedDaily / totalDaily) * 100}%` }} />
          </div>
        </div>
      )}

      {allDone && (
        <div className="celebration mb-16">
          <div className="celebration-text">All done! {'\uD83C\uDF89'}</div>
          <div className="confetti-container">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="confetti-piece" style={{ left: `${8 + i * 8}%`, background: ['#C96A3A', '#4A7C4E', '#C47D16', '#B13030', '#6E5C4A'][i % 5], animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Add / Suggest buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {!showForm && (
          <>
            <div className="add-btn" onClick={() => setShowForm(true)} style={{ flex: 1, marginBottom: 0 }}>
              <span>+</span> Add chore
            </div>
            <button className="btn btn-secondary" onClick={() => setShowSuggestions(true)} style={{ whiteSpace: 'nowrap' }}>
              {'\uD83D\uDCA1'} Suggestions
            </button>
          </>
        )}
      </div>

      {showForm && (
        <div className="inline-form">
          <div className="form-group">
            <input className="form-input" placeholder="Chore name" value={formName} onChange={(e) => setFormName(e.target.value)} autoFocus />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Type</label>
              <select className="form-select" value={formType} onChange={(e) => setFormType(e.target.value)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Minutes</label>
              <input className="form-input" type="number" placeholder="optional" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Energy level</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {ENERGY_LEVELS.map((e) => (
                <span key={e.value} className={`pill ${formEnergy === e.value ? 'active' : ''}`} onClick={() => setFormEnergy(e.value)}>{e.icon} {e.label}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!formName.trim()}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setFormName(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Chore list */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{'\u2705'}</div>
          <div className="empty-state-text">
            {chores.length === 0
              ? 'No chores yet. Add your own or pick from suggestions!'
              : oneMinMode
              ? 'No quick chores available. Try turning off 1-min mode.'
              : `No ${activeTab} chores${energyFilter ? ` at ${energyFilter} energy` : ''}.`}
          </div>
          {chores.length === 0 && (
            <button className="btn btn-secondary mt-12" onClick={() => setShowSuggestions(true)}>
              Browse suggested chores
            </button>
          )}
        </div>
      ) : (
        filtered.map((chore) => (
          <div key={chore.id} className={`chore-item ${chore._snoozed ? 'snoozed' : ''}`} onContextMenu={(e) => handleLongPress(e, chore)}>
            <div className={`checkbox-box ${chore.completed ? 'checked' : ''}`} onClick={() => !chore._snoozed && handleToggle(chore.id)} />
            <div className="chore-info" onClick={() => !chore._snoozed && handleToggle(chore.id)}>
              <div className={`chore-name ${chore.completed ? 'checkbox-label checked' : ''}`}>{chore.name}</div>
              <div className="chore-meta">
                {chore.duration_minutes && <span className="duration-badge">~{chore.duration_minutes} min</span>}
                {chore._snoozed && <span className="snooze-badge">{'\uD83D\uDCA4'} Snoozed</span>}
                {chore.energy_level && <span className="duration-badge">{ENERGY_LEVELS.find((e) => e.value === chore.energy_level)?.icon}</span>}
              </div>
            </div>
          </div>
        ))
      )}

      {/* Context menu */}
      {contextMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 249 }} onClick={() => setContextMenu(null)} />
          <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <div className="context-menu-item" onClick={() => snoozeToTomorrow(contextMenu.choreId)}>{'\uD83D\uDCA4'} Snooze to tomorrow</div>
            <div className="context-menu-item" onClick={() => snoozeToNextWeek(contextMenu.choreId)}>{'\uD83D\uDCA4'} Snooze to next week</div>
            <div className="context-menu-item danger" onClick={() => handleDeleteChore(contextMenu.choreId)}>{'\uD83D\uDDD1\uFE0F'} Delete</div>
          </div>
        </>
      )}

      {/* Suggested Chores Sheet */}
      <Sheet open={showSuggestions} onClose={() => setShowSuggestions(false)} title="Suggested Chores">
        <p className="text-sm text-muted mb-16">Tap any chore to add it. Common tasks for desi households.</p>

        {Object.entries(SUGGESTED_CHORES).map(([category, items]) => (
          <div key={category} style={{ marginBottom: 16 }}>
            <div className="section-header">{category}</div>
            {items.map((chore, i) => {
              const alreadyAdded = existingNames.has(chore.name.toLowerCase());
              return (
                <div key={i} className="suggestion-item" onClick={() => !alreadyAdded && addSuggested(chore)} style={{ opacity: alreadyAdded ? 0.4 : 1 }}>
                  <div style={{ flex: 1 }}>
                    <div className="text-sm fw-600">{chore.name}</div>
                    <div className="chore-meta" style={{ marginTop: 2 }}>
                      <span className="duration-badge">{chore.type}</span>
                      {chore.duration_minutes && <span className="duration-badge">~{chore.duration_minutes}m</span>}
                      <span className="duration-badge">{ENERGY_LEVELS.find((e) => e.value === chore.energy_level)?.icon}</span>
                    </div>
                  </div>
                  <span className="text-sm" style={{ color: alreadyAdded ? 'var(--success)' : 'var(--accent)' }}>
                    {alreadyAdded ? '\u2713' : '+'}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </Sheet>
    </div>
  );
}
