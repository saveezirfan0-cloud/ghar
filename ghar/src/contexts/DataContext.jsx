import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { todayISO, getLastSunday } from '../utils/helpers';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user, profile } = useAuth();

  const [meals, setMealsState] = useState([]);
  const [plan, setPlanState] = useState({});
  const [planNotes, setPlanNotesState] = useState({});
  const [grocery, setGroceryState] = useState([]);
  const [pantry, setPantryState] = useState([]);
  const [chores, setChoresState] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch all data when user is available
  useEffect(() => {
    if (!user) {
      setDataLoading(false);
      return;
    }
    fetchAllData();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAllData() {
    setDataLoading(true);
    await Promise.all([
      fetchMeals(),
      fetchPlan(),
      fetchPlanNotes(),
      fetchGrocery(),
      fetchPantry(),
      fetchChores()
    ]);
    setDataLoading(false);
  }

  // ── MEALS ──
  async function fetchMeals() {
    const { data } = await supabase.from('meals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setMealsState(data || []);
  }

  async function addMeal(meal) {
    const row = { user_id: user.id, name: meal.name, category: meal.category || 'Other', recipe_url: meal.recipeUrl || meal.recipe_url || '', rating: meal.rating || 0, ingredients: meal.ingredients || [], last_cooked: meal.lastCooked || meal.last_cooked || null, times_cooked: meal.timesCooked || meal.times_cooked || 0 };
    const { data, error } = await supabase.from('meals').insert(row).select().single();
    if (!error && data) setMealsState((prev) => [data, ...prev]);
    return { data, error };
  }

  async function updateMeal(id, updates) {
    const dbUpdates = {};
    if ('name' in updates) dbUpdates.name = updates.name;
    if ('category' in updates) dbUpdates.category = updates.category;
    if ('recipeUrl' in updates) dbUpdates.recipe_url = updates.recipeUrl;
    if ('recipe_url' in updates) dbUpdates.recipe_url = updates.recipe_url;
    if ('rating' in updates) dbUpdates.rating = updates.rating;
    if ('ingredients' in updates) dbUpdates.ingredients = updates.ingredients;
    if ('lastCooked' in updates) dbUpdates.last_cooked = updates.lastCooked;
    if ('last_cooked' in updates) dbUpdates.last_cooked = updates.last_cooked;
    if ('timesCooked' in updates) dbUpdates.times_cooked = updates.timesCooked;
    if ('times_cooked' in updates) dbUpdates.times_cooked = updates.times_cooked;

    const { data, error } = await supabase.from('meals').update(dbUpdates).eq('id', id).eq('user_id', user.id).select().single();
    if (!error && data) setMealsState((prev) => prev.map((m) => m.id === id ? data : m));
    return { data, error };
  }

  async function deleteMeal(id) {
    await supabase.from('meals').delete().eq('id', id).eq('user_id', user.id);
    setMealsState((prev) => prev.filter((m) => m.id !== id));
  }

  // ── WEEKLY PLAN ──
  async function fetchPlan() {
    const { data } = await supabase.from('weekly_plan').select('*').eq('user_id', user.id);
    const planObj = {};
    (data || []).forEach((row) => {
      planObj[row.day_slot] = { mealId: row.meal_id, isLeftover: row.is_leftover, _dbId: row.id };
    });
    setPlanState(planObj);
  }

  async function setPlanSlot(daySlot, mealId, isLeftover = false) {
    const existing = plan[daySlot];
    if (existing && existing._dbId) {
      const { data } = await supabase.from('weekly_plan').update({ meal_id: mealId, is_leftover: isLeftover }).eq('id', existing._dbId).select().single();
      if (data) setPlanState((prev) => ({ ...prev, [daySlot]: { mealId: data.meal_id, isLeftover: data.is_leftover, _dbId: data.id } }));
    } else {
      const { data } = await supabase.from('weekly_plan').insert({ user_id: user.id, day_slot: daySlot, meal_id: mealId, is_leftover: isLeftover }).select().single();
      if (data) setPlanState((prev) => ({ ...prev, [daySlot]: { mealId: data.meal_id, isLeftover: data.is_leftover, _dbId: data.id } }));
    }
  }

  async function clearPlanSlot(daySlot) {
    const existing = plan[daySlot];
    if (existing && existing._dbId) {
      await supabase.from('weekly_plan').delete().eq('id', existing._dbId);
    }
    setPlanState((prev) => {
      const next = { ...prev };
      delete next[daySlot];
      return next;
    });
  }

  // ── PLAN NOTES ──
  async function fetchPlanNotes() {
    const { data } = await supabase.from('plan_notes').select('*').eq('user_id', user.id);
    const notesObj = {};
    (data || []).forEach((row) => { notesObj[row.day] = { text: row.note, _dbId: row.id }; });
    setPlanNotesState(notesObj);
  }

  async function setPlanNote(day, note) {
    const existing = planNotes[day];
    if (existing && existing._dbId) {
      await supabase.from('plan_notes').update({ note }).eq('id', existing._dbId);
      setPlanNotesState((prev) => ({ ...prev, [day]: { ...prev[day], text: note } }));
    } else if (note.trim()) {
      const { data } = await supabase.from('plan_notes').insert({ user_id: user.id, day, note }).select().single();
      if (data) setPlanNotesState((prev) => ({ ...prev, [day]: { text: data.note, _dbId: data.id } }));
    }
  }

  // ── GROCERY ──
  async function fetchGrocery() {
    const { data } = await supabase.from('grocery_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setGroceryState(data || []);
  }

  async function addGroceryItem(item) {
    const row = { user_id: user.id, name: item.name, category: item.category || 'Other', checked: false, from_plan: item.fromPlan || item.from_plan || false, in_pantry: item.inPantry || item.in_pantry || false, low_stock: item.lowStock || item.low_stock || false, estimated_cost: item.estimatedCost || item.estimated_cost || null };
    const { data, error } = await supabase.from('grocery_items').insert(row).select().single();
    if (!error && data) setGroceryState((prev) => [data, ...prev]);
    return { data, error };
  }

  async function updateGroceryItem(id, updates) {
    const dbUpdates = {};
    if ('checked' in updates) dbUpdates.checked = updates.checked;
    if ('name' in updates) dbUpdates.name = updates.name;
    if ('category' in updates) dbUpdates.category = updates.category;
    if ('estimated_cost' in updates) dbUpdates.estimated_cost = updates.estimated_cost;

    const { data } = await supabase.from('grocery_items').update(dbUpdates).eq('id', id).eq('user_id', user.id).select().single();
    if (data) setGroceryState((prev) => prev.map((g) => g.id === id ? data : g));
  }

  async function deleteGroceryItem(id) {
    await supabase.from('grocery_items').delete().eq('id', id).eq('user_id', user.id);
    setGroceryState((prev) => prev.filter((g) => g.id !== id));
  }

  async function clearCheckedGrocery() {
    const checkedIds = grocery.filter((g) => g.checked).map((g) => g.id);
    if (checkedIds.length === 0) return;
    await supabase.from('grocery_items').delete().in('id', checkedIds).eq('user_id', user.id);
    setGroceryState((prev) => prev.filter((g) => !g.checked));
  }

  async function clearAllGrocery() {
    await supabase.from('grocery_items').delete().eq('user_id', user.id);
    setGroceryState([]);
  }

  async function addGroceryBatch(items) {
    const rows = items.map((item) => ({
      user_id: user.id, name: item.name, category: item.category || 'Other',
      checked: false, from_plan: true, in_pantry: false, low_stock: false, estimated_cost: null
    }));
    const { data } = await supabase.from('grocery_items').insert(rows).select();
    if (data) setGroceryState((prev) => [...data, ...prev]);
    return data || [];
  }

  // ── PANTRY ──
  async function fetchPantry() {
    const { data } = await supabase.from('pantry_items').select('*').eq('user_id', user.id);
    setPantryState(data || []);
  }

  async function addPantryItem(item) {
    const row = { user_id: user.id, name: item.name, category: item.category || 'Other', low_stock: false };
    const { data } = await supabase.from('pantry_items').insert(row).select().single();
    if (data) setPantryState((prev) => [...prev, data]);
  }

  async function updatePantryItem(id, updates) {
    const { data } = await supabase.from('pantry_items').update(updates).eq('id', id).eq('user_id', user.id).select().single();
    if (data) setPantryState((prev) => prev.map((p) => p.id === id ? data : p));
  }

  async function deletePantryItem(id) {
    await supabase.from('pantry_items').delete().eq('id', id).eq('user_id', user.id);
    setPantryState((prev) => prev.filter((p) => p.id !== id));
  }

  // ── CHORES ──
  async function fetchChores() {
    const { data } = await supabase.from('chores').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
    const today = todayISO();
    const lastSunday = getLastSunday();
    let needsUpdate = false;

    const processed = (data || []).map((c) => {
      let updated = { ...c };

      // Unsnooze
      if (c.snoozed_until && c.snoozed_until <= today) {
        updated.snoozed_until = null;
        needsUpdate = true;
      }

      // Reset daily
      if (c.type === 'daily' && c.completed && c.last_completed && c.last_completed < today) {
        updated.completed = false;
        needsUpdate = true;
      }

      // Reset weekly
      if (c.type === 'weekly' && c.completed && c.last_completed && c.last_completed < lastSunday) {
        updated.completed = false;
        needsUpdate = true;
      }

      return updated;
    });

    if (needsUpdate) {
      for (const c of processed) {
        const orig = data.find((d) => d.id === c.id);
        if (orig && (orig.completed !== c.completed || orig.snoozed_until !== c.snoozed_until)) {
          await supabase.from('chores').update({ completed: c.completed, snoozed_until: c.snoozed_until }).eq('id', c.id);
        }
      }
    }

    setChoresState(processed);
  }

  async function addChore(chore) {
    const row = { user_id: user.id, name: chore.name, type: chore.type || 'daily', completed: false, last_completed: null, snoozed_until: null, duration_minutes: chore.duration_minutes || chore.durationMinutes || null, energy_level: chore.energy_level || chore.energyLevel || 'medium' };
    const { data, error } = await supabase.from('chores').insert(row).select().single();
    if (!error && data) setChoresState((prev) => [...prev, data]);
    return { data, error };
  }

  async function updateChore(id, updates) {
    const dbUpdates = {};
    if ('completed' in updates) dbUpdates.completed = updates.completed;
    if ('last_completed' in updates) dbUpdates.last_completed = updates.last_completed;
    if ('snoozed_until' in updates) dbUpdates.snoozed_until = updates.snoozed_until;
    if ('name' in updates) dbUpdates.name = updates.name;
    if ('type' in updates) dbUpdates.type = updates.type;
    if ('duration_minutes' in updates) dbUpdates.duration_minutes = updates.duration_minutes;
    if ('energy_level' in updates) dbUpdates.energy_level = updates.energy_level;

    const { data } = await supabase.from('chores').update(dbUpdates).eq('id', id).eq('user_id', user.id).select().single();
    if (data) setChoresState((prev) => prev.map((c) => c.id === id ? data : c));
  }

  async function deleteChore(id) {
    await supabase.from('chores').delete().eq('id', id).eq('user_id', user.id);
    setChoresState((prev) => prev.filter((c) => c.id !== id));
  }

  // ── EXPORT / IMPORT ──
  function exportAllData() {
    return { meals, plan, planNotes, grocery, pantry, chores, profile };
  }

  const value = {
    meals, addMeal, updateMeal, deleteMeal,
    plan, setPlanSlot, clearPlanSlot,
    planNotes, setPlanNote,
    grocery, addGroceryItem, updateGroceryItem, deleteGroceryItem, clearCheckedGrocery, clearAllGrocery, addGroceryBatch,
    pantry, addPantryItem, updatePantryItem, deletePantryItem,
    chores, addChore, updateChore, deleteChore,
    dataLoading, refreshAll: fetchAllData, exportAllData
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
