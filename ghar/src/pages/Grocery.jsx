import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { GROCERY_CATEGORIES, QUANTITY_UNITS, DEFAULT_GROCERY_CHANNELS } from '../utils/helpers';

export default function Grocery({ showToast }) {
  const { profile } = useAuth();
  const { grocery, addGroceryItem, updateGroceryItem, deleteGroceryItem, clearCheckedGrocery, clearAllGrocery } = useData();

  const channels = profile?.grocery_channels || DEFAULT_GROCERY_CHANNELS;

  const [showForm, setShowForm] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterChannel, setFilterChannel] = useState('All');

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Other');
  const [formBrand, setFormBrand] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formUnit, setFormUnit] = useState('pc');
  const [formCost, setFormCost] = useState('');
  const [formChannel, setFormChannel] = useState('');
  const [formStockQty, setFormStockQty] = useState('');
  const [formRecurring, setFormRecurring] = useState(false);
  const [showRunning, setShowRunning] = useState(true);

  const recurring = useMemo(() => grocery.filter((g) => g.is_recurring), [grocery]);
  const nonRecurring = useMemo(() => grocery.filter((g) => !g.is_recurring), [grocery]);

  const unchecked = useMemo(() => {
    let list = nonRecurring.filter((g) => !g.checked);
    if (filterCategory !== 'All') list = list.filter((g) => g.category === filterCategory);
    if (filterChannel !== 'All') list = list.filter((g) => g.channel === filterChannel);
    return list;
  }, [nonRecurring, filterCategory, filterChannel]);

  const checked = useMemo(() => nonRecurring.filter((g) => g.checked), [nonRecurring]);

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

  const totalUnchecked = grocery.filter((g) => !g.checked).length;

  async function handleAdd() {
    if (!formName.trim()) return;
    await addGroceryItem({
      name: formName.trim(),
      category: formCategory,
      brand: formBrand.trim(),
      quantity: formQty ? parseFloat(formQty) : null,
      quantity_unit: formUnit,
      channel: formChannel,
      stock_qty: formStockQty ? parseFloat(formStockQty) : 0,
      estimatedCost: formCost ? parseFloat(formCost) : null,
      is_recurring: formRecurring
    });
    showToast(`"${formName.trim()}" added${formRecurring ? ' as running item' : ''}`);
    resetForm();
  }

  function resetForm() {
    setFormName(''); setFormCategory('Other'); setFormBrand(''); setFormQty('');
    setFormUnit('pc'); setFormCost(''); setFormChannel(''); setFormStockQty('');
    setFormRecurring(false); setShowForm(false);
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
    const items = grocery.filter((g) => !g.checked);
    const text = items.map((g) => {
      let line = `- ${g.name}`;
      if (g.brand) line += ` (${g.brand})`;
      if (g.quantity) line += ` ${g.quantity}${g.quantity_unit}`;
      if (g.estimated_cost) line += ` ~ \u20A8${g.estimated_cost}`;
      if (g.channel) line += ` [${g.channel}]`;
      return line;
    }).join('\n');
    navigator.clipboard.writeText(text || 'No items').then(() => showToast('List copied to clipboard'));
  }

  return (
    <div className="page">
      <div className="flex-between mb-8">
        <div>
          <div className="page-title">Grocery</div>
          <div className="page-subtitle">{totalUnchecked} item{totalUnchecked !== 1 ? 's' : ''} to buy</div>
        </div>
        {profile?.weekly_budget ? (
          <span className="budget-pill">
            {'\u20A8'} {totalCost} / {profile.weekly_budget}
          </span>
        ) : null}
      </div>

      {/* Filters */}
      <div className="pill-row mb-8">
        {['All', ...GROCERY_CATEGORIES].map((cat) => (
          <span key={cat} className={`pill ${filterCategory === cat ? 'active' : ''}`} onClick={() => setFilterCategory(cat)}>
            {cat}
          </span>
        ))}
      </div>

      {channels.length > 1 && (
        <div className="pill-row mb-16">
          <span className={`pill ${filterChannel === 'All' ? 'active' : ''}`} onClick={() => setFilterChannel('All')}>All channels</span>
          {channels.map((ch) => (
            <span key={ch} className={`pill ${filterChannel === ch ? 'active' : ''}`} onClick={() => setFilterChannel(ch)}>
              {ch}
            </span>
          ))}
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
            <label className="form-label">Item name</label>
            <input className="form-input" placeholder="e.g. Onions" value={formName} onChange={(e) => setFormName(e.target.value)} autoFocus />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Category</label>
              <select className="form-select" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                {GROCERY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Brand (optional)</label>
              <input className="form-input" placeholder="e.g. Shan" value={formBrand} onChange={(e) => setFormBrand(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Quantity</label>
              <input className="form-input" type="number" placeholder="e.g. 2" value={formQty} onChange={(e) => setFormQty(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Unit</label>
              <select className="form-select" value={formUnit} onChange={(e) => setFormUnit(e.target.value)}>
                {QUANTITY_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Cost est.</label>
              <input className="form-input" type="number" placeholder="\u20A8" value={formCost} onChange={(e) => setFormCost(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Where to buy</label>
              <select className="form-select" value={formChannel} onChange={(e) => setFormChannel(e.target.value)}>
                <option value="">Any</option>
                {channels.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Stock at home</label>
              <input className="form-input" type="number" placeholder="0" value={formStockQty} onChange={(e) => setFormStockQty(e.target.value)} />
            </div>
          </div>

          <div className="toggle-row" style={{ paddingTop: 0, paddingBottom: 8 }}>
            <span className="text-sm">{'\uD83D\uDD04'} Running item (auto-restock)</span>
            <div className={`toggle-switch ${formRecurring ? 'on' : ''}`} onClick={() => setFormRecurring(!formRecurring)} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!formName.trim()}>Add</button>
            <button className="btn btn-ghost btn-sm" onClick={resetForm}>Cancel</button>
          </div>
        </div>
      )}

      {/* Running items */}
      {recurring.length > 0 && (
        <div className="running-items-section mb-16">
          <div className="flex-between clickable" onClick={() => setShowRunning(!showRunning)} style={{ marginBottom: 8 }}>
            <div className="section-header" style={{ padding: 0 }}>{'\uD83D\uDD04'} Running Items</div>
            <span className="text-xs text-muted">{showRunning ? '\u25B2' : '\u25BC'}</span>
          </div>
          {showRunning && (
            <>
              {/* Need to buy */}
              {recurring.filter((i) => !i.checked).length > 0 && (
                <div className="mb-8">
                  <div className="text-xs fw-600 text-muted mb-8">NEED TO BUY</div>
                  {recurring.filter((i) => !i.checked).map((item) => (
                    <div key={item.id} className="running-item need">
                      <div style={{ flex: 1 }}>
                        <div className="text-sm fw-600">
                          {item.name}
                          {item.brand && <span className="text-xs text-muted"> ({item.brand})</span>}
                        </div>
                        {item.quantity && <div className="text-xs text-muted">{item.quantity} {item.quantity_unit}</div>}
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => toggleItem(item.id)} style={{ fontSize: '0.75rem', padding: '6px 12px', minHeight: 32 }}>
                        Bought
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Stocked / bought */}
              {recurring.filter((i) => i.checked).length > 0 && (
                <div>
                  <div className="text-xs fw-600 text-muted mb-8">STOCKED</div>
                  {recurring.filter((i) => i.checked).map((item) => (
                    <div key={item.id} className="running-item stocked">
                      <div style={{ flex: 1 }}>
                        <div className="text-sm" style={{ color: 'var(--text-3)' }}>
                          {'\u2705'} {item.name}
                          {item.brand && <span className="text-xs"> ({item.brand})</span>}
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleItem(item.id)} style={{ fontSize: '0.7rem', padding: '4px 10px', minHeight: 28, color: 'var(--danger)' }}>
                        Need again
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Manage */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {recurring.some((i) => i.checked) && (
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem' }} onClick={async () => { for (const item of recurring.filter((i) => i.checked)) { await updateGroceryItem(item.id, { checked: false }); } showToast('All running items set to "Need"'); }}>
                    Mark all as needed
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Grocery list */}
      {totalUnchecked === 0 && checked.length === 0 ? (
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
                  <div key={item.id} className="grocery-item-row">
                    <div className="checkbox-row" onClick={() => toggleItem(item.id)} style={{ flex: 1 }}>
                      <div className={`checkbox-box ${item.checked ? 'checked' : ''}`} />
                      <div style={{ flex: 1 }}>
                        <div className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>{item.name}</span>
                          {item.brand && <span className="text-xs text-muted">({item.brand})</span>}
                          {item.from_plan && <span className="leftover-badge">{'\uD83D\uDCC5'}</span>}
                          {item.low_stock && <span>{'\u26A0\uFE0F'}</span>}
                        </div>
                        <div className="grocery-item-meta">
                          {item.quantity && <span className="duration-badge">{item.quantity} {item.quantity_unit}</span>}
                          {item.channel && <span className="duration-badge">{item.channel}</span>}
                          {item.stock_qty > 0 && <span className="duration-badge">Stock: {item.stock_qty}</span>}
                          {item.estimated_cost && <span className="duration-badge">{'\u20A8'}{item.estimated_cost}</span>}
                        </div>
                      </div>
                    </div>
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
                  {item.estimated_cost && <span className="text-xs text-muted">{'\u20A8'}{item.estimated_cost}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="action-row">
            {checked.length > 0 && <button className="btn btn-secondary btn-sm" onClick={handleClearChecked}>Clear checked</button>}
            {grocery.length > 0 && <button className="btn btn-ghost btn-sm" onClick={handleClearAll}>Clear all</button>}
            {totalUnchecked > 0 && <button className="btn btn-ghost btn-sm" onClick={exportList}>Export list</button>}
          </div>
        </>
      )}
    </div>
  );
}
