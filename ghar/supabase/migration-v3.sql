-- ═══════════════════════════════════════
-- GHAR MIGRATION v3
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════

-- 1. Add ingredients as structured JSON (name, qty, unit per item)
ALTER TABLE meals ADD COLUMN IF NOT EXISTS ingredients_json jsonb DEFAULT '[]'::jsonb;

-- Migrate old text[] ingredients to new jsonb format
UPDATE meals
SET ingredients_json = (
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('name', elem, 'qty', '', 'unit', '')),
    '[]'::jsonb
  )
  FROM unnest(ingredients) AS elem
)
WHERE ingredients IS NOT NULL
  AND array_length(ingredients, 1) > 0
  AND (ingredients_json IS NULL OR ingredients_json = '[]'::jsonb);

-- 2. Add customizable meal slots to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS meal_slots text[] DEFAULT '{"Breakfast","Dinner"}';
