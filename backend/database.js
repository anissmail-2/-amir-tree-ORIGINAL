const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file in backend folder
const dbPath = path.join(__dirname, 'wardrobe.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Create wardrobe_items table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS wardrobe_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      color TEXT NOT NULL,
      image_path TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating table:', err.message);
    } else {
      console.log('✅ Wardrobe table ready');
    }
  });
});

module.exports = db;
