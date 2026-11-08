// ============================================================
// BDF Lab 3 — REST API, Query Parameters, Validation, Debugging
// index.js — Main application file
// ============================================================

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Required for Render deployment

// ─── Middleware ───────────────────────────────────────────────
app.use(express.json());

// ─── Database Setup ───────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'books.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database: books.db');
});

// ─── Promise wrappers for SQLite (Debugging Exercise 4: proper await) ───
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// ─── Database Initialisation ──────────────────────────────────
async function initDatabase() {
  // Create the table if it does not exist (Debugging Exercise 3: correct table name = "book")
  await dbRun(`
    CREATE TABLE IF NOT EXISTS book (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      title  TEXT NOT NULL,
      author TEXT NOT NULL,
      price  REAL,
      pages  INTEGER
    )
  `);

  // Seed only when the table is empty (prevents duplicate inserts on restart)
  const countRow = await dbGet('SELECT COUNT(*) AS cnt FROM book');
  if (countRow.cnt === 0) {
    const seedBooks = [
      ['Harry Potter and the Philosopher\'s Stone', 'J.K. Rowling',          350, 332],
      ['Harry Potter and the Chamber of Secrets',  'J.K. Rowling',          380, 352],
      ['The Alchemist',                             'Paulo Coelho',          299, 208],
      ['Atomic Habits',                             'James Clear',           499, 320],
      ['The Great Gatsby',                          'F. Scott Fitzgerald',   250, 180],
      ['To Kill a Mockingbird',                     'Harper Lee',            275, 281],
      ['1984',                                      'George Orwell',         325, 328],
      ['The Pragmatic Programmer',                  'Andrew Hunt',           599, 352],
      ['Clean Code',                                'Robert C. Martin',      549, 464],
      ['You Don\'t Know JS',                        'Kyle Simpson',          399, 300],
    ];

    for (const book of seedBooks) {
      await dbRun(
        'INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)',
        book
      );
    }
    console.log('Database seeded with 10 sample books.');
  } else {
    console.log(`Database already has ${countRow.cnt} book(s). Skipping seed.`);
  }
}

// ─── Helper: Whitelist for order_by ──────────────────────────
const ALLOWED_ORDER_BY = ['id', 'title', 'author', 'price', 'pages'];

// ─── Helper: Positive integer check ──────────────────────────
function isPositiveInt(val) {
  return Number.isInteger(Number(val)) && Number(val) >= 0;
}

