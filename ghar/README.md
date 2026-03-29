# Ghar (گھر) — Personal Home Manager

Ghar is a personal homemaking PWA with user accounts, online database, and notifications. Plan meals, manage groceries, track chores, and build daily streaks.

## Tech Stack

- **Frontend**: React 18 + Vite
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password)
- **Styling**: Pure CSS
- **Deployment**: Vercel (free tier)
- **PWA**: Installable on iOS and Android

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
4. Go to **Settings** → **API** and copy your **Project URL** and **anon public** key

### 2. Configure environment

```bash
cd ghar
cp .env.example .env
```

Edit `.env` and paste your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 4. Build for production

```bash
npm run build
```

### 5. Generate PWA icons (optional)

```bash
npm install canvas --save-dev
npm run icons
```

## Deploy to Vercel

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → Import repo
3. **Root Directory**: `ghar`
4. **Framework Preset**: Vite
5. **Environment Variables**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
6. Deploy

## Supabase Auth Setup

By default, Supabase requires email confirmation. To disable it for testing:

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Under **Email**, toggle off **"Confirm email"**

To enable it in production, configure your SMTP settings under **Authentication** → **Settings**.

## Features

- **Auth**: Sign up / sign in with email and password
- **Tutorial**: Guided onboarding for new users
- **Meals**: Save dishes with ingredients, categories, ratings, recipe links
- **Planner**: Weekly meal planner with Ramadan mode (Sehri/Iftar)
- **Grocery**: Auto-generate from meal plan, budget tracking, pantry management
- **Chores**: Daily/weekly tracking, energy filters, snooze, streaks
- **Notifications**: Browser notifications for chore reminders and streak updates
- **Export**: Download all data as JSON backup
- **PWA**: Install on phone home screen, works offline after first load

## Install as PWA

### iOS (Safari)
1. Open the app URL in Safari
2. Tap Share (↑) → "Add to Home Screen"

### Android (Chrome)
1. Open the app URL in Chrome
2. Tap menu (⋮) → "Install app"
