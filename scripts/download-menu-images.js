'use strict';
const fs=require('node:fs');
(async()=>{
 const names=[...new Set(require('../data/live-menu.json').schools.flatMap(s=>Object.values(s.categories).flat().map(r=>r.m_ItemImage)))];
 fs.mkdirSync('public/images/menu/live',{recursive:true});
 for(const name of names){
  if(!/^[A-Za-z0-9_.-]+$/.test(name)) throw Error('Unsafe filename');
  const response=await fetch('https://evo360.tech/CanteenImages/'+encodeURIComponent(name));
  if(!response.ok||!response.headers.get('content-type')?.startsWith('image/')) throw Error('Missing image '+name);
  fs.writeFileSync('public/images/menu/live/'+name,Buffer.from(await response.arrayBuffer()));
 }
 console.log(`Downloaded ${names.length} source images`);
})().catch(e=>{console.error(e);process.exitCode=1;});
