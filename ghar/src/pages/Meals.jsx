import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Sheet from '../components/Sheet';
import { formatDate, daysBetween, todayISO, DAYS, DEFAULT_MEAL_CATEGORIES, INGREDIENT_UNITS, GROCERY_CATEGORIES, checkMealAvailability, parseIngredients, getMealSlots, slotKey, suggestMeal } from '../utils/helpers';

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

  // Missing ingredients review
  const [missingReviewOpen, setMissingReviewOpen] = useState(false);
  const [missingItems, setMissingItems] = useState([]);

  // Meal suggestion
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestedMeal, setSuggestedMeal] = useState(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Other');
  const [formUrl, setFormUrl] = useState('');
  const [formCalories, setFormCalories] = useState('');
  const [formIngredients, setFormIngredients] = useState([{ name: '', qty: '', unit: '' }]);

  const showCalories = profile?.show_calories || false;
  const showServings = profile?.show_servings || false;
  const defaultServings = profile?.default_servings || 2;

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

  // Meals sorted by "staleness" for suggestions
  const mealSuggestions = useMemo(() => {
    if (meals.length === 0) return [];
    const today = todayISO();
    return [...meals].map((m) => ({
      ...m,
      daysSinceCooked: m.last_cooked ? daysBetween(m.last_cooked, today) : 999,
    })).sort((a, b) => b.daysSinceCooked - a.daysSinceCooked).slice(0, 5);
  }, [meals]);

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
      ingredients_json: cleanIngredients,
      calories_per_serving: formCalories ? parseInt(formCalories) : null
    });
    showToast(`"${formName.trim()}" added to meals`);
    resetForm();
  }

  function resetForm() {
    setFormName(''); setFormCategory('Other'); setFormUrl(''); setFormCalories('');
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

  function openMissingReview(missing) {
    const existingNames = new Set(grocery.map((g) => g.name.toLowerCase()));
    const items = missing.map((m) => ({
      name: m.name, qty: m.qty || '', unit: m.unit || '',
      category: 'Other', selected: !existingNames.has(m.name.toLowerCase()),
      alreadyOnList: existingNames.has(m.name.toLowerCase())
    }));
    setMissingItems(items);
    setMissingReviewOpen(true);
  }

  function toggleMissingItem(index) {
    setMissingItems((prev) => prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item));
  }

  function updateMissingCategory(index, category) {
    setMissingItems((prev) => prev.map((item, i) => i === index ? { ...item, category } : item));
  }

  async function confirmMissingAdd() {
    const toAdd = missingItems.filter((i) => i.selected && !i.alreadyOnList);
    if (toAdd.length === 0) { showToast('No items selected'); return; }
    await addGroceryBatch(toAdd.map((i) => ({
      name: i.name, category: i.category,
      quantity: i.qty ? parseFloat(i.qty) : null,
      quantity_unit: i.unit || 'pc'
    })));
    showToast(`${toAdd.length} item${toAdd.length > 1 ? 's' : ''} added to grocery`);
    setMissingReviewOpen(false);
  }

  function handleSuggestMeal() {
    if (mealSuggestions.length === 0) { showToast('Add some meals first'); return; }
    setSuggestedMeal(mealSuggestions[0]);
    setSuggestionOpen(true);
  }

  function nextSuggestion() {
    const currentIdx = mealSuggestions.findIndex((m) => m.id === suggestedMeal?.id);
    const nextIdx = (currentIdx + 1) % mealSuggestions.length;
    setSuggestedMeal(mealSuggestions[nextIdx]);
  }

  return (
    <div className="page">
      <div className="flex-between mb-8">
        <div>
          <div className="page-title">Meals</div>
          <div className="page-subtitle">{meals.length} meal{meals.length !== 1 ? 's' : ''} saved</div>
        </div>
        {meals.length > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={handleSuggestMeal}>
            {'\uD83C\uDFB2'} Suggest
          </button>
        )}
      </div>

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

          {showCalories && (
            <div className="form-group">
              <label className="form-label">Calories per serving (optional)</label>
              <input className="form-input" type="number" placeholder="e.g. 350" value={formCalories} onChange={(e) => setFormCalories(e.target.value)} />
            </div>
          )}

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
                            <button className="btn btn-primary btn-sm mt-8" onClick={(e) => { e.stopPropagation(); openMissingReview(availability.missing); }}>
                              Add missing to grocery
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {showCalories && meal.calories_per_serving && (
                    <div className="text-sm mb-8" style={{ color: 'var(--accent-text)' }}>
                      {'\uD83D\uDD25'} {meal.calories_per_serving} cal/serving
                      {showServings && <span className="text-muted"> &middot; {meal.calories_per_serving * defaultServings} cal for {defaultServings} people</span>}
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

      {/* Missing Ingredients Review Sheet */}
      <Sheet open={missingReviewOpen} onClose={() => setMissingReviewOpen(false)} title="Add to Grocery">
        <p className="text-sm text-muted mb-12">Review missing ingredients before adding:</p>
        <div style={{ maxHeight: '50dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {missingItems.map((item, idx) => (
            <div key={idx} className="review-item">
              {item.alreadyOnList ? (
                <>
                  <span className="text-sm">{'\uD83D\uDED2'}</span>
                  <span className="text-sm text-muted" style={{ flex: 1, textDecoration: 'line-through' }}>{item.name}</span>
                  <span className="text-xs text-muted">Already on list</span>
                </>
              ) : (
                <>
                  <div className={`checkbox-box ${item.selected ? 'checked' : ''}`} onClick={() => toggleMissingItem(idx)} />
                  <div style={{ flex: 1 }}>
                    <div className="text-sm fw-600">{item.name}</div>
                    {(item.qty || item.unit) && <div className="text-xs text-muted">{item.qty} {item.unit}</div>}
                  </div>
                  <select className="form-select" value={item.category} onChange={(e) => updateMissingCategory(idx, e.target.value)} style={{ width: 100, minHeight: 36, fontSize: '0.75rem', padding: '4px 8px' }}>
                    {GROCERY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={confirmMissingAdd} disabled={missingItems.filter((i) => i.selected && !i.alreadyOnList).length === 0}>
            Add {missingItems.filter((i) => i.selected && !i.alreadyOnList).length} to Grocery
          </button>
          <button className="btn btn-ghost" onClick={() => setMissingReviewOpen(false)}>Cancel</button>
        </div>
      </Sheet>

      {/* Meal Suggestion Sheet */}
      <Sheet open={suggestionOpen} onClose={() => setSuggestionOpen(false)} title="Meal Suggestion">
        {suggestedMeal && (
          <div style={{ textAlign: 'center' }}>
            <div className="suggestion-meal-name">{suggestedMeal.name}</div>
            <div className="pill" style={{ margin: '8px auto', display: 'inline-flex' }}>{suggestedMeal.category}</div>
            <div className="text-sm text-muted mb-12">
              {suggestedMeal.daysSinceCooked >= 999
                ? "You've never cooked this!"
                : suggestedMeal.daysSinceCooked === 0
                ? 'Cooked today'
                : `Last cooked ${suggestedMeal.daysSinceCooked} day${suggestedMeal.daysSinceCooked > 1 ? 's' : ''} ago`}
            </div>
            {suggestedMeal.calories_per_serving && showCalories && (
              <div className="text-sm mb-12">{'\uD83D\uDD25'} {suggestedMeal.calories_per_serving} cal/serving</div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => { openCookPicker(suggestedMeal); setSuggestionOpen(false); }}>Cook this week</button>
              <button className="btn btn-secondary" onClick={nextSuggestion}>Try another</button>
              <button className="btn btn-ghost" onClick={() => setSuggestionOpen(false)}>Close</button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
