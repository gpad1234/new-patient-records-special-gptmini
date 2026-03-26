// Script to seed 15 synthetic patients into diabetes.db
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DataLoader = require('../src/dataLoader');

const DB_PATH = path.join(__dirname, '../data/diabetes.db');
const db = new sqlite3.Database(DB_PATH);

const loader = new DataLoader(db);

loader.seedDatabase(15)
  .then(result => {
    console.log(result.message);
    db.close();
  })
  .catch(err => {
    console.error('Seeding failed:', err);
    db.close();
    process.exit(1);
  });
