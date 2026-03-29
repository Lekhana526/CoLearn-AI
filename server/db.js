const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'colearn.sqlite');
const db = new sqlite3.Database(dbPath);

// Create essential tables
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            avatar_url TEXT DEFAULT 'https://api.dicebear.com/7.x/shapes/svg?seed=default',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Ensure avatar_url exists if table was already created
    db.all("PRAGMA table_info(users)", (err, rows) => {
        if (rows && !rows.some(r => r.name === 'avatar_url')) {
            db.run("ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT 'https://api.dicebear.com/7.x/shapes/svg?seed=default'");
        }
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS notebooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT DEFAULT '',
            share_token TEXT UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    `);

    // Ensure content and share_token exist if table was already created
    db.all("PRAGMA table_info(notebooks)", (err, rows) => {
        if (rows && !rows.some(r => r.name === 'content')) {
            db.run("ALTER TABLE notebooks ADD COLUMN content TEXT DEFAULT ''");
        }
        if (rows && !rows.some(r => r.name === 'share_token')) {
            db.run("ALTER TABLE notebooks ADD COLUMN share_token TEXT");
        }
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS notebook_collaborators (
            notebook_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (notebook_id, user_id),
            FOREIGN KEY (notebook_id) REFERENCES notebooks (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT DEFAULT 'info',
            title TEXT NOT NULL,
            content TEXT,
            link TEXT,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS notebook_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            notebook_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            body TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (notebook_id) REFERENCES notebooks (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    `);
});

module.exports = db;
