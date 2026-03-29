const express = require('express');
const db = require('../db');
const { verifyToken } = require('../auth');

const router = express.Router();

// Helper to interact with sqlite async
const runAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const allAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
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
