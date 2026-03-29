import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { GROCERY_CATEGORIES } from '../utils/helpers';

export default function Grocery({ showToast }) {
  const { profile, updateProfile } = useAuth();
  const { grocery, addGroceryItem, updateGroceryItem, deleteGroceryItem, clearCheckedGrocery, clearAllGrocery, pantry, addPantryItem, updatePantryItem, deletePantryItem } = useData();

  const [showForm, setShowForm] = useState(false);
  const [showPantry, setShowPantry] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [showBudget, setShowBudget] = useState(false);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Other');
  const [formCost, setFormCost] = useState('');
  const [formToPantry, setFormToPantry] = useState(false);

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
    return grocery.reduce((sum, g) => sum + (g.checked && g.estimated_cost ? parseFloat(g.estimated_cost) : 0), 0);
  }, [grocery]);

  async function handleAdd() {
    if (!formName.trim()) return;

    if (formToPantry) {
      await addPantryItem({ name: formName.trim(), category: formCategory });
      showToast(`"${formName.trim()}" added to pantry`);
    } else {
      await addGroceryItem({
        name: formName.trim(), category: formCategory,
        estimatedCost: formCost ? parseFloat(formCost) : null
      });
      showToast(`"${formName.trim()}" added to list`);
    }

    setFormName(''); setFormCategory('Other'); setFormCost(''); setFormToPantry(false); setShowForm(false);
  }

  async function toggleItem(id) {
    const item = grocery.find((g) => g.id === id);
    if (item) await updateGroceryItem(id, { checked: !item.checked });
  }

  async function handleClearChecked() {
    await clearCheckedGrocery();
    showToast('Checked items cleared');
  }

  async function handleClearAll() {
    if (window.confirm('Clear all grocery items?')) {
      await clearAllGrocery();
      showToast('Grocery list cleared');
    }
  }

  function exportList() {
    const text = unchecked.map((g) => `- ${g.name}${g.estimated_cost ? ` (~${g.estimated_cost})` : ''}`).join('\n');
    navigator.clipboard.writeText(text || 'No items').then(() => showToast('List copied to clipboard'));
  }

  async function handleAddPantry() {
    if (!pantryName.trim()) return;
    await addPantryItem({ name: pantryName.trim(), category: pantryCat });
    showToast(`"${pantryName.trim()}" added to pantry`);
    setPantryName(''); setPantryCat('Other');
  }

  async function toggleLowStock(item) {
    const newLow = !item.low_stock;
    await updatePantryItem(item.id, { low_stock: newLow });
    if (newLow) {
      const exists = grocery.some((g) => g.name.toLowerCase() === item.name.toLowerCase() && !g.checked);
      if (!exists) {
        await addGroceryItem({ name: item.name, category: item.category, lowStock: true, inPantry: true });
      }
    }
  }

  async function saveBudget(val) {
    await updateProfile({ weekly_budget: val ? parseFloat(val) : null });
  }

  if (showPantry) {
    const sortedPantry = [...pantry].sort((a, b) => (b.low_stock ? 1 : 0) - (a.low_stock ? 1 : 0));

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
          <button className="btn btn-primary btn-sm" onClick={handleAddPantry} disabled={!pantryName.trim()}>Add</button>
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
                  {item.low_stock && <span>{'\u26A0\uFE0F'} </span>}
                  {item.name}
                </div>
                <div className="chore-meta">
                  <span className="duration-badge">{item.category}</span>
                </div>
              </div>
              <button
                className={`btn btn-sm ${item.low_stock ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => toggleLowStock(item)}
              >
                {item.low_stock ? 'In stock' : 'Low stock'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => deletePantryItem(item.id)}>{'\u2715'}</button>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="flex-between mb-8">
        <div>
          <div className="page-title">Grocery</div>
          <div className="page-subtitle">{unchecked.length} item{unchecked.length !== 1 ? 's' : ''} left</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {profile?.weekly_budget ? (
            <span className="budget-pill" onClick={() => setShowBudget(!showBudget)}>
              {'\u20A8'} {totalCost} / {profile.weekly_budget}
            </span>
          ) : null}
          <span className="clickable" onClick={() => setShowBudget(!showBudget)}>{'\u2699\uFE0F'}</span>
          <span className="clickable" onClick={() => setShowPantry(true)}>{'\uD83C\uDFE0'}</span>
        </div>
      </div>

      {showBudget && (
        <div className="card">
          <div className="form-group">
            <label className="form-label">Weekly budget ({'\u20A8'})</label>
            <input
              className="form-input" type="number" placeholder="e.g. 5000"
              value={profile?.weekly_budget || ''}
              onChange={(e) => saveBudget(e.target.value)}
            />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowBudget(false)}>Done</button>
        </div>
      )}

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
                      {item.low_stock && <span>{'\u26A0\uFE0F'} </span>}
                      {item.name}
                      {item.from_plan && <span className="leftover-badge" style={{ marginLeft: 4 }}>{'\uD83D\uDCC5'}</span>}
                    </span>
                    {item.estimated_cost && <span className="text-xs text-muted">{'\u20A8'}{item.estimated_cost}</span>}
                  </div>
                ))}
              </div>
            );
          })}

          {checked.length > 0 && (
            <div className="grocery-done-group">
              <div className="grocery-done-header" onClick={() => setShowDone(!showDone)}>
                Done ({checked.length}) {showDone ? '\u25B2' : '\u25BC'}
              </div>
              {showDone && checked.map((item) => (
                <div key={item.id} className="checkbox-row" onClick={() => toggleItem(item.id)}>
                  <div className="checkbox-box checked" />
                  <span className="checkbox-label checked">{item.name}</span>
                  {item.estimated_cost && <span className="text-xs text-muted">{'\u20A8'}{item.estimated_cost}</span>}
                </div>
              ))}
            </div>
          )}

          <div className="action-row">
            {checked.length > 0 && <button className="btn btn-secondary btn-sm" onClick={handleClearChecked}>Clear checked</button>}
            {grocery.length > 0 && <button className="btn btn-ghost btn-sm" onClick={handleClearAll}>Clear all</button>}
            {unchecked.length > 0 && <button className="btn btn-ghost btn-sm" onClick={exportList}>Export list</button>}
          </div>
        </>
      )}
    </div>
  );
}
