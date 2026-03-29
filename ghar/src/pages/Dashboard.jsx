import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import {
  todayISO, getDayName, formatDateLong, getStreakPlant,
  isSundayEvening, suggestMeal, isIOS, isStandalone,
  MEAL_SLOTS, MEAL_SLOTS_RAMADAN
} from '../utils/helpers';
import { scheduleChoreReminder } from '../utils/notifications';

export default function Dashboard({ setActivePage, showToast, onSettingsOpen }) {
  const { profile, updateProfile } = useAuth();
  const { meals, plan, chores, updateChore } = useData();

  const [chaosMode, setChaosMode] = useState(false);
  const [chaosChecks, setChaosChecks] = useState([false, false, false]);
  const [showResetRitual, setShowResetRitual] = useState(true);
  const [suggestion, setSuggestion] = useState(null);

  const ramadanMode = profile?.ramadan_mode || false;
  const streakCount = profile?.streak_count || 0;
  const showInstall = !profile?.install_prompt_dismissed && !isStandalone();

  const today = todayISO();
  const dayName = getDayName();
  const slots = ramadanMode ? MEAL_SLOTS_RAMADAN : MEAL_SLOTS;
  const slotLabels = ramadanMode
    ? { sehri: 'Sehri', iftar: 'Iftar' }
    : { breakfast: 'Breakfast', dinner: 'Dinner' };

  const todayMeals = useMemo(() => {
    return slots.map((slot) => {
      const key = `${dayName}-${slot}`;
      const entry = plan[key];
      if (!entry) return { slot, label: slotLabels[slot], meal: null };
      const meal = meals.find((m) => m.id === entry.mealId);
      return { slot, label: slotLabels[slot], meal, isLeftover: entry.isLeftover };
    });
  }, [plan, meals, dayName, slots, slotLabels]);

  const dailyChores = useMemo(() => chores.filter((c) => c.type === 'daily'), [chores]);
  const completedDaily = useMemo(() => dailyChores.filter((c) => c.completed).length, [dailyChores]);
  const totalDaily = dailyChores.length;
  const pendingDaily = totalDaily - completedDaily;

  const uncheckedGrocery = useMemo(() => {
    return 0; // Will be passed or computed
  }, []);

  const plannedMeals = useMemo(() => {
    return Object.keys(plan).filter((k) => plan[k] && plan[k].mealId).length;
  }, [plan]);

  // Schedule evening notification for pending chores
  useEffect(() => {
    if (profile?.notifications_enabled && pendingDaily > 0) {
      scheduleChoreReminder(pendingDaily);
    }
  }, [pendingDaily, profile?.notifications_enabled]);

  async function handleChoreToggle(choreId) {
    const chore = chores.find((c) => c.id === choreId);
    if (!chore) return;
    const newCompleted = !chore.completed;

    await updateChore(choreId, {
      completed: newCompleted,
      last_completed: newCompleted ? todayISO() : chore.last_completed
    });

    if (newCompleted) {
      const updatedDaily = dailyChores.map((c) =>
        c.id === choreId ? { ...c, completed: true } : c
      );
      const allComplete = updatedDaily.every((c) => c.completed);
      if (allComplete && profile?.last_streak_date !== todayISO()) {
        await updateProfile({
          streak_count: (profile?.streak_count || 0) + 1,
          last_streak_date: todayISO()
        });
      }
    }
  }

  function handlePickMeal() {
    const meal = suggestMeal(meals, null, ramadanMode);
    if (meal) {
      setSuggestion({ meal });
    } else {
      showToast('Add some meals first!');
      setActivePage('meals');
    }
  }

  async function dismissInstall() {
    await updateProfile({ install_prompt_dismissed: true });
  }

  const streakPlant = getStreakPlant(streakCount);

  if (chaosMode) {
    const questions = [
      "Do you have something to eat at home?",
      "One small thing you can tidy?",
      "One thing you're proud of today?"
    ];
    return (
      <div className="page">
        <div className="page-title">Take it easy</div>
        <p className="page-subtitle" style={{ marginBottom: 24 }}>No pressure. Just three questions.</p>
        {questions.map((q, i) => (
          <div key={i} className="chaos-card">
            <div className="chaos-question">{q}</div>
            <div
              className="checkbox-row"
              style={{ justifyContent: 'center' }}
              onClick={() => setChaosChecks((prev) => { const n = [...prev]; n[i] = !n[i]; return n; })}
            >
              <div className={`checkbox-box ${chaosChecks[i] ? 'checked' : ''}`} />
            </div>
          </div>
        ))}
        <button className="btn btn-ghost btn-block mt-16" onClick={() => { setChaosMode(false); setChaosChecks([false, false, false]); }}>
          Back to normal
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="header-row">
        <div>
          <div className="page-title">Ghar</div>
          <div className="page-subtitle">{formatDateLong(today)}</div>
        </div>
        <span className="gear-btn" onClick={onSettingsOpen}>{'\u2699\uFE0F'}</span>
      </div>

      {/* Greeting */}
      {profile?.display_name && (
        <p className="text-sm text-muted mb-16">Welcome back, {profile.display_name}</p>
      )}

      {/* PWA Install Banner */}
      {showInstall && (
        <div className="install-banner">
          <h3>Install Ghar on your phone</h3>
          {isIOS() ? (
            <p>Tap the share icon <strong>(</strong>{'\u2191'}<strong>)</strong> at the bottom of Safari, then tap <strong>"Add to Home Screen"</strong>.</p>
          ) : (
            <p>Tap the menu <strong>(\u22EE)</strong> in your browser, then tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>.</p>
          )}
          <div className="install-banner-actions">
            <button className="btn btn-secondary btn-sm" onClick={dismissInstall}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Streak Garden */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="streak-plant grow">{streakPlant}</span>
          <div>
            <div className="font-display" style={{ fontSize: '1.1rem', fontStyle: 'italic' }}>
              {streakCount} day streak
            </div>
            <div className="text-sm text-muted">Complete all daily chores to grow</div>
          </div>
        </div>
      </div>

      {/* Today's Meals */}
      <div className="card">
        <div className="card-title">{ramadanMode ? "Today's Meals (Ramadan)" : "Today's Meals"}</div>
        {todayMeals.map((item, idx) => (
          <div key={item.slot} className="day-slot" style={{ marginBottom: idx < todayMeals.length - 1 ? 8 : 0 }}>
            <div>
              <div className="day-slot-label">{item.label}</div>
              {item.meal ? (
                <div className="day-slot-meal">
                  {item.meal.name}
                  {item.isLeftover && <span className="leftover-badge">{'\uD83C\uDF71'}</span>}
                </div>
              ) : (
                <div className="day-slot-empty">No meal planned</div>
              )}
            </div>
            {!item.meal && (
              <button className="btn btn-secondary btn-sm" onClick={handlePickMeal}>Pick one</button>
            )}
          </div>
        ))}

        {suggestion && (
          <div style={{ marginTop: 12, padding: 12, background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)' }}>
            <div className="fw-600">{suggestion.meal.name}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => {
                showToast(`"${suggestion.meal.name}" — go plan it!`);
                setSuggestion(null);
                setActivePage('planner');
              }}>Use this</button>
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const meal = suggestMeal(meals, null, ramadanMode);
                if (meal) setSuggestion({ meal });
              }}>Try another</button>
            </div>
          </div>
        )}
      </div>

      {/* Today's Chores */}
      <div className="card">
        <div className="card-title">Today's Chores</div>
        {dailyChores.length === 0 ? (
          <div className="text-sm text-muted">
            No daily chores yet.{' '}
            <span className="text-accent clickable" onClick={() => setActivePage('chores')}>Add some</span>
          </div>
        ) : (
          <>
            <div className="text-sm text-muted mb-8">{completedDaily} of {totalDaily} done</div>
            <div className="progress-bar">
              <div
                className={`progress-fill ${completedDaily === totalDaily && totalDaily > 0 ? 'complete' : ''}`}
                style={{ width: `${totalDaily > 0 ? (completedDaily / totalDaily) * 100 : 0}%` }}
              />
            </div>
            {dailyChores.filter((c) => !c.completed).map((chore) => (
              <div key={chore.id} className="checkbox-row" onClick={() => handleChoreToggle(chore.id)}>
                <div className={`checkbox-box ${chore.completed ? 'checked' : ''}`} />
                <span className="checkbox-label">{chore.name}</span>
              </div>
            ))}
            {completedDaily === totalDaily && totalDaily > 0 && (
              <div className="celebration">
                <div className="celebration-text">All done! {'\uD83C\uDF89'}</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Counts */}
      <div className="quick-counts">
        <div className="quick-count-pill" onClick={() => setActivePage('grocery')}>
          <span>{'\uD83D\uDED2'}</span>
          Grocery
        </div>
        <div className="quick-count-pill">
          <span>{'\u2705'} {completedDaily}</span>
          done today
        </div>
        <div className="quick-count-pill" onClick={() => setActivePage('planner')}>
          <span>{'\uD83D\uDCC5'} {plannedMeals}</span>
          planned
        </div>
      </div>

      {/* Weekly Reset Ritual */}
      {isSundayEvening() && showResetRitual && (
        <div className="reset-card">
          <h3>Ready to set up next week?</h3>
          <p>Take a few minutes to review, rate meals, and plan ahead.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={() => { setActivePage('planner'); setShowResetRitual(false); }}>
              Let's go
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowResetRitual(false)}>
              Not now
            </button>
          </div>
        </div>
      )}

      {/* Chaos Mode trigger */}
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-3)' }} onClick={() => setChaosMode(true)}>
          Having a rough day?
        </button>
      </div>
    </div>
  );
}
