# School picker and estimated nutrition — 19 October 2026

The account menu starts with a school picker. Selecting a school submits a GET request and renders only that school's catalogue. A visible Show menu button also works without JavaScript. The selected school is in the URL, so reloads, bookmarks and language switching preserve it. Unknown school slugs show the picker without silently substituting another school's dishes. Public and account pages no longer contain the requested redesign description; no customer-facing redesign references remain in the views or translations.

## Research and calculation

Ingredient values are transcribed from [USDA Nutritive Value of Foods, Table 9](https://www.ars.usda.gov/is/np/NutritiveValueofFoods/NutritiveValueofFoods.pdf), the 2002 reference based on SR13. This is an older, rounded reference, not a current branded-product analysis. `data/nutrition/ingredients.json` records each food number, its original reference serving, original nutrient values and normalized per-100-g values. Trace values in that table are treated as zero for this approximate model.

The [USDA FoodData Central documentation](https://fdc.nal.usda.gov/Foundation_Foods_Documentation/) explains converting per-100-g nutrient values using portion weight. For each dish we sum ingredient nutrients times their assumed edible prepared weights, divide by the model's total weight, then multiply by the assumed Junior or Senior serving weight. Calories are rounded to 5 kcal and macros to whole grams to avoid implying laboratory precision. USDA energy values are retained rather than forcing calories to equal a rounded 4/4/9 calculation.

`data/nutrition/recipes.json` defines an explicit representative composition and Junior/Senior weights for all 58 dishes. These are assumptions, not EVO360 recipes, measured servings, recommendations for children's intake, or verified claims about the actual food. Similar generic foods are used where exact formulations are unavailable: cooked bread for pizza crust, cultured buttermilk for laban, orange juice for unspecified fresh juice, raisins for barberries, and beef plus added oil for unspecified pepperoni. Spice blends and small garnishes are not modelled. Oil absorption, meat fat, sauces, brand choice and actual serving size can materially change the result. No numeric accuracy margin is claimed.

The model therefore provides transparent approximate comparisons, not precise macros for the served meals. It cannot be used to establish allergens or calculate medically necessary carbohydrate dosing. A recipe/serving audit by the kitchen remains necessary before treating these values as verified.

## Storage and display

Migration 011 stores 107 estimated dish/audience records separately from verified nutrition. Startup recalculates them deterministically from the version-controlled reference and recipes. Records retain calculation ingredients, weights, source and assumptions. A verified record takes precedence for its audience; an unverified audience retains its labelled estimate. No Drink has zero contribution and no beverage serving.

The shared dish partial displays estimates on public and account menus. Choosing Junior or Senior filters the nutrition portions as well as eligible dishes. English and Arabic labels state Estimated nutrition, Assumed portion, and that actual values may differ. The removed source/redesign wording is not reintroduced.

## Verification

91 automated tests pass, including school isolation, empty/invalid school selection, new registration, full catalogue and booking coverage, all 107 estimated portions, an independent ingredient-sum check, and verified-over-estimate precedence. Existing verified-nutrition validation tests remain passing.

Browser checks confirm automatic school switching, one school catalogue at a time, working search and audience-specific macro display, and English/Arabic mobile rendering. Account menu width equals viewport width at 320 and 375 pixels. Screenshots are in `live-menu-qa/nutrition-mobile.jpg` and `live-menu-qa/school-picker-nutrition.jpg`.

These changes are local; this report does not establish production deployment or kitchen verification.

## Calculated catalogue

Numbers below are estimates. Columns show assumed serving grams, kcal, protein/carbohydrate/fat grams.

| Dish | Audience | Serving g | kcal | Protein g | Carbs g | Fat g |
|---|---|---:|---:|---:|---:|---:|
| Arabiatta Chicken Pasta | Junior | 270 | 365 | 28 | 44 | 8 |
| Baked Chicken Pasta | Junior | 270 | 395 | 32 | 42 | 11 |
| BBQ Beef Burger | Junior | 180 | 410 | 24 | 31 | 20 |
| BBQ Chicken Bites & Potato | Junior | 260 | 345 | 29 | 35 | 9 |
| Bbq Chicken Pizza | Junior | 180 | 375 | 25 | 40 | 12 |
| Beef Kalam Polo | Junior | 280 | 425 | 22 | 46 | 17 |
| Beef Kebab & Barberry Rice | Junior | 280 | 480 | 23 | 54 | 18 |
| Beef Kofta & Saffron Rice | Junior | 280 | 490 | 24 | 54 | 19 |
| Beef Meatballs & Potato Wedges (Baked) | Junior | 260 | 440 | 25 | 41 | 20 |
| Beef Patty & Potato Fries (Baked) | Junior | 250 | 535 | 29 | 50 | 26 |
| Beef Shepherds Pie | Junior | 260 | 400 | 22 | 32 | 21 |
| Big Mac Burger | Junior | 180 | 500 | 28 | 31 | 28 |
| Butter Chicken & Safforn Rice | Junior | 280 | 440 | 24 | 43 | 18 |
| Chicken & Cheese Sandwich | Junior | 190 | 445 | 34 | 32 | 18 |
| Chicken Alfredo Pizza | Junior | 180 | 390 | 24 | 37 | 16 |
| Chicken Biryani | Junior | 280 | 370 | 25 | 45 | 9 |
| Chicken Fried Rice | Junior | 280 | 390 | 27 | 44 | 10 |
| Chicken Kebab & Lentil Rice | Junior | 280 | 390 | 27 | 49 | 8 |
| Chicken Majboos | Junior | 280 | 375 | 26 | 47 | 8 |
| Chicken Meatball & Potato Mash | Junior | 260 | 400 | 29 | 39 | 14 |
| Chicken Nuggets & Grilled Potato | Junior | 260 | 430 | 32 | 49 | 11 |
| Chicken Onigiri | Junior | 230 | 365 | 22 | 47 | 8 |
| Chicken Peperonata Pasta | Junior | 270 | 335 | 25 | 41 | 7 |
| Chicken Pink Pasta | Junior | 270 | 385 | 26 | 40 | 13 |
| Chicken Rice Balls (Arancini) | Junior | 250 | 485 | 30 | 55 | 15 |
| Chicken Rice Pilaf | Junior | 280 | 375 | 26 | 48 | 8 |
| Chicken Schnitzel & Potato Mash | Junior | 260 | 430 | 30 | 45 | 14 |
| Chicken Shawarma | Junior | 190 | 395 | 29 | 32 | 16 |
| Chicken Strips & Potato Wedges (Baked) | Junior | 260 | 430 | 32 | 49 | 11 |
| Grilled Chicken & Mashed Potato | Junior | 260 | 375 | 29 | 32 | 15 |
| Macaroni & Cheese | Junior | 260 | 445 | 19 | 49 | 19 |
| Margherita Pizza | Junior | 180 | 420 | 19 | 51 | 15 |
| Meatball Pizza | Junior | 180 | 435 | 25 | 43 | 18 |
| Mini Beef Meatloaf & Mashed Potato | Junior | 260 | 475 | 25 | 39 | 24 |
| Pepperoni Pizza | Junior | 180 | 455 | 23 | 43 | 21 |
| Philly Chicken Sub | Junior | 190 | 375 | 31 | 30 | 13 |
| Pizza Pocket | Junior | 180 | 425 | 18 | 56 | 14 |
| Pomodoro Chicken Pasta | Junior | 270 | 345 | 26 | 43 | 8 |
| Popcorn Chicken & Potato Wedges (Baked) | Junior | 260 | 455 | 32 | 51 | 13 |
| Spaghetti Meatballs | Junior | 280 | 460 | 26 | 51 | 17 |
| Steak Sandwich | Junior | 190 | 380 | 28 | 33 | 14 |
| Swiss Beef Burger | Junior | 180 | 470 | 29 | 29 | 26 |
| Swiss Chicken Burger | Junior | 180 | 405 | 33 | 29 | 16 |
| Teriyaki Chicken Rice Bowl | Junior | 280 | 385 | 24 | 52 | 8 |
| Tuscan Chicken Pasta | Junior | 270 | 380 | 26 | 37 | 14 |
| Veg Pizza Roll-Ups | Junior | 180 | 350 | 16 | 44 | 12 |
| Veg. Cheese Burger | Junior | 190 | 455 | 17 | 54 | 19 |
| Arabiatta Chicken Pasta | Senior | 370 | 500 | 39 | 61 | 11 |
| Baked Chicken Pasta | Senior | 370 | 540 | 43 | 58 | 15 |
| BBQ Beef Burger | Senior | 250 | 570 | 33 | 43 | 28 |
| BBQ Chicken Bites & Potato | Senior | 360 | 480 | 40 | 48 | 13 |
| Bbq Chicken Pizza | Senior | 250 | 520 | 34 | 55 | 17 |
| Beef Kalam Polo | Senior | 380 | 580 | 29 | 62 | 23 |
| Beef Kebab & Barberry Rice | Senior | 380 | 650 | 32 | 74 | 25 |
| Beef Kofta & Saffron Rice | Senior | 380 | 665 | 33 | 73 | 25 |
| Beef Meatballs & Potato Wedges (Baked) | Senior | 360 | 605 | 35 | 56 | 27 |
| Big Mac Burger | Senior | 250 | 690 | 39 | 43 | 39 |
| Butter Chicken & Safforn Rice | Senior | 380 | 595 | 33 | 58 | 25 |
| Chicken & Cheese Sandwich | Senior | 270 | 630 | 49 | 46 | 26 |
| Chicken Alfredo Pizza | Senior | 250 | 540 | 34 | 52 | 22 |
| Chicken Biryani | Senior | 380 | 505 | 34 | 61 | 12 |
| Chicken Caesar Sushi Rolls | Senior | 350 | 585 | 37 | 56 | 22 |
| Chicken Croquettes & Fries (Baked) | Senior | 360 | 720 | 40 | 85 | 26 |
| Chicken Fried Rice | Senior | 380 | 530 | 36 | 60 | 14 |
| Chicken Kebab & Lentil Rice | Senior | 380 | 530 | 37 | 67 | 11 |
| Chicken Majboos | Senior | 380 | 505 | 35 | 63 | 11 |
| Chicken Meatball & Potato Mash | Senior | 360 | 555 | 41 | 54 | 19 |
| Chicken Nuggets & Grilled Potato | Senior | 360 | 595 | 44 | 67 | 16 |
| Chicken Onigiri | Senior | 320 | 510 | 31 | 65 | 12 |
| Chicken Parmesan & Grilled Potato | Senior | 360 | 545 | 45 | 54 | 17 |
| Chicken Peperonata Pasta | Senior | 370 | 455 | 34 | 57 | 10 |
| Chicken Pink Pasta | Senior | 370 | 530 | 35 | 55 | 18 |
| Chicken Rice Balls (Arancini) | Senior | 340 | 655 | 41 | 74 | 20 |
| Chicken Rice Pilaf | Senior | 380 | 510 | 35 | 65 | 11 |
| Chicken Schnitzel & Potato Mash | Senior | 360 | 595 | 41 | 62 | 20 |
| Chicken Shawarma | Senior | 270 | 560 | 41 | 45 | 22 |
| Chicken Strips & Potato Wedges (Baked) | Senior | 360 | 595 | 44 | 67 | 16 |
| Chicken Tikka Sandwich | Senior | 270 | 480 | 38 | 44 | 16 |
| Crispy Chicken Tenders & Potato Mash | Senior | 360 | 635 | 40 | 63 | 24 |
| Grilled Chicken & Mashed Potato | Senior | 360 | 520 | 40 | 44 | 20 |
| Macaroni & Cheese | Senior | 360 | 620 | 26 | 68 | 26 |
| Margherita Pizza | Senior | 250 | 580 | 27 | 71 | 21 |
| Meatball Pizza | Senior | 250 | 605 | 34 | 60 | 24 |
| Mini Beef Meatloaf & Mashed Potato | Senior | 360 | 660 | 35 | 55 | 33 |
| Pepperoni Pizza | Senior | 250 | 635 | 31 | 60 | 30 |
| Philly Chicken Sub | Senior | 270 | 535 | 44 | 43 | 19 |
| Pizza Pocket | Senior | 250 | 590 | 25 | 78 | 19 |
| Pomodoro Chicken Pasta | Senior | 370 | 475 | 36 | 59 | 11 |
| Popcorn Chicken & Potato Wedges (Baked) | Senior | 360 | 630 | 44 | 70 | 18 |
| Spaghetti Meatballs | Senior | 380 | 625 | 36 | 70 | 22 |
| Sriracha Chicken Burger | Senior | 250 | 555 | 37 | 55 | 21 |
| Swiss Beef Burger | Senior | 250 | 650 | 41 | 40 | 36 |
| Swiss Chicken Burger | Senior | 250 | 560 | 46 | 40 | 23 |
| Teriyaki Chicken Rice Bowl | Senior | 380 | 520 | 33 | 71 | 10 |
| Tuscan Chicken Pasta | Senior | 370 | 520 | 36 | 51 | 20 |
| Veg Pizza Roll-Ups | Senior | 250 | 485 | 22 | 61 | 17 |
| Veg. Cheese Burger | Senior | 260 | 625 | 24 | 74 | 26 |
| Assorted Fruit Cup | Junior | 120 | 60 | 1 | 15 | 0 |
| Assorted Veggie Sticks | Junior | 100 | 30 | 1 | 6 | 0 |
| Assorted Fruit Cup | Senior | 160 | 80 | 1 | 20 | 0 |
| Assorted Veggie Sticks | Senior | 150 | 40 | 1 | 10 | 0 |
| Fresh Juice | Junior | 180 | 80 | 1 | 19 | 0 |
| Laban | Junior | 180 | 75 | 6 | 9 | 1 |
| No Drink | Junior | 0 | 0 | 0 | 0 | 0 |
| Fresh Juice | Senior | 240 | 110 | 2 | 25 | 0 |
| Laban | Senior | 240 | 95 | 8 | 12 | 2 |
| No Drink | Senior | 0 | 0 | 0 | 0 | 0 |
