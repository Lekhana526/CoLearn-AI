const express = require('express');
const db = require('../db');
const { verifyToken } = require('../auth');

const router = express.Router();

// PostgreSQL Adapter Helpers
const runAsync = async (sql, params = []) => {
    let i = 1;
    const pgSql = sql.replace(/\?/g, () => `$${i++}`);
    const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
    const finalSql = isInsert ? `${pgSql} RETURNING id` : pgSql;

    const res = await db.query(finalSql, params);
    return {
        lastID: isInsert && res.rows.length > 0 ? res.rows[0].id : null,
        changes: res.rowCount
    };
};

const allAsync = async (sql, params = []) => {
    let i = 1;
    const pgSql = sql.replace(/\?/g, () => `$${i++}`);
    const res = await db.query(pgSql, params);
    return res.rows;
};

// ── GET NOTIFICATIONS ──
router.get('/', verifyToken, async (req, res) => {
    try {
        const rows = await allAsync(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Fetch Notifications Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ── MARK ALL AS READ ──
router.patch('/read-all', verifyToken, async (req, res) => {
    try {
        await runAsync(
            'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
            [req.user.id]
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error('Mark Read Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ── TEST NOTIFICATION ──
router.post('/test', verifyToken, async (req, res) => {
    const { type, title, content, link } = req.body;
    try {
        await runAsync(
            'INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, type || 'info', title || 'New Notification', content || 'You have a new message!', link || '#']
        );
        res.status(201).json({ message: 'Notification triggered' });
    } catch (err) {
        console.error('Test Notification Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
