'use strict';
const references=require('../data/nutrition/ingredients.json');
const recipes=require('../data/nutrition/recipes.json');
const fields=['calories','protein','carbs','fat'];
function calculate(name,audience) {
 const recipe=recipes[name];
 if(!recipe || !Object.hasOwn(recipe.portion_g,audience)) throw Error(`Missing nutrition model: ${name} ${audience}`);
 const serving_g=recipe.portion_g[audience];
 const total=Object.values(recipe.composition_g).reduce((a,b)=>a+b,0);
 const result={audience,serving_g,estimated:true,source_reference:references.source,assumptions:recipe.assumptions};
 const ingredients=Object.entries(recipe.composition_g).map(([key,grams])=>{
  if(!references.ingredients[key]||grams<0)throw Error('Invalid ingredient model');
  return {key,grams:grams*serving_g/total,food_number:references.ingredients[key].food_number};
 });
 for(const field of fields){
  const raw=ingredients.reduce((sum,part)=>sum+references.ingredients[part.key].per100g[field]*part.grams/100,0);
  // Whole grams and 5-kcal increments avoid implying laboratory precision.
  result[field]=field==='calories'?Math.round(raw/5)*5:Math.round(raw);
 }
 result.calculation_json=JSON.stringify({ingredients,reference:references.publication});
 return result;
}
function seedEstimates(sql) {
 sql.transaction(()=>{
  const write=sql.prepare(`INSERT INTO menu_nutrition_estimates VALUES(@menu_item_id,@audience,@serving_g,@calories,@protein,@carbs,@fat,@source_reference,@assumptions,@calculation_json)
   ON CONFLICT(menu_item_id,audience) DO UPDATE SET serving_g=excluded.serving_g,calories=excluded.calories,protein=excluded.protein,carbs=excluded.carbs,fat=excluded.fat,source_reference=excluded.source_reference,assumptions=excluded.assumptions,calculation_json=excluded.calculation_json`);
  for(const item of sql.prepare('SELECT id,name,audiences FROM menu_items WHERE source_key IS NOT NULL AND active=1').all()) {
   for(const audience of JSON.parse(item.audiences)) write.run({...calculate(item.name,audience),menu_item_id:item.id});
  }
 })();
}
module.exports={calculate,seedEstimates};
