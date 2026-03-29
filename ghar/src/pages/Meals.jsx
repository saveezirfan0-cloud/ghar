import { useState, useMemo } from 'react';
import { uid, MEAL_CATEGORIES, formatDate, daysBetween, todayISO, DAYS } from '../utils/helpers';

export default function Meals({ meals, setMeals, plan, setPlan, showToast }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Other');
  const [formUrl, setFormUrl] = useState('');
  const [formIngredients, setFormIngredients] = useState('');
  const [formRating, setFormRating] = useState(0);

  const filtered = useMemo(() => {
    if (activeCategory === 'All') return meals;
    return meals.filter((m) => m.category === activeCategory);
  }, [meals, activeCategory]);

  const nudge = useMemo(() => {
    if (nudgeDismissed || meals.length === 0) return null;
    const today = todayISO();
    for (const meal of meals) {
      if (meal.lastCooked) {
        const days = daysBetween(meal.lastCooked, today);
        if (days >= 21) return `You haven't cooked ${meal.name} in ${Math.floor(days / 7)} weeks`;
      }
    }
    const counts = {};
    meals.forEach((m) => { if (m.lastCooked) counts[m.id] = (counts[m.id] || 0) + m.timesCooked; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 5) {
      const meal = meals.find((m) => m.id === top[0]);
      if (meal) return `You've been cooking ${meal.name} a lot lately — want something different?`;
    }
    return null;
  }, [meals, nudgeDismissed]);

  function handleSave() {
    if (!formName.trim()) return;
    const newMeal = {
      id: uid(),
      name: formName.trim(),
      category: formCategory,
      recipeUrl: formUrl.trim(),
      rating: formRating,
      ingredients: formIngredients.split(',').map((s) => s.trim()).filter(Boolean),
      lastCooked: null,
      timesCooked: 0
    };
    setMeals((prev) => [...prev, newMeal]);
    resetForm();
    showToast(`"${newMeal.name}" added to meals`);
  }

  function resetForm() {
    setFormName(''); setFormCategory('Other'); setFormUrl(''); setFormIngredients(''); setFormRating(0);
    setShowForm(false);
  }

  function handleDelete(id) {
    setMeals((prev) => prev.filter((m) => m.id !== id));
    setExpandedId(null);
    showToast('Meal removed');
  }

  function handleCookThisWeek(meal) {
    const slots = ['breakfast', 'dinner'];
    for (const day of DAYS) {
      for (const slot of slots) {
        const key = `${day}-${slot}`;
        if (!plan[key]) {
          setPlan((prev) => ({ ...prev, [key]: { mealId: meal.id, isLeftover: false } }));
          showToast(`${meal.name} added to ${day} ${slot}`);
          return;
        }
      }
    }
    showToast('All planner slots are full!');
  }

  function handleRate(mealId, rating) {
    setMeals((prev) => prev.map((m) => m.id === mealId ? { ...m, rating } : m));
  }

  return (
    <div className="page">
      <div className="page-title">Meals</div>
      <div className="page-subtitle">{meals.length} meal{meals.length !== 1 ? 's' : ''} saved</div>

      {/* Category filter */}
      <div className="pill-row mb-16">
        {MEAL_CATEGORIES.map((cat) => (
          <span
            key={cat}
            className={`pill ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
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

      {/* Add button / form */}
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
              {MEAL_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
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
          <div className="form-group">
            <label className="form-label">Rating</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} className={`star ${s <= formRating ? 'filled' : 'empty'}`} onClick={() => setFormRating(s)}>
                  {'\u2605'}
                </span>
              ))}
            </div>
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
        filtered.map((meal) => (
          <div
            key={meal.id}
            className={`meal-card ${expandedId === meal.id ? 'expanded' : ''}`}
            onClick={() => setExpandedId(expandedId === meal.id ? null : meal.id)}
          >
            <div className="meal-card-header">
              <span className="meal-card-name">{meal.name}</span>
              <span className="pill" style={{ fontSize: '0.7rem', padding: '4px 10px', minHeight: 'auto' }}>{meal.category}</span>
              <div className="star-rating" style={{ marginLeft: 8 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className={`star ${s <= meal.rating ? 'filled' : 'empty'}`} style={{ fontSize: '0.85rem', cursor: 'default' }}>
                    {'\u2605'}
                  </span>
                ))}
              </div>
            </div>

            {expandedId === meal.id && (
              <div className="meal-card-details">
                {meal.recipeUrl && (
                  <a href={meal.recipeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm mb-8" onClick={(e) => e.stopPropagation()}>
                    Open recipe {'\u2192'}
                  </a>
                )}

                {meal.ingredients.length > 0 && (
                  <div className="mb-8">
                    <div className="form-label">Ingredients</div>
                    <div className="text-sm">{meal.ingredients.join(', ')}</div>
                  </div>
                )}

                {meal.lastCooked && (
                  <div className="text-sm text-muted mb-8">Last cooked: {formatDate(meal.lastCooked)}</div>
                )}

                <div className="star-rating mb-8">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      className={`star ${s <= meal.rating ? 'filled' : 'empty'}`}
                      onClick={(e) => { e.stopPropagation(); handleRate(meal.id, s); }}
                    >
                      {'\u2605'}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); handleCookThisWeek(meal); }}>
                    Cook this week
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(meal.id); }}>
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
