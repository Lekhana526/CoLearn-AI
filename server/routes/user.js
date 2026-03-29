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

const getAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// ── GET PROFILE ──
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const user = await getAsync(
            'SELECT id, name, email, avatar_url FROM users WHERE id = ?',
            [req.user.id]
        );
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('Fetch Profile Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ── UPDATE PROFILE ──
router.patch('/profile', verifyToken, async (req, res) => {
    const { avatar_url } = req.body;

    if (!avatar_url) {
        return res.status(400).json({ error: 'avatar_url is required' });
    }

    try {
        await runAsync(
            'UPDATE users SET avatar_url = ? WHERE id = ?',
            [avatar_url, req.user.id]
        );

        res.json({ message: 'Profile updated', avatar_url });
    } catch (err) {
        console.error('Update Profile Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ── DELETE PROFILE ──
router.delete('/profile', verifyToken, async (req, res) => {
    try {
        // 1. Delete associated notebooks
        await runAsync('DELETE FROM notebooks WHERE user_id = ?', [req.user.id]);
        
        // 2. Delete user
        const result = await runAsync('DELETE FROM users WHERE id = ?', [req.user.id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Account and associated data deleted successfully' });
    } catch (err) {
        console.error('Delete Profile Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
