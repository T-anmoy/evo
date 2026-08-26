-- 002_menu_nutrition.sql — expands menu items with the detail the
-- nutrition/allergen trust section needs: carbs, fat, and a short
-- ingredients line, alongside the calories/protein already tracked.

ALTER TABLE menu_items ADD COLUMN carbs INTEGER NOT NULL DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN fat INTEGER NOT NULL DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN ingredients TEXT NOT NULL DEFAULT '';
