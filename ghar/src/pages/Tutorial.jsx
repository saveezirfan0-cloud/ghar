import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { requestNotificationPermission } from '../utils/notifications';

const STEPS = [
  {
    emoji: '\uD83C\uDFE0',
    title: 'Welcome to Ghar!',
    subtitle: 'Your personal homemaking companion',
    description: 'Ghar helps you manage meals, groceries, and chores — all in one place. Everything syncs to your account so you can access it from any device.'
  },
  {
    emoji: '\uD83C\uDF72',
    title: 'Plan Your Meals',
    subtitle: 'Never wonder "what\'s for dinner?" again',
    description: 'Save your favourite dishes with ingredients and recipes. Plan your week by assigning meals to each day. Ghar will even suggest meals you haven\'t cooked in a while!'
  },
  {
    emoji: '\uD83D\uDED2',
    title: 'Smart Grocery Lists',
    subtitle: 'From meal plan to shopping list in one tap',
    description: 'Generate your grocery list automatically from your meal plan. Track your pantry and mark items as low stock. Set a weekly budget to keep spending in check.'
  },
  {
    emoji: '\u2705',
    title: 'Track Your Chores',
    subtitle: 'Small steps, big home energy',
    description: 'Add daily and weekly chores. Filter by energy level when you\'re tired. Build a streak by completing all daily chores — watch your streak garden grow!'
  },
  {
    emoji: '\uD83D\uDD14',
    title: 'Stay on Track',
    subtitle: 'Gentle reminders, not nagging',
    description: 'Enable notifications to get friendly reminders about your chores and meal plans. You can always turn them off later in settings.'
  }
];

export default function Tutorial() {
  const { updateProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isNotificationStep = step === STEPS.length - 1;

  async function handleNext() {
    if (isLast) {
      await finishTutorial();
    } else {
      setStep((s) => s + 1);
    }
  }

  async function handleEnableNotifications() {
    const granted = await requestNotificationPermission();
    if (granted) {
      await updateProfile({ notifications_enabled: true });
    }
    await finishTutorial();
  }

  async function finishTutorial() {
    setFinishing(true);
    await updateProfile({ tutorial_completed: true });
    setFinishing(false);
  }

  async function handleSkip() {
    await finishTutorial();
  }

  return (
    <div className="tutorial-page">
      <div className="tutorial-card">
        {/* Progress dots */}
        <div className="tutorial-dots">
          {STEPS.map((_, i) => (
            <div key={i} className={`tutorial-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />
          ))}
        </div>

        {/* Content */}
        <div className="tutorial-content">
          <div className="tutorial-emoji">{current.emoji}</div>
          <h1 className="tutorial-title">{current.title}</h1>
          <p className="tutorial-subtitle">{current.subtitle}</p>
          <p className="tutorial-description">{current.description}</p>
        </div>

        {/* Actions */}
        <div className="tutorial-actions">
          {isNotificationStep ? (
            <>
              <button className="btn btn-primary btn-block" onClick={handleEnableNotifications} disabled={finishing}>
                Enable Notifications
              </button>
              <button className="btn btn-ghost btn-block" onClick={handleNext} disabled={finishing}>
                {finishing ? 'Setting up...' : 'Skip for now'}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary btn-block" onClick={handleNext}>
                {isLast ? 'Get Started' : 'Next'}
              </button>
              {step > 0 && (
                <button className="btn btn-ghost btn-block" onClick={() => setStep((s) => s - 1)}>
                  Back
                </button>
              )}
            </>
          )}

          {step < STEPS.length - 1 && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, color: 'var(--text-3)' }} onClick={handleSkip} disabled={finishing}>
              Skip tutorial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
