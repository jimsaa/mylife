import { getDb } from '../src/db/connection.js';

const db = getDb();
console.log('Migrations:', db.prepare('SELECT name FROM migrations').all());
console.log('Sleep tables:', db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sleep%'").all());
