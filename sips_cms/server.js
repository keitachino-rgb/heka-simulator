const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database initialization
const db = new sqlite3.Database('./cms.db', async (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✓ Connected to SQLite database');
    await initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  return new Promise((resolve) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // News/Articles table
      db.run(`
        CREATE TABLE IF NOT EXISTS articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          content TEXT NOT NULL,
          excerpt TEXT,
          category TEXT,
          published INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          author_id INTEGER,
          FOREIGN KEY(author_id) REFERENCES users(id)
        )
      `);

      // Pages table
      db.run(`
        CREATE TABLE IF NOT EXISTS pages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          content TEXT NOT NULL,
          meta_description TEXT,
          published INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Services table
      db.run(`
        CREATE TABLE IF NOT EXISTS services (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          icon TEXT,
          order_num INTEGER,
          published INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create default admin user if not exists
      const adminPassword = bcrypt.hashSync('admin123', 10);
      db.run(`
        INSERT OR IGNORE INTO users (username, password, email)
        VALUES (?, ?, ?)
      `, ['admin', adminPassword, 'admin@sips.local'], function(err) {
        if (err) console.error('Error creating admin user:', err);
        else console.log('✓ Database initialized with admin user');
        resolve();
      });
    });
  });
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// ==================== AUTHENTICATION ====================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '24h'
    });

    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  });
});

// ==================== ARTICLES/NEWS ====================

// Get all articles
app.get('/api/articles', (req, res) => {
  const published = req.query.published !== 'false';
  const sql = published
    ? 'SELECT * FROM articles WHERE published = 1 ORDER BY created_at DESC LIMIT 100'
    : 'SELECT * FROM articles ORDER BY created_at DESC LIMIT 100';

  db.all(sql, (err, articles) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(articles);
  });
});

// Get single article
app.get('/api/articles/:id', (req, res) => {
  db.get('SELECT * FROM articles WHERE id = ?', [req.params.id], (err, article) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  });
});

// Create article (admin only)
app.post('/api/articles', authenticateToken, (req, res) => {
  const { title, slug, content, excerpt, category, published } = req.body;

  if (!title || !slug || !content) {
    return res.status(400).json({ error: 'Title, slug, and content are required' });
  }

  db.run(
    `INSERT INTO articles (title, slug, content, excerpt, category, published, author_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, slug, content, excerpt, category, published ? 1 : 0, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: 'Article created' });
    }
  );
});

// Update article (admin only)
app.put('/api/articles/:id', authenticateToken, (req, res) => {
  const { title, slug, content, excerpt, category, published } = req.body;

  db.run(
    `UPDATE articles SET title = ?, slug = ?, content = ?, excerpt = ?, category = ?,
     published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [title, slug, content, excerpt, category, published ? 1 : 0, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Article not found' });
      res.json({ message: 'Article updated' });
    }
  );
});

// Delete article (admin only)
app.delete('/api/articles/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM articles WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Article not found' });
    res.json({ message: 'Article deleted' });
  });
});

// ==================== PAGES ====================

// Get all pages
app.get('/api/pages', (req, res) => {
  db.all('SELECT * FROM pages ORDER BY created_at DESC', (err, pages) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(pages);
  });
});

// Get single page by slug
app.get('/api/pages/:slug', (req, res) => {
  db.get('SELECT * FROM pages WHERE slug = ?', [req.params.slug], (err, page) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json(page);
  });
});

// Create page (admin only)
app.post('/api/pages', authenticateToken, (req, res) => {
  const { title, slug, content, meta_description, published } = req.body;

  if (!title || !slug || !content) {
    return res.status(400).json({ error: 'Title, slug, and content are required' });
  }

  db.run(
    `INSERT INTO pages (title, slug, content, meta_description, published)
     VALUES (?, ?, ?, ?, ?)`,
    [title, slug, content, meta_description, published ? 1 : 0],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: 'Page created' });
    }
  );
});

// Update page (admin only)
app.put('/api/pages/:id', authenticateToken, (req, res) => {
  const { title, slug, content, meta_description, published } = req.body;

  db.run(
    `UPDATE pages SET title = ?, slug = ?, content = ?, meta_description = ?,
     published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [title, slug, content, meta_description, published ? 1 : 0, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Page not found' });
      res.json({ message: 'Page updated' });
    }
  );
});

// Delete page (admin only)
app.delete('/api/pages/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM pages WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Page not found' });
    res.json({ message: 'Page deleted' });
  });
});

// ==================== SERVICES ====================

// Get all services
app.get('/api/services', (req, res) => {
  db.all('SELECT * FROM services WHERE published = 1 ORDER BY order_num', (err, services) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(services);
  });
});

// Create service (admin only)
app.post('/api/services', authenticateToken, (req, res) => {
  const { title, description, icon, order_num, published } = req.body;

  db.run(
    `INSERT INTO services (title, description, icon, order_num, published)
     VALUES (?, ?, ?, ?, ?)`,
    [title, description, icon, order_num || 0, published ? 1 : 0],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: 'Service created' });
    }
  );
});

// Update service (admin only)
app.put('/api/services/:id', authenticateToken, (req, res) => {
  const { title, description, icon, order_num, published } = req.body;

  db.run(
    `UPDATE services SET title = ?, description = ?, icon = ?, order_num = ?,
     published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [title, description, icon, order_num || 0, published ? 1 : 0, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Service not found' });
      res.json({ message: 'Service updated' });
    }
  );
});

// Delete service (admin only)
app.delete('/api/services/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM services WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Service not found' });
    res.json({ message: 'Service deleted' });
  });
});

// ==================== SETTINGS ====================

// Get all settings
app.get('/api/settings', (req, res) => {
  db.all('SELECT * FROM settings', (err, settings) => {
    if (err) return res.status(500).json({ error: err.message });
    const settingsObj = {};
    settings.forEach(s => settingsObj[s.key] = s.value);
    res.json(settingsObj);
  });
});

// Update setting (admin only)
app.post('/api/settings', authenticateToken, (req, res) => {
  const { key, value } = req.body;

  db.run(
    `INSERT OR REPLACE INTO settings (key, value, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)`,
    [key, value],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Setting updated' });
    }
  );
});

// ==================== STATIC ADMIN PANEL ====================

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`CMS Server running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}`);
  console.log(`Default login: admin / admin123`);
});
