-- Estimates are kept separate from caterer-verified nutrition.
CREATE TABLE menu_nutrition_estimates (
 menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
 audience TEXT NOT NULL CHECK(audience IN ('Junior','Senior')),
 serving_g REAL NOT NULL CHECK(serving_g >= 0),
 calories REAL NOT NULL CHECK(calories >= 0),
 protein REAL NOT NULL CHECK(protein >= 0),
 carbs REAL NOT NULL CHECK(carbs >= 0),
 fat REAL NOT NULL CHECK(fat >= 0),
 source_reference TEXT NOT NULL,
 assumptions TEXT NOT NULL,
 calculation_json TEXT NOT NULL,
 PRIMARY KEY(menu_item_id,audience)
);
