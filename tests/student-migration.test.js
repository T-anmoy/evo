const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const Database=require('better-sqlite3');
test('class migration normalizes known equivalents and leaves unknown classes unchanged',()=>{
 const db=new Database(':memory:');db.exec('CREATE TABLE students(class TEXT,section TEXT)');const values=[['grade 3','b','Grade 3','B'],['3','a','Grade 3','A'],['Year 3','f','Grade 3','F'],['KG 1','c','KG1','C'],['kg1','E','KG1','E'],['Year 13','Z','Year 13','Z'],['Grade 3','B','Grade 3','B']];
 for(const [klass,section] of values)db.prepare('INSERT INTO students VALUES(?,?)').run(klass,section);
 const migration=fs.readFileSync(require('node:path').join(__dirname,'../migrations/006_student_class_section.sql'),'utf8');db.exec(migration);db.exec(migration);
 assert.deepEqual(db.prepare('SELECT * FROM students').all(),values.map(v=>({class:v[2],section:v[3]})));db.close();
});
