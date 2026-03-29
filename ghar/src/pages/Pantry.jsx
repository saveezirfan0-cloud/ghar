import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { GROCERY_CATEGORIES } from '../utils/helpers';

export default function Pantry({ showToast }) {
  const { pantry, addPantryItem, updatePantryItem, deletePantryItem, grocery, addGroceryItem } = useData();

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Other');
  const [filterCategory, setFilterCategory] = useState('All');

  const sorted = useMemo(() => {
    let list = [...pantry].sort((a, b) => (b.low_stock ? 1 : 0) - (a.low_stock ? 1 : 0));
    if (filterCategory !== 'All') {
      list = list.filter((p) => p.category === filterCategory);
    }
    return list;
  }, [pantry, filterCategory]);

  const categories = useMemo(() => {
    const cats = new Set(pantry.map((p) => p.category));
    return ['All', ...Array.from(cats)];
  }, [pantry]);

  const lowStockCount = useMemo(() => pantry.filter((p) => p.low_stock).length, [pantry]);

  async function handleAdd() {
    if (!formName.trim()) return;
    await addPantryItem({ name: formName.trim(), category: formCategory });
    showToast(`"${formName.trim()}" added to pantry`);
    setFormName('');
    setFormCategory('Other');
    setShowForm(false);
  }

  async function toggleLowStock(item) {
    const newLow = !item.low_stock;
    await updatePantryItem(item.id, { low_stock: newLow });

    if (newLow) {
      const exists = grocery.some((g) => g.name.toLowerCase() === item.name.toLowerCase() && !g.checked);
      if (!exists) {
        await addGroceryItem({ name: item.name, category: item.category, lowStock: true, inPantry: true });
        showToast(`"${item.name}" added to grocery list`);
      } else {
        showToast(`"${item.name}" marked as low stock`);
      }
    } else {
      showToast(`"${item.name}" back in stock`);
    }
  }

  async function handleDelete(id) {
    await deletePantryItem(id);
    showToast('Item removed from pantry');
  }

  return (
    <div className="page">
      <div className="page-title">Pantry</div>
      <div className="page-subtitle">
        {pantry.length} item{pantry.length !== 1 ? 's' : ''} at home
        {lowStockCount > 0 && ` \u00B7 ${lowStockCount} low stock`}
      </div>

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="pill-row mb-16">
          {categories.map((cat) => (
            <span
              key={cat}
              className={`pill ${filterCategory === cat ? 'active' : ''}`}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Add form */}
      {!showForm ? (
        <div className="add-btn" onClick={() => setShowForm(true)}>
          <span>+</span> Add pantry item
        </div>
      ) : (
        <div className="inline-form">
          <div className="form-group">
            <input
              className="form-input"
              placeholder="Item name (e.g. Rice, Salt, Oil)"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
          </div>
          <div className="form-group">
            <select className="form-select" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
              {GROCERY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!formName.trim()}>Add</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setFormName(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Pantry list */}
      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{'\uD83C\uDFE0'}</div>
          <div className="empty-state-text">
            {pantry.length === 0
              ? 'Your pantry is empty. Add items you always have at home — like rice, salt, oil, spices.'
              : 'No items match this filter.'}
          </div>
        </div>
      ) : (
        sorted.map((item) => (
          <div key={item.id} className="chore-item">
            <div className="chore-info">
              <div className="chore-name">
                {item.low_stock && <span>{'\u26A0\uFE0F'} </span>}
                {item.name}
              </div>
              <div className="chore-meta">
                <span className="duration-badge">{item.category}</span>
                {item.low_stock && <span className="snooze-badge">Low stock</span>}
              </div>
            </div>
            <button
              className={`btn btn-sm ${item.low_stock ? 'btn-success' : 'btn-danger'}`}
              onClick={() => toggleLowStock(item)}
              style={{ fontSize: '0.75rem', padding: '6px 10px', minHeight: 36 }}
            >
              {item.low_stock ? 'In stock' : 'Low'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => handleDelete(item.id)}
              style={{ padding: '6px 8px', minHeight: 36 }}
            >
              {'\u2715'}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