// =============================================================
// A. GET /books — Retrieve all books with optional query params
// =============================================================
app.get('/books', async (req, res) => {
  try {
    const {
      search_q,
      order_by,
      order,
      limit,
      offset,
      min_price,
      max_price,
    } = req.query;

    // ── Validate order_by ──────────────────────────────────────
    if (order_by !== undefined && !ALLOWED_ORDER_BY.includes(order_by)) {
      return res.status(400).json({
        message: `Invalid order_by value. Allowed values: ${ALLOWED_ORDER_BY.join(', ')}.`,
      });
    }

    // ── Validate order direction ───────────────────────────────
    const sortDir = (order || 'ASC').toUpperCase();
    if (!['ASC', 'DESC'].includes(sortDir)) {
      return res.status(400).json({
        message: 'Invalid order value. Use ASC or DESC.',
      });
    }

    // ── Validate limit ─────────────────────────────────────────
    const limitVal = limit !== undefined ? Number(limit) : null;
    if (limitVal !== null && (!Number.isInteger(limitVal) || limitVal < 1)) {
      return res.status(400).json({
        message: 'limit must be a positive integer.',
      });
    }

    // ── Validate offset ────────────────────────────────────────
    const offsetVal = offset !== undefined ? Number(offset) : 0;
    if (!Number.isInteger(offsetVal) || offsetVal < 0) {
      return res.status(400).json({
        message: 'offset must be a non-negative integer.',
      });
    }

    // ── Validate min_price / max_price ─────────────────────────
    const minPriceVal = min_price !== undefined ? Number(min_price) : null;
    const maxPriceVal = max_price !== undefined ? Number(max_price) : null;

    if (min_price !== undefined && isNaN(minPriceVal)) {
      return res.status(400).json({ message: 'min_price must be a valid number.' });
    }
    if (max_price !== undefined && isNaN(maxPriceVal)) {
      return res.status(400).json({ message: 'max_price must be a valid number.' });
    }
    if (minPriceVal !== null && maxPriceVal !== null && minPriceVal > maxPriceVal) {
      return res.status(400).json({
        message: 'min_price must not exceed max_price.',
      });
    }

    // ── Build parameterised query ──────────────────────────────
    let sql = 'SELECT * FROM book WHERE 1=1';
    const params = [];

    if (search_q) {
      sql += ' AND title LIKE ?';
      params.push(`%${search_q}%`);
    }
    if (minPriceVal !== null) {
      sql += ' AND price >= ?';
      params.push(minPriceVal);
    }
    if (maxPriceVal !== null) {
      sql += ' AND price <= ?';
      params.push(maxPriceVal);
    }

    // Safe: order_by is whitelisted above, so direct interpolation is fine.
    const orderCol = order_by || 'id';
    sql += ` ORDER BY ${orderCol} ${sortDir}`;

    if (limitVal !== null) {
      sql += ' LIMIT ?';
      params.push(limitVal);
      sql += ' OFFSET ?';
      params.push(offsetVal);
    } else if (offsetVal > 0) {
      // If only offset given without limit, still apply offset with large limit
      sql += ' LIMIT ? OFFSET ?';
      params.push(1000000, offsetVal);
    }

    const books = await dbAll(sql, params);
    return res.status(200).json(books);
  } catch (err) {
    console.error('GET /books error:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// =============================================================
// B. GET /books/:bookId — Retrieve a single book
// =============================================================
app.get('/books/:bookId', async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);

    if (!Number.isInteger(bookId) || bookId < 1) {
      return res.status(400).json({ message: 'Book ID must be a valid positive integer.' });
    }

    const book = await dbGet('SELECT * FROM book WHERE id = ?', [bookId]);

    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    return res.status(200).json(book);
  } catch (err) {
    console.error('GET /books/:bookId error:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// =============================================================
// C. POST /books — Create a new book
// =============================================================
app.post('/books', async (req, res) => {
  try {
    const { title, author, price, pages } = req.body;

    // ── Validation ─────────────────────────────────────────────
    if (!title || String(title).trim() === '') {
      return res.status(400).json({ message: 'Title is required.' });
    }
    if (!author || String(author).trim() === '') {
      return res.status(400).json({ message: 'Author is required.' });
    }
    if (price === undefined || price === null || price === '' || isNaN(Number(price))) {
      return res.status(400).json({ message: 'Price must be a valid number.' });
    }
    if (pages !== undefined && (!Number.isInteger(Number(pages)) || Number(pages) < 1)) {
      return res.status(400).json({ message: 'Pages must be a positive integer.' });
    }

    const result = await dbRun(
      'INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)',
      [String(title).trim(), String(author).trim(), Number(price), pages ? Number(pages) : null]
    );

    const newBook = await dbGet('SELECT * FROM book WHERE id = ?', [result.lastID]);
    return res.status(201).json(newBook);
  } catch (err) {
    console.error('POST /books error:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// =============================================================
// D. PUT /books/:bookId — Update an existing book
// =============================================================
app.put('/books/:bookId', async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);

    if (!Number.isInteger(bookId) || bookId < 1) {
      return res.status(400).json({ message: 'Book ID must be a valid positive integer.' });
    }

    const existing = await dbGet('SELECT * FROM book WHERE id = ?', [bookId]);
    if (!existing) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    const { title, author, price, pages } = req.body;

    // ── Validation ─────────────────────────────────────────────
    if (!title || String(title).trim() === '') {
      return res.status(400).json({ message: 'Title is required.' });
    }
    if (!author || String(author).trim() === '') {
      return res.status(400).json({ message: 'Author is required.' });
    }
    if (price === undefined || price === null || price === '' || isNaN(Number(price))) {
      return res.status(400).json({ message: 'Price must be a valid number.' });
    }
    if (pages !== undefined && (!Number.isInteger(Number(pages)) || Number(pages) < 1)) {
      return res.status(400).json({ message: 'Pages must be a positive integer.' });
    }

    await dbRun(
      'UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?',
      [String(title).trim(), String(author).trim(), Number(price), pages ? Number(pages) : null, bookId]
    );

    const updatedBook = await dbGet('SELECT * FROM book WHERE id = ?', [bookId]);
    return res.status(200).json(updatedBook);
  } catch (err) {
    console.error('PUT /books/:bookId error:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// =============================================================
// E. DELETE /books/:bookId — Delete a book
// =============================================================
app.delete('/books/:bookId', async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);

    if (!Number.isInteger(bookId) || bookId < 1) {
      return res.status(400).json({ message: 'Book ID must be a valid positive integer.' });
    }

    const existing = await dbGet('SELECT * FROM book WHERE id = ?', [bookId]);
    if (!existing) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    await dbRun('DELETE FROM book WHERE id = ?', [bookId]);
    return res.status(200).json({ message: `Book with id ${bookId} deleted successfully.` });
  } catch (err) {
    console.error('DELETE /books/:bookId error:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── 404 catch-all ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// ─── Start server after DB is ready ──────────────────────────
// Only start listening when this file is run directly (not when required by tests)
const dbReady = initDatabase();

if (require.main === module) {
  dbReady
    .then(() => {
      app.listen(PORT, HOST, () => {
        console.log(`Server running at http://${HOST}:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Database initialisation failed:', err.message);
      process.exit(1);
    });
}

module.exports = { app, dbReady }; // exported for testing

