import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Sheet from '../components/Sheet';
import { DAYS, DEFAULT_MEAL_CATEGORIES, getDayName, getMealSlots, slotKey, parseIngredients } from '../utils/helpers';

export default function Planner({ showToast, setActivePage }) {
  const { profile } = useAuth();
  const { meals, plan, setPlanSlot, clearPlanSlot, planNotes, setPlanNote, grocery, pantry, addGroceryBatch } = useData();

  const mealCategories = ['All', ...(profile?.meal_categories || DEFAULT_MEAL_CATEGORIES)];
  const mealSlots = getMealSlots(profile);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSlot, setPickerSlot] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [isLeftover, setIsLeftover] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

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

  async function generateGroceryList() {
    const pantryNames = new Set(pantry.map((p) => p.name.toLowerCase()));
    const existingNames = new Set(grocery.map((g) => g.name.toLowerCase()));
    const newItems = [];

    for (const key of Object.keys(plan)) {
      const entry = plan[key];
      if (!entry || !entry.mealId) continue;
      const meal = meals.find((m) => m.id === entry.mealId);
      if (!meal) continue;
      const ingredients = parseIngredients(meal);
      for (const ing of ingredients) {
        const lower = ing.name.toLowerCase();
        if (!pantryNames.has(lower) && !existingNames.has(lower)) {
          existingNames.add(lower);
          newItems.push({ name: `${ing.name}${ing.qty ? ` (${ing.qty}${ing.unit})` : ''}`, category: 'Other' });
        }
      }
    }

    if (newItems.length === 0) { showToast('No new items to add'); return; }
    await addGroceryBatch(newItems);
    showToast(`${newItems.length} item${newItems.length > 1 ? 's' : ''} added to your list`);
    setTimeout(() => setActivePage('grocery'), 1500);
  }

  return (
    <div className="page">
      <div className="page-title">Meal Planner</div>
      <div className="page-subtitle">Plan your week</div>

      {DAYS.map((day) => (
        <div key={day} className={`day-card ${day === todayDay ? 'today' : ''}`}>
          <div className="day-card-header">
            <span className="day-name">
              {day}
              {day === todayDay && <span className="badge badge-accent" style={{ marginLeft: 8 }}>Today</span>}
            </span>
            <span className="day-note-icon clickable" onClick={() => setEditingNote(editingNote === day ? null : day)}>{'\u270F\uFE0F'}</span>
          </div>

          {editingNote === day && (
            <div className="day-note">
              <input placeholder="Add a note..." value={planNotes[day]?.text || ''} onChange={(e) => handleNoteChange(day, e.target.value)} onBlur={() => setEditingNote(null)} autoFocus />
            </div>
          )}

          {planNotes[day]?.text && editingNote !== day && (
            <div className="text-xs text-muted mb-8" style={{ fontStyle: 'italic' }}>{planNotes[day].text}</div>
          )}

          {mealSlots.map((slot) => {
            const key = slotKey(day, slot);
            const entry = plan[key];
            const meal = entry ? meals.find((m) => m.id === entry.mealId) : null;

            return (
              <div key={slot} className="day-slot" onClick={() => openPicker(day, slot)} onContextMenu={(e) => { e.preventDefault(); if (entry) handleClearSlot(day, slot); }}>
                <div>
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
                {entry && (
                  <span className="text-xs text-muted clickable" onClick={(e) => { e.stopPropagation(); handleClearSlot(day, slot); }}>{'\u2715'}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div className="sticky-bottom">
        <button className="btn btn-primary btn-block" onClick={generateGroceryList}>{'\uD83D\uDED2'} Generate Grocery List</button>
      </div>

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
    </div>
  );
}
