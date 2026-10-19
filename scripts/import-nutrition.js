'use strict';
// Validates in a rolled-back transaction unless --apply is explicitly passed.
const fs=require('node:fs');const path=require('node:path');const SQL=require('better-sqlite3');
const filename=process.argv[2];
if(!filename) throw Error('Usage: node scripts/import-nutrition.js FILE.json [--apply]');
const sql=new SQL(process.env.DATABASE_FILE||path.join(__dirname,'../evo360.db'));
sql.pragma('foreign_keys=ON');
try {
 const rows=JSON.parse(fs.readFileSync(filename,'utf8'));
 sql.exec('BEGIN');
 const count=require('../db/nutrition').importNutrition(sql,rows);
 sql.exec(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');
 console.log(`${count} verified portions ${process.argv.includes('--apply')?'saved':'validated (dry run)'}`);
} catch(error) {if(sql.inTransaction)sql.exec('ROLLBACK');console.error(error.message);process.exitCode=1;} finally {sql.close();}
