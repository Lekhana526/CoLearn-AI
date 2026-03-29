const express = require('express');
const db = require('../db');
const { verifyToken } = require('../auth');
const crypto = require('crypto');

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

const getAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// ── GET ALL NOTEBOOKS ──
router.get('/', verifyToken, async (req, res) => {
    const { q } = req.query;
    try {
        // Fetch notebooks owned by the user AND notebooks the user has joined as a collaborator
        let sql = `
            SELECT n.*, 
                   u.name as owner_name,
                   CASE WHEN n.user_id = ? THEN 1 ELSE 0 END as is_owner,
                   EXISTS(SELECT 1 FROM notebook_collaborators nc WHERE nc.notebook_id = n.id) as is_shared
            FROM notebooks n
            JOIN users u ON n.user_id = u.id
            LEFT JOIN notebook_collaborators c ON n.id = c.notebook_id
            WHERE (n.user_id = ? OR c.user_id = ?)
        `;
        let params = [req.user.id, req.user.id, req.user.id];

        if (q) {
            sql += ' AND n.title LIKE ?';
            params.push(`%${q}%`);
        }

        sql += ' GROUP BY n.id ORDER BY n.created_at DESC';

        const notebooks = await allAsync(sql, params);
        res.json(notebooks);
    } catch (err) {
        console.error('Fetch Notebooks Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ── GET SINGLE NOTEBOOK BY ID ──
router.get('/:id', verifyToken, async (req, res) => {
    const notebookId = req.params.id;
    if (notebookId === 'join' || notebookId === 'share') return res.status(404).json({ error: 'Invalid ID' }); // Avoid route conflict with /join

    try {
        const sql = `
            SELECT n.*, 
                   CASE WHEN n.user_id = ? THEN 1 ELSE 0 END as is_owner 
            FROM notebooks n
            LEFT JOIN notebook_collaborators c ON n.id = c.notebook_id
            WHERE n.id = ? AND (n.user_id = ? OR c.user_id = ?)
            LIMIT 1
        `;
        const notebook = await getAsync(sql, [req.user.id, notebookId, req.user.id, req.user.id]);
        
        if (!notebook) {
            return res.status(404).json({ error: 'Notebook not found or access denied.' });
        }
        res.json(notebook);
    } catch (err) {
        console.error('Fetch Notebook Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ── CREATE NOTEBOOK ──
router.post('/', verifyToken, async (req, res) => {
    const { title } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        const result = await runAsync(
            'INSERT INTO notebooks (user_id, title, content) VALUES (?, ?, ?)',
            [req.user.id, title, '']
        );

        res.status(201).json({
            message: 'Notebook created',
            notebook: {
                id: result.lastID,
                user_id: req.user.id,
                title,
                content: '',
                is_owner: 1,
                created_at: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error('Create Notebook Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ── SAVE/UPDATE NOTEBOOK ──
router.put('/:id', verifyToken, async (req, res) => {
    const notebookId = req.params.id;
    const { title, content } = req.body;

    try {
        const checkSql = `
            SELECT n.id FROM notebooks n
            LEFT JOIN notebook_collaborators c ON n.id = c.notebook_id
            WHERE n.id = ? AND (n.user_id = ? OR c.user_id = ?)
            LIMIT 1
        `;
        const notebook = await getAsync(checkSql, [notebookId, req.user.id, req.user.id]);
        if (!notebook) return res.status(403).json({ error: 'Access denied' });

        await runAsync(
            'UPDATE notebooks SET title = ?, content = ? WHERE id = ?',
            [title, content, notebookId]
        );

        res.json({ message: 'Notebook saved successfully' });
    } catch (err) {
        console.error('Save Notebook Error:', err);
        res.status(500).json({ error: 'Failed to save notebook' });
    }
});

// ── GENERATE SHARE LINK ──
router.post('/:id/share', verifyToken, async (req, res) => {
    const notebookId = req.params.id;

    try {
        const checkSql = `
            SELECT n.id, n.share_token FROM notebooks n
            LEFT JOIN notebook_collaborators c ON n.id = c.notebook_id
            WHERE n.id = ? AND (n.user_id = ? OR c.user_id = ?)
            LIMIT 1
        `;
        const notebook = await getAsync(checkSql, [notebookId, req.user.id, req.user.id]);
        if (!notebook) return res.status(403).json({ error: 'Access denied' });

        let token = notebook.share_token;
        if (!token) {
            token = crypto.randomUUID();
            await runAsync('UPDATE notebooks SET share_token = ? WHERE id = ?', [token, notebookId]);
        }
        res.json({ share_token: token });
    } catch (err) {
        console.error('Share Notebook Error:', err);
        res.status(500).json({ error: 'Failed to generate share link' });
    }
});

// ── JOIN SHARED NOTEBOOK ──
router.post('/join/link', verifyToken, async (req, res) => {
    const { share_token } = req.body;
    if (!share_token) return res.status(400).json({ error: 'Share token is required' });

    try {
        const notebook = await getAsync('SELECT id, user_id FROM notebooks WHERE share_token = ?', [share_token]);
        if (!notebook) return res.status(404).json({ error: 'Invalid or expired share link' });

        if (notebook.user_id === req.user.id) {
            return res.json({ message: 'You own this notebook', notebook_id: notebook.id });
        }

        await runAsync(
            'INSERT OR IGNORE INTO notebook_collaborators (notebook_id, user_id) VALUES (?, ?)',
            [notebook.id, req.user.id]
        );

        res.json({ message: 'Successfully joined notebook', notebook_id: notebook.id });
    } catch (err) {
        console.error('Join Notebook Error:', err);
        res.status(500).json({ error: 'Failed to join notebook' });
    }
});

// ── INVITE COLLABORATOR VIA NOTIFICATION ──
router.post('/:id/invite', verifyToken, async (req, res) => {
    const notebookId = req.params.id;
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
        // 1. Verify caller has access
        const checkSql = `
            SELECT n.id, n.title, n.share_token, u.name as owner_name 
            FROM notebooks n
            JOIN users u ON n.user_id = u.id
            LEFT JOIN notebook_collaborators c ON n.id = c.notebook_id
            WHERE n.id = ? AND (n.user_id = ? OR c.user_id = ?)
            LIMIT 1
        `;
        const notebook = await getAsync(checkSql, [notebookId, req.user.id, req.user.id]);
        if (!notebook) return res.status(403).json({ error: 'Access denied' });

        // 2. Find target user
        const targetUser = await getAsync('SELECT id, name FROM users WHERE email = ?', [email]);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        if (targetUser.id === req.user.id) {
            return res.status(400).json({ error: 'You cannot invite yourself' });
        }

        // 3. Ensure a share token exists
        let token = notebook.share_token;
        if (!token) {
            token = crypto.randomUUID();
            await runAsync('UPDATE notebooks SET share_token = ? WHERE id = ?', [token, notebookId]);
        }

        // 4. Create notification for target user
        const inviteLink = `/join.html?token=${token}`;
        await runAsync(
            'INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, ?, ?, ?, ?)',
            [targetUser.id, 'collab', 'Notebook Invitation', `${req.user.name || 'Someone'} invited you to join "${notebook.title}".`, inviteLink]
        );

        res.json({ message: 'Invite sent successfully' });
    } catch (err) {
        console.error('Invite Error:', err);
        res.status(500).json({ error: 'Failed to send invite' });
    }
});

// ── DELETE / LEAVE NOTEBOOK ──
router.delete('/:id', verifyToken, async (req, res) => {
    const notebookId = req.params.id;
    try {
        const notebook = await getAsync('SELECT user_id FROM notebooks WHERE id = ?', [notebookId]);
        if (!notebook) return res.status(404).json({ error: 'Notebook not found' });

        if (notebook.user_id === req.user.id) {
            await runAsync('DELETE FROM notebooks WHERE id = ?', [notebookId]);
            return res.json({ message: 'Notebook deleted' });
        } else {
            await runAsync('DELETE FROM notebook_collaborators WHERE notebook_id = ? AND user_id = ?', [notebookId, req.user.id]);
            return res.json({ message: 'Left the shared notebook' });
        }
    } catch (err) {
        console.error('Delete Notebook Error:', err);
        res.status(500).json({ error: 'Failed to complete action' });
    }
});

// ── GET NOTEBOOK MESSAGES ──
router.get('/:id/messages', verifyToken, async (req, res) => {
    const notebookId = req.params.id;
    try {
        // Verify access
        const checkSql = `
            SELECT 1 FROM notebooks n
            LEFT JOIN notebook_collaborators c ON n.id = c.notebook_id
            WHERE n.id = ? AND (n.user_id = ? OR c.user_id = ?)
            LIMIT 1
        `;
        const access = await getAsync(checkSql, [notebookId, req.user.id, req.user.id]);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        const messages = await allAsync(`
            SELECT m.*, u.name as author_name 
            FROM notebook_messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.notebook_id = ?
            ORDER BY m.created_at ASC
        `, [notebookId]);

        res.json(messages);
    } catch (err) {
        console.error('Fetch Messages Error:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// ── POST NOTEBOOK MESSAGE ──
router.post('/:id/messages', verifyToken, async (req, res) => {
    const notebookId = req.params.id;
    const { body } = req.body;
    if (!body) return res.status(400).json({ error: 'Message body required' });

    try {
        // Verify access
        const checkSql = `
            SELECT 1 FROM notebooks n
            LEFT JOIN notebook_collaborators c ON n.id = c.notebook_id
            WHERE n.id = ? AND (n.user_id = ? OR c.user_id = ?)
            LIMIT 1
        `;
        const access = await getAsync(checkSql, [notebookId, req.user.id, req.user.id]);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        await runAsync(
            'INSERT INTO notebook_messages (notebook_id, user_id, body) VALUES (?, ?, ?)',
            [notebookId, req.user.id, body]
        );

        res.status(201).json({ message: 'Message sent' });
    } catch (err) {
        console.error('Send Message Error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

module.exports = router;
