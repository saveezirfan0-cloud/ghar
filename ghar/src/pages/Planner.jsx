import { useState, useMemo } from 'react';
import Sheet from '../components/Sheet';
import { DAYS, MEAL_CATEGORIES, getDayName } from '../utils/helpers';

export default function Planner({
  meals, plan, setPlan, grocery, setGrocery,
  pantry, settings, showToast, setActivePage
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSlot, setPickerSlot] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [isLeftover, setIsLeftover] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  const todayDay = getDayName();
  const ramadan = settings.ramadanMode;
  const slotTypes = ramadan ? ['sehri', 'iftar'] : ['breakfast', 'dinner'];
  const slotLabels = ramadan
    ? { sehri: 'Sehri', iftar: 'Iftar' }
    : { breakfast: 'Breakfast', dinner: 'Dinner' };

  const notes = plan.notes || {};

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
    setSearch('');
    setFilterCat('All');
    setIsLeftover(false);
    setPickerOpen(true);
  }

  function selectMeal(meal) {
    const key = `${pickerSlot.day}-${pickerSlot.slot}`;
    setPlan((prev) => ({ ...prev, [key]: { mealId: meal.id, isLeftover } }));
    setPickerOpen(false);
    showToast(`${meal.name} planned for ${pickerSlot.day}`);
  }

  function clearSlot(day, slot) {
    const key = `${day}-${slot}`;
    setPlan((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateNote(day, value) {
    setPlan((prev) => ({
      ...prev,
      notes: { ...prev.notes, [day]: value }
    }));
  }

  function generateGroceryList() {
    const pantryNames = new Set(pantry.map((p) => p.name.toLowerCase()));
    const existingNames = new Set(grocery.map((g) => g.name.toLowerCase()));
    const newItems = [];

    for (const key of Object.keys(plan)) {
      if (key === 'notes') continue;
      const entry = plan[key];
      if (!entry) continue;
      const meal = meals.find((m) => m.id === entry.mealId);
      if (!meal) continue;
      for (const ing of meal.ingredients) {
        const lower = ing.toLowerCase();
        if (!pantryNames.has(lower) && !existingNames.has(lower)) {
          existingNames.add(lower);
          newItems.push({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            name: ing,
            category: 'Other',
            checked: false,
            fromPlan: true,
            inPantry: false,
            lowStock: false,
            estimatedCost: null
          });
        }
      }
    }

    if (newItems.length === 0) {
      showToast('No new items to add');
      return;
    }

    setGrocery((prev) => [...prev, ...newItems]);
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
            <span
              className="day-note-icon clickable"
              onClick={() => setEditingNote(editingNote === day ? null : day)}
            >
              {'\u270F\uFE0F'}
            </span>
          </div>

          {editingNote === day && (
            <div className="day-note">
              <input
                placeholder="Add a note..."
                value={notes[day] || ''}
                onChange={(e) => updateNote(day, e.target.value)}
                onBlur={() => setEditingNote(null)}
                autoFocus
              />
            </div>
          )}

          {notes[day] && editingNote !== day && (
            <div className="text-xs text-muted mb-8" style={{ fontStyle: 'italic' }}>{notes[day]}</div>
          )}

          {slotTypes.map((slot) => {
            const key = `${day}-${slot}`;
            const entry = plan[key];
            const meal = entry ? meals.find((m) => m.id === entry.mealId) : null;

            return (
              <div
                key={slot}
                className="day-slot"
                onClick={() => openPicker(day, slot)}
                onContextMenu={(e) => { e.preventDefault(); if (entry) clearSlot(day, slot); }}
              >
                <div>
                  <div className="day-slot-label">{slotLabels[slot]}</div>
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
                  <span className="text-xs text-muted clickable" onClick={(e) => { e.stopPropagation(); clearSlot(day, slot); }}>
                    {'\u2715'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Generate Grocery List Button */}
      <div className="sticky-bottom">
        <button className="btn btn-primary btn-block" onClick={generateGroceryList}>
          {'\uD83D\uDED2'} Generate Grocery List
        </button>
      </div>

      {/* Meal Picker Sheet */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose a meal">
        <div className="search-bar">
          <span className="search-icon">{'\uD83D\uDD0D'}</span>
          <input
            placeholder="Search meals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="pill-row mb-12">
          {MEAL_CATEGORIES.map((cat) => (
            <span key={cat} className={`pill ${filterCat === cat ? 'active' : ''}`} onClick={() => setFilterCat(cat)}>
              {cat}
            </span>
          ))}
        </div>

        <div className="toggle-row" style={{ paddingTop: 0 }}>
          <span className="text-sm">Mark as leftovers</span>
          <div className={`toggle-switch ${isLeftover ? 'on' : ''}`} onClick={() => setIsLeftover(!isLeftover)} />
        </div>

        {filteredMeals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">No meals found. Add some in the Meals section!</div>
          </div>
        ) : (
          <div style={{ maxHeight: '40dvh', overflowY: 'auto' }}>
            {filteredMeals.map((meal) => (
              <div
                key={meal.id}
                className="checkbox-row"
                onClick={() => selectMeal(meal)}
              >
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
