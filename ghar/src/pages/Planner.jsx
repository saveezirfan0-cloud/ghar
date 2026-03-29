import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Sheet from '../components/Sheet';
import { DAYS, DEFAULT_MEAL_CATEGORIES, GROCERY_CATEGORIES, getDayName, getMealSlots, slotKey, parseIngredients } from '../utils/helpers';

const SKIP_REASONS = ['Party', 'Wedding', 'Dine out', 'Holiday', 'Travelling', 'Guests coming', 'Other'];

export default function Planner({ showToast, setActivePage }) {
  const { profile, updateProfile } = useAuth();
  const { meals, plan, setPlanSlot, clearPlanSlot, planNotes, setPlanNote, grocery, pantry, addGroceryBatch } = useData();

  const mealCategories = ['All', ...(profile?.meal_categories || DEFAULT_MEAL_CATEGORIES)];
  const mealSlots = getMealSlots(profile);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSlot, setPickerSlot] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [isLeftover, setIsLeftover] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  // Skip slot
  const [skipPickerSlot, setSkipPickerSlot] = useState(null); // { day, slot }
  const [customSkipReason, setCustomSkipReason] = useState('');

  // Add slot
  const [addSlotOpen, setAddSlotOpen] = useState(false);
  const [newSlotName, setNewSlotName] = useState('');

  // Grocery review
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState([]);

  const todayDay = getDayName();

  const filteredMeals = useMemo(() => {
    let list = meals;
    if (filterCat !== 'All') list = list.filter((m) => m.category === filterCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }
    return list;
  }, [meals, filterCat, search]);

  // Check if a slot is skipped (skip stored as special plan entry with __skip__ prefix)
  function getSlotSkip(day, slot) {
    const key = slotKey(day, slot);
    const entry = plan[key];
    if (entry && entry.mealId && entry.mealId.startsWith('__skip__')) {
      return { skipped: true, reason: entry.mealId.replace('__skip__', '') };
    }
    return { skipped: false, reason: '' };
  }

  function openPicker(day, slot) {
    setPickerSlot({ day, slot });
    setSearch(''); setFilterCat('All'); setIsLeftover(false);
    setPickerOpen(true);
  }

  async function selectMeal(meal) {
    const key = slotKey(pickerSlot.day, pickerSlot.slot);
    await setPlanSlot(key, meal.id, isLeftover);
    setPickerOpen(false);
    showToast(`${meal.name} planned for ${pickerSlot.day}`);
  }

  async function handleClearSlot(day, slot) {
    await clearPlanSlot(slotKey(day, slot));
  }

  async function handleNoteChange(day, value) {
    await setPlanNote(day, value);
  }

  async function skipSlot(day, slot, reason) {
    const key = slotKey(day, slot);
    // Store skip as a special mealId marker
    await setPlanSlot(key, `__skip__${reason}`, false);
    setSkipPickerSlot(null);
    setCustomSkipReason('');
    showToast(`${day} ${slot} skipped: ${reason}`);
  }

  async function unskipSlot(day, slot) {
    await clearPlanSlot(slotKey(day, slot));
    showToast(`${day} ${slot} restored`);
  }

  async function addNewSlot() {
    const trimmed = newSlotName.trim();
    if (!trimmed || mealSlots.includes(trimmed)) return;
    await updateProfile({ meal_slots: [...mealSlots, trimmed] });
    setNewSlotName('');
    setAddSlotOpen(false);
    showToast(`"${trimmed}" slot added to all days`);
  }

  async function removeSlot(slot) {
    if (mealSlots.length <= 1) { showToast('Need at least one meal slot'); return; }
    await updateProfile({ meal_slots: mealSlots.filter((s) => s !== slot) });
    showToast(`"${slot}" slot removed`);
  }

  function prepareGroceryReview() {
    const pantryNames = new Set(pantry.map((p) => p.name.toLowerCase().trim()));
    const groceryNames = new Set(grocery.map((g) => g.name.toLowerCase().trim()));
    const seen = new Set();
    const items = [];

    for (const key of Object.keys(plan)) {
      const entry = plan[key];
      if (!entry || !entry.mealId || entry.mealId.startsWith('__skip__')) continue;
      const meal = meals.find((m) => m.id === entry.mealId);
      if (!meal) continue;
      const ingredients = parseIngredients(meal);
      for (const ing of ingredients) {
        const lower = ing.name.toLowerCase().trim();
        if (seen.has(lower)) continue;
        seen.add(lower);
        const inPantry = pantryNames.has(lower);
        const alreadyOnList = groceryNames.has(lower);
        items.push({
          name: ing.name, qty: ing.qty || '', unit: ing.unit || '',
          category: 'Other', inPantry, alreadyOnList,
          selected: !inPantry && !alreadyOnList
        });
      }
    }

    if (items.length === 0) { showToast('No ingredients found in planned meals'); return; }
    setReviewItems(items);
    setReviewOpen(true);
  }

  function toggleReviewItem(index) {
    setReviewItems((prev) => prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item));
  }

  function updateReviewCategory(index, category) {
    setReviewItems((prev) => prev.map((item, i) => i === index ? { ...item, category } : item));
  }

  async function confirmGroceryAdd() {
    const toAdd = reviewItems.filter((item) => item.selected && !item.inPantry && !item.alreadyOnList);
    if (toAdd.length === 0) { showToast('No items selected to add'); return; }
    const batchItems = toAdd.map((item) => ({
      name: item.name,
      category: item.category,
      quantity: item.qty ? parseFloat(item.qty) : null,
      quantity_unit: item.unit || 'pc'
    }));
    await addGroceryBatch(batchItems);
    showToast(`${toAdd.length} item${toAdd.length > 1 ? 's' : ''} added to grocery`);
    setReviewOpen(false);
    setTimeout(() => setActivePage('grocery'), 1500);
  }

  return (
    <div className="page">
      <div className="flex-between mb-8">
        <div>
          <div className="page-title">Meal Planner</div>
          <div className="page-subtitle">Plan your week</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setAddSlotOpen(true)}>
          + Slot
        </button>
      </div>

      {/* Slot management bar */}
      <div className="pill-row mb-16">
        {mealSlots.map((slot) => (
          <span key={slot} className="pill active" style={{ gap: 6 }}>
            {slot}
            {mealSlots.length > 1 && (
              <span className="clickable" onClick={() => removeSlot(slot)} style={{ opacity: 0.5, fontSize: '0.65rem' }}>{'\u2715'}</span>
            )}
          </span>
        ))}
      </div>

      {DAYS.map((day) => {
        const noteText = planNotes[day]?.text || '';

        return (
          <div key={day} className={`day-card ${day === todayDay ? 'today' : ''}`}>
            <div className="day-card-header">
              <span className="day-name">
                {day}
                {day === todayDay && <span className="badge badge-accent" style={{ marginLeft: 8 }}>Today</span>}
              </span>
              <span className="day-note-icon clickable" onClick={() => setEditingNote(editingNote === day ? null : day)}>{'\u270F\uFE0F'}</span>
            </div>

            {/* Note */}
            {editingNote === day && (
              <div className="day-note">
                <input placeholder="Add a note..." value={noteText} onChange={(e) => handleNoteChange(day, e.target.value)} onBlur={() => setEditingNote(null)} autoFocus />
              </div>
            )}
            {noteText && editingNote !== day && (
              <div className="text-xs text-muted mb-8" style={{ fontStyle: 'italic' }}>{noteText}</div>
            )}

            {/* Meal slots */}
            {mealSlots.map((slot) => {
              const key = slotKey(day, slot);
              const entry = plan[key];
              const slotSkip = getSlotSkip(day, slot);
              const meal = (entry && !slotSkip.skipped) ? meals.find((m) => m.id === entry.mealId) : null;

              if (slotSkip.skipped) {
                return (
                  <div key={slot} className="day-slot skipped-slot">
                    <div>
                      <div className="day-slot-label">{slot}</div>
                      <div className="skip-badge" style={{ marginTop: 4, marginBottom: 0 }}>
                        {'\uD83D\uDE45'} {slotSkip.reason}
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => unskipSlot(day, slot)} style={{ fontSize: '0.7rem', padding: '4px 8px', minHeight: 28 }}>
                      Undo
                    </button>
                  </div>
                );
              }

              return (
                <div key={slot} className="day-slot" onClick={() => openPicker(day, slot)} onContextMenu={(e) => { e.preventDefault(); if (entry) handleClearSlot(day, slot); }}>
                  <div style={{ flex: 1 }}>
                    <div className="day-slot-label">{slot}</div>
                    {meal ? (
                      <div className="day-slot-meal">
                        {meal.name}
                        {entry.isLeftover && <span className="leftover-badge">{'\uD83C\uDF71'}</span>}
                      </div>
                    ) : (
                      <div className="day-slot-empty">Tap to plan</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {entry && (
                      <span className="text-xs text-muted clickable" onClick={(e) => { e.stopPropagation(); handleClearSlot(day, slot); }}>{'\u2715'}</span>
                    )}
                    <span className="text-xs clickable" onClick={(e) => { e.stopPropagation(); setSkipPickerSlot({ day, slot }); }} style={{ color: 'var(--text-3)', padding: '4px' }} title="Skip this meal">
                      {'\uD83D\uDE45'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="sticky-bottom">
        <button className="btn btn-primary btn-block" onClick={prepareGroceryReview}>{'\uD83D\uDED2'} Generate Grocery List</button>
      </div>

      {/* Meal Picker Sheet */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose a meal">
        <div className="search-bar">
          <span className="search-icon">{'\uD83D\uDD0D'}</span>
          <input placeholder="Search meals..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="pill-row mb-12">
          {mealCategories.map((cat) => (
            <span key={cat} className={`pill ${filterCat === cat ? 'active' : ''}`} onClick={() => setFilterCat(cat)}>{cat}</span>
          ))}
        </div>
        <div className="toggle-row" style={{ paddingTop: 0 }}>
          <span className="text-sm">Mark as leftovers</span>
          <div className={`toggle-switch ${isLeftover ? 'on' : ''}`} onClick={() => setIsLeftover(!isLeftover)} />
        </div>
        {filteredMeals.length === 0 ? (
          <div className="empty-state"><div className="empty-state-text">No meals found. Add some in the Meals section!</div></div>
        ) : (
          <div style={{ maxHeight: '40dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {filteredMeals.map((meal) => (
              <div key={meal.id} className="checkbox-row" onClick={() => selectMeal(meal)}>
                <span className="meal-card-name">{meal.name}</span>
                <span className="pill" style={{ fontSize: '0.65rem', padding: '2px 8px', minHeight: 'auto' }}>{meal.category}</span>
              </div>
            ))}
          </div>
        )}
        <button className="btn btn-ghost btn-block mt-12" onClick={() => setPickerOpen(false)}>Cancel</button>
      </Sheet>

      {/* Skip Meal Picker */}
      <Sheet open={!!skipPickerSlot} onClose={() => { setSkipPickerSlot(null); setCustomSkipReason(''); }} title={skipPickerSlot ? `Skip ${skipPickerSlot.day} ${skipPickerSlot.slot}` : 'Skip'}>
        <p className="text-sm text-muted mb-12">Why are you skipping this meal?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SKIP_REASONS.filter((r) => r !== 'Other').map((reason) => (
            <button key={reason} className="btn btn-secondary btn-block" style={{ justifyContent: 'flex-start' }} onClick={() => skipPickerSlot && skipSlot(skipPickerSlot.day, skipPickerSlot.slot, reason)}>
              {reason}
            </button>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input className="form-input" placeholder="Custom reason..." value={customSkipReason} onChange={(e) => setCustomSkipReason(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && customSkipReason.trim() && skipPickerSlot && skipSlot(skipPickerSlot.day, skipPickerSlot.slot, customSkipReason.trim())} style={{ flex: 1 }} />
            <button className="btn btn-primary btn-sm" onClick={() => customSkipReason.trim() && skipPickerSlot && skipSlot(skipPickerSlot.day, skipPickerSlot.slot, customSkipReason.trim())} disabled={!customSkipReason.trim()}>Skip</button>
          </div>
        </div>
      </Sheet>

      {/* Add Slot Sheet */}
      <Sheet open={addSlotOpen} onClose={() => { setAddSlotOpen(false); setNewSlotName(''); }} title="Add a meal slot">
        <p className="text-sm text-muted mb-12">Add a new meal slot that appears on every day (e.g. Lunch, Tea Time, Snacks).</p>
        <div className="form-group">
          <input className="form-input" placeholder="e.g. Lunch" value={newSlotName} onChange={(e) => setNewSlotName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNewSlot()} autoFocus />
        </div>
        <div className="mb-12">
          <div className="form-label">Current slots</div>
          <div className="pill-row" style={{ flexWrap: 'wrap' }}>
            {mealSlots.map((s) => <span key={s} className="pill active">{s}</span>)}
          </div>
        </div>
        <button className="btn btn-primary btn-block" onClick={addNewSlot} disabled={!newSlotName.trim()}>Add Slot</button>
      </Sheet>

      {/* Grocery Review Sheet */}
      <Sheet open={reviewOpen} onClose={() => setReviewOpen(false)} title="Review Grocery Items">
        {(() => {
          const inPantryItems = reviewItems.filter((i) => i.inPantry);
          const onListItems = reviewItems.filter((i) => i.alreadyOnList);
          const toAddItems = reviewItems.filter((i) => !i.inPantry && !i.alreadyOnList);
          const selectedCount = reviewItems.filter((i) => i.selected && !i.inPantry && !i.alreadyOnList).length;

          return (
            <div style={{ maxHeight: '60dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
              {/* To Add section */}
              {toAddItems.length > 0 && (
                <div className="mb-12">
                  <div className="section-header">To Add ({selectedCount} selected)</div>
                  {toAddItems.map((item) => {
                    const idx = reviewItems.indexOf(item);
                    return (
                      <div key={idx} className="review-item">
                        <div className={`checkbox-box ${item.selected ? 'checked' : ''}`} onClick={() => toggleReviewItem(idx)} />
                        <div style={{ flex: 1 }}>
                          <div className="text-sm fw-600">{item.name}</div>
                          {(item.qty || item.unit) && <div className="text-xs text-muted">{item.qty} {item.unit}</div>}
                        </div>
                        <select className="form-select" value={item.category} onChange={(e) => updateReviewCategory(idx, e.target.value)} style={{ width: 100, minHeight: 36, fontSize: '0.75rem', padding: '4px 8px' }} onClick={(e) => e.stopPropagation()}>
                          {GROCERY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* In Pantry section */}
              {inPantryItems.length > 0 && (
                <div className="mb-12">
                  <div className="section-header">{'\u2705'} In Your Pantry ({inPantryItems.length})</div>
                  {inPantryItems.map((item, i) => (
                    <div key={i} className="review-item pantry">
                      <span className="text-sm">{'\u2705'}</span>
                      <span className="text-sm" style={{ flex: 1 }}>{item.name}</span>
                      {(item.qty || item.unit) && <span className="text-xs text-muted">{item.qty} {item.unit}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Already on list section */}
              {onListItems.length > 0 && (
                <div className="mb-12">
                  <div className="section-header">{'\uD83D\uDED2'} Already on Grocery List ({onListItems.length})</div>
                  {onListItems.map((item, i) => (
                    <div key={i} className="review-item on-list">
                      <span className="text-sm">{'\uD83D\uDED2'}</span>
                      <span className="text-sm" style={{ flex: 1 }}>{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={confirmGroceryAdd} disabled={reviewItems.filter((i) => i.selected && !i.inPantry && !i.alreadyOnList).length === 0}>
            Add {reviewItems.filter((i) => i.selected && !i.inPantry && !i.alreadyOnList).length} to Grocery
          </button>
          <button className="btn btn-ghost" onClick={() => setReviewOpen(false)}>Cancel</button>
        </div>
      </Sheet>
    </div>
  );
}
