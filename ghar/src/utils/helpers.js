// ── Unique ID generator ──
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Date helpers ──
export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function getDayName(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date ? new Date(date).getDay() : new Date().getDay()];
}

export function getFullDayName(short) {
  const map = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
  return map[short] || short;
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateLong(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function daysBetween(iso1, iso2) {
  const d1 = new Date(iso1);
  const d2 = new Date(iso2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function getLastSunday() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

export function isSundayEvening() {
  const now = new Date();
  return now.getDay() === 0 && now.getHours() >= 18;
}

// ── Constants ──
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DEFAULT_MEAL_SLOTS = ['Breakfast', 'Dinner'];
export const RAMADAN_MEAL_SLOTS = ['Sehri', 'Iftar'];

export const DEFAULT_MEAL_CATEGORIES = ['Daal', 'Salan', 'Pulao', 'Pasta', 'Breakfast', 'Snack', 'Other'];

export const GROCERY_CATEGORIES = ['Produce', 'Fruit & Vegetable', 'Dairy', 'Meat', 'Pantry', 'Bakery', 'Spices', 'Frozen', 'Beverages', 'Other'];

export const DEFAULT_PANTRY_CATEGORIES = ['Produce', 'Fruit & Vegetable', 'Dairy', 'Meat', 'Pantry', 'Bakery', 'Spices', 'Frozen', 'Beverages', 'Other'];

export const QUANTITY_UNITS = ['pc', 'kg', 'g', 'ltr', 'ml', 'dozen', 'pack', 'bottle', 'bag', 'bunch'];

export const INGREDIENT_UNITS = ['', 'g', 'kg', 'ml', 'ltr', 'cup', 'tbsp', 'tsp', 'pc', 'bunch', 'pack', 'can', 'slice'];

export const DEFAULT_GROCERY_CHANNELS = ['Any', 'Grocery Store', 'Supermarket', 'Online', 'Wholesale', 'Sabzi Mandi'];

export const ENERGY_LEVELS = [
  { value: 'high', label: 'High', icon: '\uD83D\uDD25' },
  { value: 'medium', label: 'Medium', icon: '\u26A1' },
  { value: 'low', label: 'Low', icon: '\uD83C\uDF19' }
];

// ── Motivational nudges ──
export const CHORE_NUDGES = [
  "Ghar chala rahi ho, tumse strong koi nahi \uD83D\uDCAA",
  "Ek kaam karo, shuruaat ho gayi \u2728",
  "You're doing amazing, seriously.",
  "The house doesn't need to be perfect. It needs to be yours.",
  "Small steps, big home energy \uD83C\uDFE1",
  "Check! That felt good, didn't it?",
  "One chore down. Legend behavior.",
  "Aaj ka kaam aaj ho gaya \uD83C\uDF89",
  "Progress over perfection, always.",
  "Look at you, being all responsible \uD83D\uDC4F"
];

export function getRandomNudge() {
  return CHORE_NUDGES[Math.floor(Math.random() * CHORE_NUDGES.length)];
}

// ── Streak plant emoji ──
export function getStreakPlant(count) {
  if (count >= 30) return '\uD83C\uDF32';
  if (count >= 14) return '\uD83C\uDF33';
  if (count >= 7) return '\uD83C\uDF3F';
  if (count >= 3) return '\uD83E\uDEB4';
  return '\uD83C\uDF31';
}

// ── Smart meal suggestion ──
export function suggestMeal(meals, mealMemory, ramadanMode) {
  if (!meals || meals.length === 0) return null;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let candidates = meals.filter((m) => !m.last_cooked || m.last_cooked <= sevenDaysAgo);
  if (candidates.length === 0) candidates = [...meals];
  if (ramadanMode) {
    const lighter = candidates.filter((m) => ['Breakfast', 'Snack', 'Daal'].includes(m.category));
    if (lighter.length > 0) candidates = lighter;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ── Quick-add type detection ──
export function detectAddType(text) {
  const lower = text.toLowerCase();
  if (/cook|meal|daal|salan|rice|pasta|pulao|biryani|chicken|mutton|sabzi/.test(lower)) return 'meal';
  if (/buy|get|need|grocery|shop|store|milk|eggs|bread|atta|oil/.test(lower)) return 'grocery';
  return 'chore';
}

// ── iOS detection ──
export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// ── Parse ingredients (handles both old text[] and new jsonb formats) ──
export function parseIngredients(meal) {
  if (meal.ingredients_json && Array.isArray(meal.ingredients_json) && meal.ingredients_json.length > 0) {
    return meal.ingredients_json;
  }
  if (meal.ingredients && Array.isArray(meal.ingredients) && meal.ingredients.length > 0) {
    return meal.ingredients.map((name) => ({ name, qty: '', unit: '' }));
  }
  return [];
}

// ── Check what meals can be made from pantry ──
export function checkMealAvailability(meal, pantryItems) {
  const ingredients = parseIngredients(meal);
  if (ingredients.length === 0) {
    return { canMake: true, available: [], missing: [], ingredients: [] };
  }

  const pantryNames = new Set(pantryItems.map((p) => p.name.toLowerCase().trim()));
  const available = [];
  const missing = [];

  for (const ing of ingredients) {
    const lower = ing.name.toLowerCase().trim();
    if (pantryNames.has(lower)) {
      available.push(ing);
    } else {
      missing.push(ing);
    }
  }

  return { canMake: missing.length === 0, available, missing, ingredients };
}

// ── Get meal slots for display ──
export function getMealSlots(profile) {
  if (profile?.ramadan_mode) return RAMADAN_MEAL_SLOTS;
  return profile?.meal_slots || DEFAULT_MEAL_SLOTS;
}

// ── Slot key for plan storage ──
export function slotKey(day, slot) {
  return `${day}-${slot.toLowerCase().replace(/\s+/g, '_')}`;
}
