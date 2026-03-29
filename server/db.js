const { Pool } = require('pg');

// Setup PostgreSQL pool. 
// Uses DATABASE_URL from .env when deployed on Render or running locally.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Provide a sensible default fallback for local dev if DATABASE_URL is somehow missing
    // but typically you should set DATABASE_URL (e.g. postgresql://user:pass@localhost:5432/colearn)
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initializeDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                avatar_url TEXT DEFAULT 'https://api.dicebear.com/7.x/shapes/svg?seed=default',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS notebooks (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                content TEXT DEFAULT '',
                share_token TEXT UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS notebook_collaborators (
                notebook_id INTEGER NOT NULL REFERENCES notebooks (id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (notebook_id, user_id)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type TEXT DEFAULT 'info',
                title TEXT NOT NULL,
                content TEXT,
                link TEXT,
                is_read INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS notebook_messages (
                id SERIAL PRIMARY KEY,
                notebook_id INTEGER NOT NULL REFERENCES notebooks (id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                body TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log("PostgreSQL Database initialized successfully.");
    } catch (err) {
        console.error("Failed to initialize database:", err);
    }
};

initializeDB();

module.exports = pool;
