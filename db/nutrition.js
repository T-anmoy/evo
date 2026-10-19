'use strict';
function attachNutrition(sql, items) {
 const portions=sql.prepare('SELECT * FROM menu_portion_nutrition ORDER BY audience').all();
 return items.map(item=>({...item, nutrition:portions.filter(p=>p.menu_item_id===item.id)}));
}
function importNutrition(sql, rows) {
 if(!Array.isArray(rows)||!rows.length) throw Error('Supply at least one verified nutrition record');
 const seen=new Set();
 const checked=rows.map(row=>{
  const item=sql.prepare('SELECT id,audiences FROM menu_items WHERE source_key=? AND active=1').get(row.source_key);
  if(!item||!JSON.parse(item.audiences).includes(row.audience)) throw Error('Unknown dish or audience');
  const key=`${item.id}:${row.audience}`;
  if(seen.has(key)) throw Error('Duplicate dish portion');seen.add(key);
  for(const field of ['serving_g','calories','protein','carbs','fat']) {
   if(typeof row[field]!=='number'||!Number.isFinite(row[field])||row[field]<0||(field==='serving_g'&&row[field]===0)) throw Error(`Missing or invalid ${field}: ${row.source_key} ${row.audience}`);
  }
  if(row.protein+row.carbs+row.fat>row.serving_g) throw Error('Macronutrient grams exceed portion weight');
  for(const field of ['source_reference','verified_by','verified_at']) if(typeof row[field]!=='string'||!row[field].trim()) throw Error(`Missing ${field}`);
  if(!Number.isFinite(Date.parse(row.verified_at))) throw Error('Invalid verification date');
  return {...row,menu_item_id:item.id};
 });
 sql.transaction(()=>{
  const write=sql.prepare(`INSERT INTO menu_portion_nutrition VALUES(@menu_item_id,@audience,@serving_g,@calories,@protein,@carbs,@fat,@source_reference,@verified_by,@verified_at)
   ON CONFLICT(menu_item_id,audience) DO UPDATE SET serving_g=excluded.serving_g,calories=excluded.calories,protein=excluded.protein,carbs=excluded.carbs,fat=excluded.fat,source_reference=excluded.source_reference,verified_by=excluded.verified_by,verified_at=excluded.verified_at`);
  checked.forEach(row=>write.run(row));
 })();
 return checked.length;
}
module.exports={attachNutrition,importNutrition};
