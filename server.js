const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Database Setup ───────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'nutriplan.db'));

// Create table if it doesn't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS user_data (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
`);

// Helper: read a key from DB
function dbGet(key) {
    const row = db.prepare('SELECT value FROM user_data WHERE key = ?').get(key);
    return row ? JSON.parse(row.value) : null;
}

// Helper: write a key to DB
function dbSet(key, value) {
    db.prepare(`
        INSERT INTO user_data (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, JSON.stringify(value));
}

// ─── Middleware ───────────────────────────────────────────────────
app.use(express.json());

// Serve static files (index.html, app.js, style.css)
app.use(express.static(path.join(__dirname)));

// ─── API Routes ───────────────────────────────────────────────────

// GET /api/data — Load all user data
app.get('/api/data', (req, res) => {
    try {
        const data = {
            goals: dbGet('goals') || { calories: 2000, protein: 150, carbs: 200, fats: 60 },
            dietData: dbGet('dietData') || {},
            myFoods: dbGet('myFoods') || [],
        };
        res.json(data);
    } catch (err) {
        console.error('Error loading data:', err);
        res.status(500).json({ error: 'Failed to load data' });
    }
});

// POST /api/data — Save all user data
app.post('/api/data', (req, res) => {
    try {
        const { goals, dietData, myFoods } = req.body;
        if (goals) dbSet('goals', goals);
        if (dietData) dbSet('dietData', dietData);
        if (myFoods) dbSet('myFoods', myFoods);
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving data:', err);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Fallback: serve index.html for any unknown route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Start Server ─────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n✅ NutriPlan server running at http://localhost:${PORT}`);
    console.log(`   Data stored in: nutriplan.db`);
    console.log(`   Press Ctrl+C to stop\n`);
});
