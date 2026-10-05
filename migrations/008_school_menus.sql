CREATE TABLE schools (
 id INTEGER PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL UNIQUE,
 daily_rate_kwd REAL NOT NULL CHECK(daily_rate_kwd > 0), active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0
);
INSERT INTO schools(id,slug,name,daily_rate_kwd,sort_order) VALUES
 (1,'kuwait-english-school','Kuwait English School',2.000,1),
 (2,'american-creativity-academy','American Creativity Academy',2.000,2),
 (3,'the-english-school','The English School',2.000,3);
ALTER TABLE menu_items ADD COLUMN category TEXT NOT NULL DEFAULT 'main' CHECK(category IN ('main','side','drink','snack'));
UPDATE menu_items SET category='snack' WHERE instr(lower(tag),'dessert') > 0;
CREATE TABLE school_menu_items (
 school_id INTEGER NOT NULL REFERENCES schools(id), menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
 PRIMARY KEY(school_id,menu_item_id)
);
-- Illustrative assignments only; existing dishes and nutrition are unchanged.
INSERT INTO school_menu_items SELECT 1,id FROM menu_items WHERE id IN (1,2,4,5);
INSERT INTO school_menu_items SELECT 2,id FROM menu_items WHERE id IN (2,3,4);
INSERT INTO school_menu_items SELECT 3,id FROM menu_items WHERE id IN (1,3,5);
