'use strict';
const {createHash}=require('node:crypto');
// Offline, transactional import: startup never depends on the client's server.
module.exports=function importMenu(sql, snapshot=require('../data/live-menu.json')) {
 const digest=createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
 if(sql.prepare('SELECT digest FROM menu_imports WHERE source=?').get(snapshot.source)?.digest===digest) return;
 sql.transaction(()=>{
  for(const school of snapshot.schools){
   const local=sql.prepare('SELECT id FROM schools WHERE name=?').get(school.name);
   if(!local) throw new Error(`No school mapping for ${school.name}`);
   const items=new Map();
   for(const [category,rows] of Object.entries(school.categories)) for(const row of rows){
    if(!['main','side','drink','snack'].includes(category)||!row.m_ItemId||!row.m_ItemName) throw new Error('Invalid source dish');
    if(!row.m_Active) continue;
    const key=`${school.branchId}:${row.m_ItemId}:${row.m_MealCategoryId}`;
    if(!items.has(key)) items.set(key,{key,category,row,audiences:[]});
    const item=items.get(key);
    if(item.category!==category||item.row.m_ItemName!==row.m_ItemName) throw new Error('Conflicting source identity');
    if(!item.audiences.includes(row.m_StdCatg)) item.audiences.push(row.m_StdCatg);
   }
   if(![...items.values()].some(item=>item.category==='main')) throw new Error('Refusing an empty main menu import');
   // Replace only this school's menu membership; preserve old records and history.
   sql.prepare('DELETE FROM school_menu_items WHERE school_id=?').run(local.id);
   sql.prepare('UPDATE menu_items SET active=0 WHERE source_key LIKE ?').run(`${school.branchId}:%`);
   for(const {key,category,row,audiences} of items.values()){
    const filename=row.m_ItemImage;
    if(!/^[A-Za-z0-9_.-]+$/.test(filename)) throw new Error('Invalid source image filename');
    sql.prepare(`INSERT INTO menu_items(name,tag,category,source_key,source_url,source_image,audiences,nutrition_known)
      VALUES(?,?,?,?,?,?,?,0) ON CONFLICT(source_key) DO UPDATE SET name=excluded.name,tag=excluded.tag,category=excluded.category,
      source_url=excluded.source_url,source_image=excluded.source_image,audiences=excluded.audiences,active=1,nutrition_known=0`)
      .run(row.m_ItemName,row.m_MealCategory,category,key,snapshot.source,`/images/menu/live/${filename.replace(/\.[^.]+$/, '.webp')}`,JSON.stringify(audiences));
    const id=sql.prepare('SELECT id FROM menu_items WHERE source_key=?').get(key).id;
    sql.prepare('INSERT INTO school_menu_items(school_id,menu_item_id) VALUES(?,?)').run(local.id,id);
   }
  }
  sql.prepare('INSERT INTO menu_imports(source,digest,fetched_at) VALUES(?,?,?) ON CONFLICT(source) DO UPDATE SET digest=excluded.digest,fetched_at=excluded.fetched_at')
   .run(snapshot.source,digest,snapshot.fetchedAt);
 })();
};
