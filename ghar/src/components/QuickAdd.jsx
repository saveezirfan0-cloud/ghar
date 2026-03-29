import { useState, useEffect } from 'react';
import Sheet from './Sheet';
import { useData } from '../contexts/DataContext';
import { detectAddType } from '../utils/helpers';

const TYPE_LABELS = {
  meal: '\uD83C\uDF72 Meal',
  grocery: '\uD83D\uDED2 Grocery',
  chore: '\u2705 Chore'
};

export default function QuickAdd({ showToast }) {
  const { addMeal, addGroceryItem, addChore } = useData();

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
    if (text.trim()) setDetectedType(detectAddType(text));
  }, [text]);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (detectedType === 'meal') {
      await addMeal({ name: trimmed, category: 'Other', rating: 0, ingredients: [] });
    } else if (detectedType === 'grocery') {
      await addGroceryItem({ name: trimmed, category: 'Other' });
    } else {
      await addChore({ name: trimmed, type: 'daily', energy_level: 'medium' });
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
            <span className="pill active clickable" onClick={cycleType}>
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
