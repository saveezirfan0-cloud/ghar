import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Sheet from '../components/Sheet';
import { formatDate, daysBetween, todayISO, DAYS, DEFAULT_MEAL_CATEGORIES, checkMealAvailability } from '../utils/helpers';

export default function Meals({ showToast }) {
  const { profile } = useAuth();
  const { meals, addMeal, updateMeal, deleteMeal, plan, setPlanSlot, pantry, addGroceryBatch, grocery } = useData();

  const mealCategories = ['All', ...(profile?.meal_categories || DEFAULT_MEAL_CATEGORIES)];
  const ramadan = profile?.ramadan_mode || false;

  const [activeCategory, setActiveCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  // Cook-this-week picker
  const [cookPickerOpen, setCookPickerOpen] = useState(false);
  const [cookPickerMeal, setCookPickerMeal] = useState(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Other');
  const [formUrl, setFormUrl] = useState('');
  const [formIngredients, setFormIngredients] = useState('');

  const filtered = useMemo(() => {
    if (activeCategory === 'All') return meals;
    return meals.filter((m) => m.category === activeCategory);
  }, [meals, activeCategory]);

  const nudge = useMemo(() => {
    if (nudgeDismissed || meals.length === 0) return null;
    const today = todayISO();
    for (const meal of meals) {
      if (meal.last_cooked) {
        const days = daysBetween(meal.last_cooked, today);
        if (days >= 21) return `You haven't cooked ${meal.name} in ${Math.floor(days / 7)} weeks`;
      }
    }
    return null;
  }, [meals, nudgeDismissed]);

  async function handleSave() {
    if (!formName.trim()) return;
    await addMeal({
      name: formName.trim(),
      category: formCategory,
      recipeUrl: formUrl.trim(),
      rating: 0,
      ingredients: formIngredients.split(',').map((s) => s.trim()).filter(Boolean)
    });
    showToast(`"${formName.trim()}" added to meals`);
    resetForm();
  }

  function resetForm() {
    setFormName(''); setFormCategory('Other'); setFormUrl(''); setFormIngredients('');
    setShowForm(false);
  }

  async function handleDelete(id) {
    await deleteMeal(id);
    setExpandedId(null);
    showToast('Meal removed');
  }

  function openCookPicker(meal) {
    setCookPickerMeal(meal);
    setCookPickerOpen(true);
  }

  async function selectCookSlot(day, slot) {
    const key = `${day}-${slot}`;
    await setPlanSlot(key, cookPickerMeal.id, false);
    showToast(`${cookPickerMeal.name} added to ${day} ${slot}`);
    setCookPickerOpen(false);
    setCookPickerMeal(null);
  }

  async function addMissingToGrocery(missing) {
    const existingNames = new Set(grocery.map((g) => g.name.toLowerCase()));
    const newItems = missing.filter((m) => !existingNames.has(m.toLowerCase())).map((m) => ({ name: m, category: 'Other' }));
    if (newItems.length === 0) {
      showToast('All missing items already in your grocery list');
      return;
    }
    await addGroceryBatch(newItems);
    showToast(`${newItems.length} item${newItems.length > 1 ? 's' : ''} added to grocery`);
  }

  const slotTypes = ramadan ? ['sehri', 'iftar'] : ['breakfast', 'dinner'];
  const slotLabels = ramadan
    ? { sehri: 'Sehri', iftar: 'Iftar' }
    : { breakfast: 'Breakfast', dinner: 'Dinner' };

  return (
    <div className="page">
      <div className="page-title">Meals</div>
      <div className="page-subtitle">{meals.length} meal{meals.length !== 1 ? 's' : ''} saved</div>

      {/* Category filter */}
      <div className="pill-row mb-16">
        {mealCategories.map((cat) => (
          <span key={cat} className={`pill ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
            {cat}
          </span>
        ))}
      </div>

      {/* Nudge */}
      {nudge && (
        <div className="nudge-banner">
          <span>{nudge}</span>
          <button onClick={() => setNudgeDismissed(true)}>{'\u2715'}</button>
        </div>
      )}

      {/* Add form */}
      {!showForm ? (
        <div className="add-btn" onClick={() => setShowForm(true)}>
          <span>+</span> Add a meal
        </div>
      ) : (
        <div className="inline-form">
          <div className="form-group">
            <label className="form-label">Meal name</label>
            <input className="form-input" placeholder="e.g. Chicken Biryani" value={formName} onChange={(e) => setFormName(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
              {(profile?.meal_categories || DEFAULT_MEAL_CATEGORIES).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Recipe URL (optional)</label>
            <input className="form-input" placeholder="https://..." value={formUrl} onChange={(e) => setFormUrl(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Ingredients (comma-separated)</label>
            <input className="form-input" placeholder="rice, chicken, onion, spices" value={formIngredients} onChange={(e) => setFormIngredients(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={!formName.trim()}>Save</button>
            <button className="btn btn-ghost" onClick={resetForm}>Cancel</button>
          </div>
        </div>
      )}

      {/* Meal list */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{'\uD83C\uDF72'}</div>
          <div className="empty-state-text">
            {meals.length === 0 ? 'No meals yet. Add your favourite dishes to get started!' : `No meals in "${activeCategory}" category.`}
          </div>
        </div>
      ) : (
        filtered.map((meal) => {
          const expanded = expandedId === meal.id;
          const availability = expanded ? checkMealAvailability(meal, pantry) : null;

          return (
            <div
              key={meal.id}
              className={`meal-card ${expanded ? 'expanded' : ''}`}
              onClick={() => setExpandedId(expanded ? null : meal.id)}
            >
              <div className="meal-card-header">
                <span className="meal-card-name">{meal.name}</span>
                <span className="pill" style={{ fontSize: '0.7rem', padding: '4px 10px', minHeight: 'auto' }}>{meal.category}</span>
              </div>

              {expanded && (
                <div className="meal-card-details">
                  {/* Recipe link */}
                  {meal.recipe_url && (
                    <a href={meal.recipe_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm mb-8" onClick={(e) => e.stopPropagation()}>
                      Open recipe {'\u2192'}
                    </a>
                  )}

                  {/* Ingredients with availability check */}
                  {meal.ingredients && meal.ingredients.length > 0 && (
                    <div className="mb-12">
                      <div className="form-label">Ingredients</div>
                      <div className="ingredient-list">
                        {meal.ingredients.map((ing, i) => {
                          const inPantry = availability.available.includes(ing);
                          return (
                            <span key={i} className={`ingredient-tag ${inPantry ? 'in-pantry' : 'missing'}`}>
                              {inPantry ? '\u2705' : '\u274C'} {ing}
                            </span>
                          );
                        })}
                      </div>

                      {/* Availability summary */}
                      {availability.canMake ? (
                        <div className="availability-badge available">
                          {'\u2705'} You have everything to make this!
                        </div>
                      ) : (
                        <div className="availability-badge not-available">
                          <div>{'\u26A0\uFE0F'} Missing {availability.missing.length} ingredient{availability.missing.length > 1 ? 's' : ''}</div>
                          <button
                            className="btn btn-primary btn-sm mt-8"
                            onClick={(e) => { e.stopPropagation(); addMissingToGrocery(availability.missing); }}
                          >
                            Add missing to grocery
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {meal.last_cooked && (
                    <div className="text-sm text-muted mb-8">Last cooked: {formatDate(meal.last_cooked)}</div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); openCookPicker(meal); }}>
                      Cook this week
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(meal.id); }}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Cook-this-week day/slot picker */}
      <Sheet open={cookPickerOpen} onClose={() => { setCookPickerOpen(false); setCookPickerMeal(null); }} title={cookPickerMeal ? `Schedule "${cookPickerMeal.name}"` : 'Pick a slot'}>
        <p className="text-sm text-muted mb-12">Choose which day and meal slot:</p>
        {DAYS.map((day) => (
          <div key={day} style={{ marginBottom: 8 }}>
            <div className="fw-600 text-sm mb-8">{day}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {slotTypes.map((slot) => {
                const key = `${day}-${slot}`;
                const taken = plan[key];
                return (
                  <button
                    key={slot}
                    className={`btn btn-sm ${taken ? 'btn-ghost' : 'btn-secondary'}`}
                    onClick={() => !taken && selectCookSlot(day, slot)}
                    disabled={!!taken}
                    style={{ flex: 1, opacity: taken ? 0.4 : 1 }}
                  >
                    {slotLabels[slot]}
                    {taken && ' (taken)'}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Sheet>
    </div>
  );
}
