import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Sheet from '../components/Sheet';
import { formatDate, daysBetween, todayISO, DAYS, DEFAULT_MEAL_CATEGORIES, INGREDIENT_UNITS, checkMealAvailability, parseIngredients, getMealSlots, slotKey } from '../utils/helpers';

export default function Meals({ showToast }) {
  const { profile } = useAuth();
  const { meals, addMeal, updateMeal, deleteMeal, plan, setPlanSlot, pantry, addGroceryBatch, grocery } = useData();

  const mealCategories = ['All', ...(profile?.meal_categories || DEFAULT_MEAL_CATEGORIES)];
  const mealSlots = getMealSlots(profile);

  const [activeCategory, setActiveCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [cookPickerOpen, setCookPickerOpen] = useState(false);
  const [cookPickerMeal, setCookPickerMeal] = useState(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Other');
  const [formUrl, setFormUrl] = useState('');
  const [formIngredients, setFormIngredients] = useState([{ name: '', qty: '', unit: '' }]);

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

  function addIngredientRow() {
    setFormIngredients((prev) => [...prev, { name: '', qty: '', unit: '' }]);
  }

  function updateIngredientRow(index, field, value) {
    setFormIngredients((prev) => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  }

  function removeIngredientRow(index) {
    setFormIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!formName.trim()) return;
    const cleanIngredients = formIngredients.filter((i) => i.name.trim());
    await addMeal({
      name: formName.trim(),
      category: formCategory,
      recipeUrl: formUrl.trim(),
      ingredients_json: cleanIngredients
    });
    showToast(`"${formName.trim()}" added to meals`);
    resetForm();
  }

  function resetForm() {
    setFormName(''); setFormCategory('Other'); setFormUrl('');
    setFormIngredients([{ name: '', qty: '', unit: '' }]);
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
    const key = slotKey(day, slot);
    await setPlanSlot(key, cookPickerMeal.id, false);
    showToast(`${cookPickerMeal.name} added to ${day} ${slot}`);
    setCookPickerOpen(false);
    setCookPickerMeal(null);
  }

  async function addMissingToGrocery(missing) {
    const existingNames = new Set(grocery.map((g) => g.name.toLowerCase()));
    const newItems = missing.filter((m) => !existingNames.has(m.name.toLowerCase())).map((m) => ({ name: `${m.name}${m.qty ? ` (${m.qty}${m.unit})` : ''}`, category: 'Other' }));
    if (newItems.length === 0) { showToast('All items already in grocery list'); return; }
    await addGroceryBatch(newItems);
    showToast(`${newItems.length} item${newItems.length > 1 ? 's' : ''} added to grocery`);
  }

  return (
    <div className="page">
      <div className="page-title">Meals</div>
      <div className="page-subtitle">{meals.length} meal{meals.length !== 1 ? 's' : ''} saved</div>

      <div className="pill-row mb-16">
        {mealCategories.map((cat) => (
          <span key={cat} className={`pill ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>{cat}</span>
        ))}
      </div>

      {nudge && (
        <div className="nudge-banner">
          <span>{nudge}</span>
          <button onClick={() => setNudgeDismissed(true)}>{'\u2715'}</button>
        </div>
      )}

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

          {/* Ingredient line items */}
          <div className="form-group">
            <label className="form-label">Ingredients</label>
            {formIngredients.map((ing, i) => (
              <div key={i} className="ingredient-row">
                <input className="form-input ingredient-name-input" placeholder="Item name" value={ing.name} onChange={(e) => updateIngredientRow(i, 'name', e.target.value)} />
                <input className="form-input ingredient-qty-input" placeholder="Qty" type="text" value={ing.qty} onChange={(e) => updateIngredientRow(i, 'qty', e.target.value)} />
                <select className="form-select ingredient-unit-input" value={ing.unit} onChange={(e) => updateIngredientRow(i, 'unit', e.target.value)}>
                  {INGREDIENT_UNITS.map((u) => <option key={u} value={u}>{u || '-'}</option>)}
                </select>
                {formIngredients.length > 1 && (
                  <button className="btn-icon-remove" onClick={() => removeIngredientRow(i)}>{'\u2715'}</button>
                )}
              </div>
            ))}
            <button className="btn btn-ghost btn-sm mt-8" onClick={addIngredientRow}>+ Add ingredient</button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={!formName.trim()}>Save</button>
            <button className="btn btn-ghost" onClick={resetForm}>Cancel</button>
          </div>
        </div>
      )}

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
          const ingredients = expanded ? parseIngredients(meal) : [];
          const availability = expanded && ingredients.length > 0 ? checkMealAvailability(meal, pantry) : null;

          return (
            <div key={meal.id} className={`meal-card ${expanded ? 'expanded' : ''}`} onClick={() => setExpandedId(expanded ? null : meal.id)}>
              <div className="meal-card-header">
                <span className="meal-card-name">{meal.name}</span>
                <span className="pill" style={{ fontSize: '0.7rem', padding: '4px 10px', minHeight: 'auto' }}>{meal.category}</span>
              </div>

              {expanded && (
                <div className="meal-card-details">
                  {meal.recipe_url && (
                    <a href={meal.recipe_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm mb-8" onClick={(e) => e.stopPropagation()}>
                      Open recipe {'\u2192'}
                    </a>
                  )}

                  {ingredients.length > 0 && (
                    <div className="mb-12">
                      <div className="form-label">Ingredients</div>
                      <div className="ingredient-list-view">
                        {ingredients.map((ing, i) => {
                          const inPantry = availability ? availability.available.some((a) => a.name === ing.name) : false;
                          return (
                            <div key={i} className={`ingredient-line ${inPantry ? 'in-pantry' : 'missing'}`}>
                              <span className="ingredient-status">{inPantry ? '\u2705' : '\u274C'}</span>
                              <span className="ingredient-line-name">{ing.name}</span>
                              {(ing.qty || ing.unit) && (
                                <span className="ingredient-line-qty">{ing.qty}{ing.unit ? ` ${ing.unit}` : ''}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {availability && (
                        availability.canMake ? (
                          <div className="availability-badge available">{'\u2705'} You have everything to make this!</div>
                        ) : (
                          <div className="availability-badge not-available">
                            <div>{'\u26A0\uFE0F'} Missing {availability.missing.length} ingredient{availability.missing.length > 1 ? 's' : ''}</div>
                            <button className="btn btn-primary btn-sm mt-8" onClick={(e) => { e.stopPropagation(); addMissingToGrocery(availability.missing); }}>
                              Add missing to grocery
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {meal.last_cooked && <div className="text-sm text-muted mb-8">Last cooked: {formatDate(meal.last_cooked)}</div>}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); openCookPicker(meal); }}>Cook this week</button>
                    <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(meal.id); }}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      <Sheet open={cookPickerOpen} onClose={() => { setCookPickerOpen(false); setCookPickerMeal(null); }} title={cookPickerMeal ? `Schedule "${cookPickerMeal.name}"` : 'Pick a slot'}>
        <p className="text-sm text-muted mb-12">Choose which day and meal slot:</p>
        {DAYS.map((day) => (
          <div key={day} style={{ marginBottom: 8 }}>
            <div className="fw-600 text-sm mb-8">{day}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {mealSlots.map((slot) => {
                const key = slotKey(day, slot);
                const taken = plan[key];
                return (
                  <button key={slot} className={`btn btn-sm ${taken ? 'btn-ghost' : 'btn-secondary'}`} onClick={() => !taken && selectCookSlot(day, slot)} disabled={!!taken} style={{ flex: 1, minWidth: 80, opacity: taken ? 0.4 : 1 }}>
                    {slot}{taken && ' \u2713'}
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
