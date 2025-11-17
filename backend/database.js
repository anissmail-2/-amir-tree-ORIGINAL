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

// Create tables
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      gender TEXT,
      age INTEGER,
      nationality TEXT,
      current_location TEXT,
      marital_status TEXT,
      occupation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating users table:', err.message);
    } else {
      console.log('✅ Users table ready');

      // Add profile columns to existing users table (migration)
      const profileColumns = [
        { name: 'gender', type: 'TEXT' },
        { name: 'age', type: 'INTEGER' },
        { name: 'nationality', type: 'TEXT' },
        { name: 'current_location', type: 'TEXT' },
        { name: 'marital_status', type: 'TEXT' },
        { name: 'occupation', type: 'TEXT' }
      ];

      profileColumns.forEach(col => {
        db.run(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`, (alterErr) => {
          // Ignore error if column already exists
          if (alterErr && !alterErr.message.includes('duplicate column name')) {
            console.error(`⚠️  Error adding column ${col.name}:`, alterErr.message);
          }
        });
      });
    }
  });

  // Wardrobe items table (updated with user_id)
  db.run(`
    CREATE TABLE IF NOT EXISTS wardrobe_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      color TEXT NOT NULL,
      image_path TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_worn DATETIME,
      wear_count INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating wardrobe_items table:', err.message);
    } else {
      console.log('✅ Wardrobe table ready');
    }
  });

  // Outfit history table
  db.run(`
    CREATE TABLE IF NOT EXISTS outfit_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      occasion TEXT NOT NULL,
      weather_temp REAL,
      weather_condition TEXT,
      outfit_items TEXT NOT NULL,
      ai_explanation TEXT,
      worn_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating outfit_history table:', err.message);
    } else {
      console.log('✅ Outfit history table ready');
    }
  });
});

module.exports = db;
