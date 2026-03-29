require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const notebookRoutes = require('./routes/notebooks');
const userRoutes = require('./routes/user');
const notificationRoutes = require('./routes/notifications');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow cross-origin for local testing
app.use(express.json()); // Parse JSON bodies

// Static File Server - Important to serve our HTML since we'll run from localhost!
app.use(express.static(path.join(__dirname, '..')));

// Routes
app.use('/api', authRoutes);
app.use('/api/notebooks', notebookRoutes);
app.use('/api/user', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
    res.json({ message: 'Server is running' });
});

app.listen(PORT, () => {
    console.log(`Colearn API running on http://localhost:${PORT}`);
    console.log(`Access frontend at http://localhost:${PORT}/index.html`);
});
