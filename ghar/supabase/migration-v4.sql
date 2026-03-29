-- ═══════════════════════════════════════
-- GHAR MIGRATION v4
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════

-- Calories on meals
ALTER TABLE meals ADD COLUMN IF NOT EXISTS calories_per_serving integer;

-- Profile settings for calories, servings, pantry categories
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_calories boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_servings boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_servings integer DEFAULT 2;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pantry_categories text[] DEFAULT '{"Produce","Fruit & Vegetable","Dairy","Meat","Pantry","Bakery","Spices","Frozen","Beverages","Other"}';

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  message text not null,
  page text default '',
  created_at timestamptz default now()
);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own feedback" ON feedback;
CREATE POLICY "Users can insert own feedback" ON feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
