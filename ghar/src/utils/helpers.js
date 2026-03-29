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

export function isSameDay(iso1, iso2) {
  return iso1 && iso2 && iso1.split('T')[0] === iso2.split('T')[0];
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
export const MEAL_SLOTS = ['breakfast', 'dinner'];
export const MEAL_SLOTS_RAMADAN = ['sehri', 'iftar'];

export const MEAL_CATEGORIES = ['All', 'Daal', 'Salan', 'Pulao', 'Pasta', 'Breakfast', 'Snack', 'Other'];

export const GROCERY_CATEGORIES = ['Produce', 'Dairy', 'Meat', 'Pantry', 'Bakery', 'Spices', 'Other'];

export const ENERGY_LEVELS = [
  { value: 'high', label: 'High', icon: '\uD83D\uDD25' },
  { value: 'medium', label: 'Medium', icon: '\u26A1' },
  { value: 'low', label: 'Low', icon: '\uD83C\uDF19' }
];

export const DEFAULT_DAILY_CHORES = [
  { name: 'Dishes', durationMinutes: 10, energyLevel: 'medium' },
  { name: 'Wipe kitchen counter', durationMinutes: 3, energyLevel: 'low' },
  { name: 'Make bed', durationMinutes: 2, energyLevel: 'low' },
  { name: 'Quick tidy (living room)', durationMinutes: 5, energyLevel: 'low' }
];

export const DEFAULT_WEEKLY_CHORES = [
  { name: 'Mop floors', durationMinutes: 20, energyLevel: 'high' },
  { name: 'Clean bathroom', durationMinutes: 25, energyLevel: 'high' },
  { name: 'Laundry', durationMinutes: 15, energyLevel: 'medium' },
  { name: 'Change bed linen', durationMinutes: 10, energyLevel: 'medium' },
  { name: 'Vacuum', durationMinutes: 15, energyLevel: 'medium' }
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

  let candidates = meals.filter((m) => {
    if (m.lastCooked && m.lastCooked > sevenDaysAgo) return false;
    if (mealMemory && mealMemory.recentlyCooked && mealMemory.recentlyCooked.includes(m.id)) return false;
    return true;
  });

  if (candidates.length === 0) candidates = [...meals];

  if (ramadanMode) {
    const lighter = candidates.filter((m) =>
      ['Breakfast', 'Snack', 'Daal'].includes(m.category)
    );
    if (lighter.length > 0) candidates = lighter;
  }

  const weighted = [];
  for (const meal of candidates) {
    const weight = meal.rating >= 4 ? 3 : 1;
    for (let i = 0; i < weight; i++) weighted.push(meal);
  }

  return weighted[Math.floor(Math.random() * weighted.length)];
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
