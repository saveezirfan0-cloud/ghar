-- ═══════════════════════════════════════
-- GHAR MIGRATION v5
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════

-- Running/recurring grocery items
ALTER TABLE grocery_items ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
