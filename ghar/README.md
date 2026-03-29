# Ghar (گھر) — Personal Home Manager

Ghar is a free, offline-first, all-in-one homemaking PWA. It helps you plan meals, manage grocery lists, track chores, and build daily streaks — all from your phone's home screen. No accounts, no backend, no subscriptions. Your data stays on your device in localStorage.

## Getting Started

### Install dependencies

```bash
cd ghar
npm install
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Generate PWA icons

Requires the `canvas` npm package:

```bash
npm install canvas --save-dev
npm run icons
```

This creates `public/icon-192.png` and `public/icon-512.png` with the Ghar "گ" logo on a terracotta background.

### Build for production

```bash
npm run build
```

Output goes to the `dist/` directory.

## Deploy to Vercel (Free)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Framework preset: **Vite**
4. Root directory: `ghar` (if in a monorepo)
5. Click **Deploy** — done!

The included `vercel.json` handles SPA routing.

## Install as PWA

### On iOS (Safari)

1. Open the deployed URL in **Safari**
2. Tap the **Share** icon (square with arrow) at the bottom toolbar
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** in the top right
5. Ghar now appears as an app icon on your home screen

### On Android (Chrome)

1. Open the deployed URL in **Chrome**
2. Tap the **three-dot menu** (⋮) in the top right
3. Tap **"Install app"** or **"Add to Home Screen"**
4. Confirm the installation
5. Ghar appears in your app drawer and home screen

## Features

### Meals
- Add your favourite dishes with categories, ingredients, ratings, and recipe links
- Quick-add meals from any screen via the floating + button
- Smart suggestions based on what you haven't cooked recently

### Meal Planner
- Plan breakfast and dinner for each day of the week
- Ramadan mode switches to Sehri/Iftar labels
- Generate a grocery list directly from your meal plan

### Grocery List
- Grouped by category (Produce, Dairy, Meat, etc.)
- Track estimated costs against a weekly budget
- Pantry management — mark items as low stock to auto-add to your list
- Export list to clipboard

### Chores
- Daily and weekly chore tracking with auto-reset
- Energy level filters and 1-minute mode for low-energy days
- Streak garden that grows as you complete daily chores
- Motivational nudges in Urdu and English

### Adding Custom Chores and Meals
- Tap the **+** floating button from any screen to quick-add
- Or go to the Meals/Chores section and use the inline form
- Type detection automatically routes items (cooking words → Meal, shopping words → Grocery, everything else → Chore)

## Export and Import Data

1. Go to **Home** → tap the **gear icon** → **Settings**
2. **Export**: Tap "Export all data" to download a JSON backup
3. **Import**: Tap "Import data" and select a previously exported JSON file
4. **Clear**: Type "delete" to wipe all data and start fresh

## Troubleshooting

### App not updating after deploy
The service worker caches aggressively. To force-update:
1. Open browser DevTools → Application → Service Workers
2. Click "Unregister" on the ghar service worker
3. Clear site data (Application → Storage → Clear site data)
4. Reload the page

### localStorage limits
Browsers typically allow ~5-10 MB per origin. If you hit the limit:
1. Export your data (Settings → Export)
2. Clear data (Settings → Clear all data)
3. Re-import the backup

### PWA not installable
- Make sure you're on HTTPS (required for service workers)
- Verify `manifest.json` is accessible at `/manifest.json`
- Check DevTools → Application → Manifest for errors
