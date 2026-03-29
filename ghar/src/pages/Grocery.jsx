import { useState, useMemo } from 'react';
import { uid, GROCERY_CATEGORIES } from '../utils/helpers';

export default function Grocery({ grocery, setGrocery, pantry, setPantry, settings, setSettings, showToast }) {
  const [showForm, setShowForm] = useState(false);
  const [showPantry, setShowPantry] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [showBudget, setShowBudget] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Other');
  const [formCost, setFormCost] = useState('');
  const [formToPantry, setFormToPantry] = useState(false);

  // Pantry form
  const [pantryName, setPantryName] = useState('');
  const [pantryCat, setPantryCat] = useState('Other');

  const unchecked = useMemo(() => grocery.filter((g) => !g.checked), [grocery]);
  const checked = useMemo(() => grocery.filter((g) => g.checked), [grocery]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const item of unchecked) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [unchecked]);

  const totalCost = useMemo(() => {
    return grocery.reduce((sum, g) => sum + (g.checked && g.estimatedCost ? g.estimatedCost : 0), 0);
  }, [grocery]);

  function handleAdd() {
    if (!formName.trim()) return;

    if (formToPantry) {
      setPantry((prev) => [...prev, { id: uid(), name: formName.trim(), category: formCategory, lowStock: false }]);
      showToast(`"${formName.trim()}" added to pantry`);
    } else {
      setGrocery((prev) => [...prev, {
        id: uid(),
        name: formName.trim(),
        category: formCategory,
        checked: false,
        fromPlan: false,
        inPantry: false,
        lowStock: false,
        estimatedCost: formCost ? parseFloat(formCost) : null
      }]);
      showToast(`"${formName.trim()}" added to list`);
    }

    setFormName(''); setFormCategory('Other'); setFormCost(''); setFormToPantry(false); setShowForm(false);
  }

  function toggleItem(id) {
    setGrocery((prev) => prev.map((g) => g.id === id ? { ...g, checked: !g.checked } : g));
  }

  function clearChecked() {
    setGrocery((prev) => prev.filter((g) => !g.checked));
    showToast('Checked items cleared');
  }

  function clearAll() {
    if (window.confirm('Clear all grocery items?')) {
      setGrocery([]);
      showToast('Grocery list cleared');
    }
  }

  function exportList() {
    const text = unchecked.map((g) => `- ${g.name}${g.estimatedCost ? ` (~${g.estimatedCost})` : ''}`).join('\n');
    navigator.clipboard.writeText(text || 'No items').then(() => showToast('List copied to clipboard'));
  }

  function addPantryItem() {
    if (!pantryName.trim()) return;
    setPantry((prev) => [...prev, { id: uid(), name: pantryName.trim(), category: pantryCat, lowStock: false }]);
    showToast(`"${pantryName.trim()}" added to pantry`);
    setPantryName(''); setPantryCat('Other');
  }

  function toggleLowStock(id) {
    setPantry((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const newLow = !p.lowStock;
      if (newLow) {
        const exists = grocery.some((g) => g.name.toLowerCase() === p.name.toLowerCase() && !g.checked);
        if (!exists) {
          setGrocery((gPrev) => [...gPrev, {
            id: uid(), name: p.name, category: p.category, checked: false,
            fromPlan: false, inPantry: true, lowStock: true, estimatedCost: null
          }]);
        }
      }
      return { ...p, lowStock: newLow };
    }));
  }

  function removePantryItem(id) {
    setPantry((prev) => prev.filter((p) => p.id !== id));
  }

  function saveBudget(val) {
    setSettings((prev) => ({ ...prev, weeklyBudget: val ? parseFloat(val) : null }));
  }

  // Pantry view
  if (showPantry) {
    const sortedPantry = [...pantry].sort((a, b) => (b.lowStock ? 1 : 0) - (a.lowStock ? 1 : 0));

    return (
      <div className="page">
        <div className="pantry-header">
          <div className="page-title">Pantry</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowPantry(false)}>Back to list</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input className="form-input" placeholder="Item name" value={pantryName} onChange={(e) => setPantryName(e.target.value)} style={{ flex: 1 }} />
          <select className="form-select" value={pantryCat} onChange={(e) => setPantryCat(e.target.value)} style={{ width: 120 }}>
            {GROCERY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={addPantryItem} disabled={!pantryName.trim()}>Add</button>
        </div>

        {sortedPantry.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{'\uD83C\uDFE0'}</div>
            <div className="empty-state-text">Your pantry is empty. Add items you always have at home.</div>
          </div>
        ) : (
          sortedPantry.map((item) => (
            <div key={item.id} className="chore-item">
              <div className="chore-info">
                <div className="chore-name">
                  {item.lowStock && <span>{'\u26A0\uFE0F'} </span>}
                  {item.name}
                </div>
                <div className="chore-meta">
                  <span className="duration-badge">{item.category}</span>
                </div>
              </div>
              <button
                className={`btn btn-sm ${item.lowStock ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => toggleLowStock(item.id)}
              >
                {item.lowStock ? 'In stock' : 'Low stock'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => removePantryItem(item.id)}>{'\u2715'}</button>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="flex-between mb-8">
        <div>
          <div className="page-title">Grocery</div>
          <div className="page-subtitle">{unchecked.length} item{unchecked.length !== 1 ? 's' : ''} left</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {settings.weeklyBudget ? (
            <span className="budget-pill" onClick={() => setShowBudget(!showBudget)}>
              {'\u20A8'} {totalCost} / {settings.weeklyBudget}
            </span>
          ) : null}
          <span className="clickable" onClick={() => setShowBudget(!showBudget)}>{'\u2699\uFE0F'}</span>
          <span className="clickable" onClick={() => setShowPantry(true)}>{'\uD83C\uDFE0'}</span>
        </div>
      </div>

      {/* Budget setting */}
      {showBudget && (
        <div className="card">
          <div className="form-group">
            <label className="form-label">Weekly budget ({'\u20A8'})</label>
            <input
              className="form-input"
              type="number"
              placeholder="e.g. 5000"
              value={settings.weeklyBudget || ''}
              onChange={(e) => saveBudget(e.target.value)}
            />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowBudget(false)}>Done</button>
        </div>
      )}

      {/* Add form */}
      {!showForm ? (
        <div className="add-btn" onClick={() => setShowForm(true)}>
          <span>+</span> Add item
        </div>
      ) : (
        <div className="inline-form">
          <div className="form-group">
            <input className="form-input" placeholder="Item name" value={formName} onChange={(e) => setFormName(e.target.value)} autoFocus />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <select className="form-select" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                {GROCERY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <input className="form-input" type="number" placeholder="Cost (optional)" value={formCost} onChange={(e) => setFormCost(e.target.value)} />
            </div>
          </div>
          <div className="toggle-row" style={{ paddingTop: 0, paddingBottom: 8 }}>
            <span className="text-sm">Add to pantry instead</span>
            <div className={`toggle-switch ${formToPantry ? 'on' : ''}`} onClick={() => setFormToPantry(!formToPantry)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!formName.trim()}>Add</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setFormName(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Grocery items grouped */}
      {unchecked.length === 0 && checked.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{'\uD83D\uDED2'}</div>
          <div className="empty-state-text">Your grocery list is empty. Add items or generate from your meal plan!</div>
        </div>
      ) : (
        <>
          {GROCERY_CATEGORIES.map((cat) => {
            const items = grouped[cat];
            if (!items || items.length === 0) return null;
            return (
              <div key={cat} className="grocery-group">
                <div className="section-header">{cat}</div>
                {items.map((item) => (
                  <div key={item.id} className="checkbox-row" onClick={() => toggleItem(item.id)}>
                    <div className={`checkbox-box ${item.checked ? 'checked' : ''}`} />
                    <span className="checkbox-label" style={{ flex: 1 }}>
                      {item.lowStock && <span>{'\u26A0\uFE0F'} </span>}
                      {item.name}
                      {item.fromPlan && <span className="leftover-badge" style={{ marginLeft: 4 }}>{'\uD83D\uDCC5'}</span>}
                    </span>
                    {item.estimatedCost && <span className="text-xs text-muted">{'\u20A8'}{item.estimatedCost}</span>}
                  </div>
                ))}
              </div>
            );
          })}

          {/* Checked items */}
          {checked.length > 0 && (
            <div className="grocery-done-group">
              <div className="grocery-done-header" onClick={() => setShowDone(!showDone)}>
                Done ({checked.length}) {showDone ? '\u25B2' : '\u25BC'}
              </div>
              {showDone && checked.map((item) => (
                <div key={item.id} className="checkbox-row" onClick={() => toggleItem(item.id)}>
                  <div className="checkbox-box checked" />
                  <span className="checkbox-label checked">{item.name}</span>
                  {item.estimatedCost && <span className="text-xs text-muted">{'\u20A8'}{item.estimatedCost}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="action-row">
            {checked.length > 0 && <button className="btn btn-secondary btn-sm" onClick={clearChecked}>Clear checked</button>}
            {grocery.length > 0 && <button className="btn btn-ghost btn-sm" onClick={clearAll}>Clear all</button>}
            {unchecked.length > 0 && <button className="btn btn-ghost btn-sm" onClick={exportList}>Export list</button>}
          </div>
        </>
      )}
    </div>
  );
}
