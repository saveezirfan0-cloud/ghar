import { useState, useEffect } from 'react';
import Sheet from './Sheet';
import { detectAddType, uid } from '../utils/helpers';

const TYPE_LABELS = {
  meal: '\uD83C\uDF72 Meal',
  grocery: '\uD83D\uDED2 Grocery',
  chore: '\u2705 Chore'
};

export default function QuickAdd({ onAddMeal, onAddGrocery, onAddChore, showToast }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [detectedType, setDetectedType] = useState('chore');
  const [pulsed, setPulsed] = useState(false);

  useEffect(() => {
    const hasPulsed = sessionStorage.getItem('ghar_fab_pulsed');
    if (!hasPulsed) {
      setPulsed(true);
      sessionStorage.setItem('ghar_fab_pulsed', 'true');
    }
  }, []);

  useEffect(() => {
    if (text.trim()) {
      setDetectedType(detectAddType(text));
    }
  }, [text]);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (detectedType === 'meal') {
      onAddMeal({ id: uid(), name: trimmed, category: 'Other', recipeUrl: '', rating: 0, ingredients: [], lastCooked: null, timesCooked: 0 });
    } else if (detectedType === 'grocery') {
      onAddGrocery({ id: uid(), name: trimmed, category: 'Other', checked: false, fromPlan: false, inPantry: false, lowStock: false, estimatedCost: null });
    } else {
      onAddChore({ id: uid(), name: trimmed, type: 'daily', completed: false, lastCompleted: null, snoozedUntil: null, durationMinutes: null, energyLevel: 'medium' });
    }

    showToast(`Added "${trimmed}" to ${detectedType === 'meal' ? 'meals' : detectedType === 'grocery' ? 'grocery list' : 'chores'}`);
    setText('');
    setOpen(false);
  }

  function cycleType() {
    const types = ['meal', 'grocery', 'chore'];
    const idx = types.indexOf(detectedType);
    setDetectedType(types[(idx + 1) % types.length]);
  }

  return (
    <>
      <div className={`fab ${pulsed ? 'pulse' : ''}`} onClick={() => setOpen(true)} onAnimationEnd={() => setPulsed(false)}>
        +
      </div>

      <Sheet open={open} onClose={() => { setOpen(false); setText(''); }} title="Quick Add">
        <div className="form-group">
          <input
            className="form-input"
            placeholder="What do you want to add?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </div>

        {text.trim() && (
          <div className="mb-12">
            <span
              className="pill active clickable"
              onClick={cycleType}
            >
              Adding as: {TYPE_LABELS[detectedType]}
            </span>
            <span className="text-xs text-muted" style={{ marginLeft: 8 }}>Tap to change</span>
          </div>
        )}

        <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={!text.trim()}>
          Add
        </button>
      </Sheet>
    </>
  );
}
