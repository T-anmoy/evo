-- Keep existing dish IDs for historical bookings. Source dishes have their own identities.
ALTER TABLE menu_items ADD COLUMN source_key TEXT;
ALTER TABLE menu_items ADD COLUMN source_url TEXT;
ALTER TABLE menu_items ADD COLUMN source_image TEXT;
ALTER TABLE menu_items ADD COLUMN audiences TEXT NOT NULL DEFAULT '[]';
ALTER TABLE menu_items ADD COLUMN nutrition_known INTEGER NOT NULL DEFAULT 1;
ALTER TABLE menu_items ADD COLUMN active INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX menu_source_key ON menu_items(source_key);
CREATE TABLE menu_imports (source TEXT PRIMARY KEY, digest TEXT NOT NULL, fetched_at TEXT NOT NULL);
