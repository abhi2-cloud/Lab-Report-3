# BDF Lab 3 — REST API, Query Parameters, Validation, and Debugging

---

## 1. Student Information

| Field               | Details                                        |
|---------------------|------------------------------------------------|
| **Student Name**    | PAMPANA ABHI VEERA DURGA LAKSHMAN             |
| **Reg. Number**     | 252U1R9115                                     |
| **Class / Section** | CSE GEN AI 2B                                  |
| **College**         | Aurora Higher Education and Research Academy   |
| **Lab**             | BDF Lab 3                                      |

---

## 2. Project Overview

This project implements a fully functional **RESTful API** for a Books resource using **Node.js**, **Express.js**, and **SQLite**. It demonstrates:

- Full **CRUD** operations (Create, Read, Update, Delete)
- **Query parameters** — search, sort, pagination, and price filtering
- **Input validation** with descriptive JSON error messages
- Correct **HTTP status codes** throughout
- **Async/await** database handling using Promise wrappers
- **Parameterized SQL queries** to prevent SQL injection
- **Four debugging exercises** with error analysis and solutions
- **Automated testing** using a standalone test runner
- Deployment-ready configuration for **Render**

---

## 3. Objectives

1. Build a RESTful API with Node.js and Express.js.
2. Use SQLite as the database with proper schema design.
3. Implement all five CRUD endpoints.
4. Support query parameters: `search_q`, `order_by`, `order`, `limit`, `offset`, `min_price`, `max_price`.
5. Validate all inputs and return appropriate error codes.
6. Document and solve four common debugging scenarios.
7. Write and run automated tests.
8. Deploy to Render.

---

## 4. Technology Stack

| Technology  | Purpose                       |
|-------------|-------------------------------|
| Node.js     | JavaScript runtime            |
| Express.js  | Web framework / routing       |
| SQLite      | Lightweight relational DB     |
| sqlite3     | Node.js SQLite driver         |
| Postman     | API testing (manual)          |
| Git/GitHub  | Version control               |
| Render      | Cloud deployment              |

---

## 5. Project Folder Structure

```
d:\Lab report-3\
│
├── index.js           ← Main Express server & all API endpoints
├── package.json       ← Project metadata and dependencies
├── package-lock.json  ← Dependency lock file
├── books.db           ← SQLite database (auto-created on first run)
├── README.md          ← This documentation file
├── test_runner.js     ← Automated test script (21 tests)
├── .gitignore         ← Excludes node_modules, .env, etc.
└── screenshots/       ← Postman test evidence screenshots
    ├── 01_get_all_books.png
    ├── 02_get_book_by_id.png
    ├── 03_search_harry.png
    ├── 04_sort_price_asc.png
    ├── 05_sort_price_desc.png
    ├── 06_pagination.png
    ├── 07_price_filter.png
    ├── 08_combined_query.png
    ├── 09_post_create.png
    ├── 10_put_update.png
    ├── 11_delete.png
    ├── 12_missing_title.png
    ├── 13_non_numeric_price.png
    ├── 14_not_found_404.png
    └── 15_invalid_order_by.png
```

---

## 6. Database Schema

**Database file:** `books.db`  
**Table name:** `book`

| Column   | Type                      | Constraints             |
|----------|---------------------------|-------------------------|
| `id`     | INTEGER                   | PRIMARY KEY AUTOINCREMENT |
| `title`  | TEXT                      | NOT NULL                |
| `author` | TEXT                      | NOT NULL                |
| `price`  | REAL                      | —                       |
| `pages`  | INTEGER                   | —                       |

**Initialization behaviour:**
- The table is created automatically when the server starts (`CREATE TABLE IF NOT EXISTS`).
- Exactly 10 seed records are inserted **only when the table is empty**.
- The server will never insert duplicates on restart.

---

## 7. Sample Database Records (Seed Data)

| id | Title                                       | Author                | Price | Pages |
|----|---------------------------------------------|-----------------------|-------|-------|
| 1  | Harry Potter and the Philosopher's Stone    | J.K. Rowling          | 350   | 332   |
| 2  | Harry Potter and the Chamber of Secrets     | J.K. Rowling          | 380   | 352   |
| 3  | The Alchemist                               | Paulo Coelho          | 299   | 208   |
| 4  | Atomic Habits                               | James Clear           | 499   | 320   |
| 5  | The Great Gatsby                            | F. Scott Fitzgerald   | 250   | 180   |
| 6  | To Kill a Mockingbird                       | Harper Lee            | 275   | 281   |
| 7  | 1984                                        | George Orwell         | 325   | 328   |
| 8  | The Pragmatic Programmer                    | Andrew Hunt           | 599   | 352   |
| 9  | Clean Code                                  | Robert C. Martin      | 549   | 464   |
| 10 | You Don't Know JS                           | Kyle Simpson          | 399   | 300   |

---

## 8. API Endpoint Documentation

### A. GET /books — Retrieve all books

Supports all query parameters listed in Section 9.

**Default response (no params):**
```
GET http://localhost:3000/books
```
```json
[
  { "id": 1, "title": "Harry Potter and the Philosopher's Stone", "author": "J.K. Rowling", "price": 350, "pages": 332 },
  ...
]
```
**Status:** `200 OK`

---

### B. GET /books/:bookId — Retrieve a single book

```
GET http://localhost:3000/books/1
```
```json
{ "id": 1, "title": "Harry Potter and the Philosopher's Stone", "author": "J.K. Rowling", "price": 350, "pages": 332 }
```
**Status:** `200 OK`  
**Not found:** `404 Not Found` → `{ "message": "Book not found." }`  
**Invalid ID (non-integer):** `400 Bad Request`

---

### C. POST /books — Create a new book

```
POST http://localhost:3000/books
Content-Type: application/json

{
  "title": "Atomic Habits",
  "author": "James Clear",
  "price": 599,
  "pages": 320
}
```
**Response:**
```json
{ "id": 11, "title": "Atomic Habits", "author": "James Clear", "price": 599, "pages": 320 }
```
**Status:** `201 Created`

---

### D. PUT /books/:bookId — Update a book

```
PUT http://localhost:3000/books/11
Content-Type: application/json

{
  "title": "Atomic Habits - Updated",
  "author": "James Clear",
  "price": 650,
  "pages": 350
}
```
**Response:**
```json
{ "id": 11, "title": "Atomic Habits - Updated", "author": "James Clear", "price": 650, "pages": 350 }
```
**Status:** `200 OK`

---

### E. DELETE /books/:bookId — Delete a book

```
DELETE http://localhost:3000/books/11
```
**Response:**
```json
{ "message": "Book with id 11 deleted successfully." }
```
**Status:** `200 OK`

---

## 9. Query Parameter Documentation

All parameters are **optional** for `GET /books`. Default values apply when not provided.

| Parameter    | Type    | Default | Description                                            | Example                        |
|--------------|---------|---------|--------------------------------------------------------|--------------------------------|
| `search_q`   | string  | none    | Partial title search (case-insensitive LIKE match)     | `?search_q=Harry`              |
| `order_by`   | string  | `id`    | Column to sort by: `id`, `title`, `author`, `price`, `pages` | `?order_by=price`        |
| `order`      | string  | `ASC`   | Sort direction: `ASC` or `DESC`                        | `?order=DESC`                  |
| `limit`      | integer | none    | Maximum number of records to return (must be ≥ 1)      | `?limit=5`                     |
| `offset`     | integer | `0`     | Number of records to skip (must be ≥ 0)                | `?offset=5`                    |
| `min_price`  | number  | none    | Minimum price (inclusive)                              | `?min_price=200`               |
| `max_price`  | number  | none    | Maximum price (inclusive)                              | `?max_price=400`               |

**Combined example:**
```
GET /books?search_q=Harry&order_by=price&order=ASC&limit=5&offset=0&min_price=300&max_price=500
```

---

## 10. Validation Rules

| Field / Parameter | Rule                                                    | Error Response                            |
|-------------------|---------------------------------------------------------|-------------------------------------------|
| `title`           | Required, non-empty string                              | `{ "message": "Title is required." }`     |
| `author`          | Required, non-empty string                              | `{ "message": "Author is required." }`    |
| `price`           | Must be a valid number                                  | `{ "message": "Price must be a valid number." }` |
| `pages`           | Must be a positive integer                              | `{ "message": "Pages must be a positive integer." }` |
| `bookId`          | Must be a positive integer                              | `{ "message": "Book ID must be a valid positive integer." }` |
| `order_by`        | Must be one of: `id`, `title`, `author`, `price`, `pages` | `{ "message": "Invalid order_by value. Allowed values: ..." }` |
| `order`           | Must be `ASC` or `DESC`                                 | `{ "message": "Invalid order value. Use ASC or DESC." }` |
| `limit`           | Must be a positive integer (≥ 1)                        | `{ "message": "limit must be a positive integer." }` |
| `offset`          | Must be a non-negative integer (≥ 0)                    | `{ "message": "offset must be a non-negative integer." }` |
| `min_price`       | Must be a valid number; must not exceed `max_price`     | `{ "message": "min_price must not exceed max_price." }` |
| `max_price`       | Must be a valid number                                  | `{ "message": "max_price must be a valid number." }` |

---

## 11. HTTP Status Codes

| Code | Meaning               | When Used                                    |
|------|-----------------------|----------------------------------------------|
| 200  | OK                    | Successful GET, PUT, DELETE                  |
| 201  | Created               | Successful POST (new book created)           |
| 400  | Bad Request           | Invalid input, missing fields, bad params    |
| 404  | Not Found             | Book ID does not exist in the database       |
| 500  | Internal Server Error | Unexpected server or database errors         |

---

## 12. Installation Instructions

### Prerequisites
- Node.js v18 or higher — download from [nodejs.org](https://nodejs.org)
- npm (comes with Node.js)
- Postman — download from [postman.com](https://www.postman.com)

### Steps

1. **Clone or download** the project folder.

2. **Open a terminal** and navigate to the project folder:
   ```bash
   cd "d:\Lab report-3"
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```
   This installs `express` and `sqlite3`.

4. **Start the server:**
   ```bash
   node index.js
   ```

You should see:
```
Connected to SQLite database: books.db
Database seeded with 10 sample books.
Server running at http://0.0.0.0:3000
```

5. **Test in browser or Postman:**
   Open `http://localhost:3000/books`

---

## 13. How to Run Locally

```bash
# Navigate to the project folder
cd "d:\Lab report-3"

# Install dependencies (first time only)
npm install

# Start the server
node index.js
# OR
npm start

# Server runs at:
# http://localhost:3000
```

The SQLite database (`books.db`) is created automatically in the project root on first run.

---

## 14. Automated Testing Instructions

The test runner requires the server to be running.

**Step 1 — Start the server** (in one terminal):
```bash
node index.js
```

**Step 2 — Run the tests** (in a second terminal):
```bash
node test_runner.js
```

The test runner covers **21 test cases**:

| # | Test Case                        |
|---|----------------------------------|
| 1 | GET all books — status 200       |
| 2 | GET book by ID — status 200      |
| 3 | Search by title (Harry)          |
| 4 | Sort by price ASC                |
| 5 | Sort by price DESC               |
| 6 | Pagination (limit=5, offset=5)   |
| 7 | Price range filter               |
| 8 | Combined query params            |
| 9 | POST valid book — status 201     |
| 10 | PUT update — status 200         |
| 11 | DELETE book — status 200        |
| 12 | POST missing title — status 400 |
| 13 | POST non-numeric price — 400    |
| 14 | GET book not found — 404        |
| 15 | GET invalid order_by — 400      |
| 16 | GET invalid order direction — 400|
| 17 | GET invalid limit — 400         |
| 18 | GET invalid offset — 400        |
| 19 | GET invalid price range — 400   |
| 20 | POST missing author — 400       |
| 21 | GET invalid book ID — 400       |

---

## 15. Postman Testing Instructions

Base URL: `http://localhost:3000`

For Postman tests that require a request body, set:
- **Body** → **raw** → **JSON**

### Test Case Reference Table

| # | Method | URL / Path                                                                                              | Expected Status |
|---|--------|---------------------------------------------------------------------------------------------------------|-----------------|
| 1 | GET    | `/books`                                                                                                | 200             |
| 2 | GET    | `/books/1`                                                                                              | 200             |
| 3 | GET    | `/books?search_q=Harry`                                                                                 | 200             |
| 4 | GET    | `/books?order_by=price&order=ASC`                                                                       | 200             |
| 5 | GET    | `/books?order_by=price&order=DESC`                                                                      | 200             |
| 6 | GET    | `/books?limit=5&offset=5`                                                                               | 200             |
| 7 | GET    | `/books?min_price=200&max_price=400`                                                                    | 200             |
| 8 | GET    | `/books?search_q=Harry&order_by=price&order=ASC&limit=5&offset=0&min_price=300&max_price=500`           | 200             |
| 9 | POST   | `/books` — `{"title":"Atomic Habits","author":"James Clear","price":599,"pages":320}`                   | 201             |
| 10 | PUT   | `/books/{id from test 9}` — `{"title":"Atomic Habits - Updated","author":"James Clear","price":650,"pages":350}` | 200   |
| 11 | DELETE | `/books/{id from test 9}`                                                                              | 200             |
| 12 | POST   | `/books` — `{"author":"Test Author","price":250,"pages":100}` (no title)                               | 400             |
| 13 | POST   | `/books` — `{"title":"Test","author":"Test Author","price":"abc","pages":100}`                          | 400             |
| 14 | GET    | `/books/999`                                                                                            | 404             |
| 15 | GET    | `/books?order_by=invalid`                                                                               | 400             |

> **Important:** Capture the `id` from the Test 9 POST response and use that exact ID for Tests 10 and 11.

---

## 16. Debugging Exercises and Solutions

### Exercise 1 — EADDRINUSE (Port Already in Use)

**Error Description:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Why it occurs:**
When you try to start the server on port 3000 and another process (a previous instance of the same server or another application) is already listening on that port, the operating system refuses the bind and throws `EADDRINUSE`.

**How to identify it:**
The error appears immediately in the terminal when `node index.js` is run. The word `EADDRINUSE` and the port number appear in the error message.

**Solution:**

*Option A — Find and kill the conflicting process (Windows):*
```bash
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

*Option B — Use a different port:*
```bash
PORT=3001 node index.js
```

*Option C — Use `process.env.PORT` (already implemented):*
```js
const PORT = process.env.PORT || 3000;
```

---

### Exercise 2 — Wrong Import / File Path

**Error Description:**
```
Error: Cannot find module './databse'
Require stack:
 - d:\Lab report-3\index.js
```

**Why it occurs:**
Node.js uses `require()` to load modules. If the filename or path is spelled incorrectly, Node.js cannot locate the file and throws a `MODULE_NOT_FOUND` error. For example:
```js
// Wrong — typo in filename
const db = require('./databse');

// Correct
const db = require('./database');
```

**How to identify it:**
The error message starts with `Error: Cannot find module` and shows the incorrect path.

**Solution:**
Check the spelling of the filename carefully. Use your editor's auto-complete or verify the exact filename in the directory.

---

### Exercise 3 — Table-Name Typo in SQLite

**Error Description:**
```
SQLITE_ERROR: no such table: books
```

**Why it occurs:**
The table in `books.db` is named `book` (singular), but a query uses `books` (plural):
```js
// Wrong — table name typo
db.all('SELECT * FROM books', ...);

// Correct
db.all('SELECT * FROM book', ...);
```
SQLite table names are **case-sensitive** and must exactly match the name used in `CREATE TABLE`.

**How to identify it:**
The error `SQLITE_ERROR: no such table: <name>` appears in the console when a query executes. The table name in the error message will differ from the one you created.

**Solution:**
Ensure every SQL query uses the exact table name: `book` (as defined in the `CREATE TABLE` statement in `index.js`).

---

### Exercise 4 — Missing `await` on Async Database Operation

**Error Description:**
No immediate crash — instead, the response returns `undefined` or an empty result even though data exists in the database.

**Why it occurs:**
The Promise-wrapped database functions (`dbGet`, `dbAll`, `dbRun`) are asynchronous. If `await` is omitted, the variable receives a **pending Promise** object instead of the resolved result:
```js
// Wrong — missing await, 'book' is a Promise object, not the data
const book = dbGet('SELECT * FROM book WHERE id = ?', [bookId]);
res.json(book); // sends {}  or  [object Promise]

// Correct
const book = await dbGet('SELECT * FROM book WHERE id = ?', [bookId]);
res.json(book); // sends the actual book record
```

**How to identify it:**
The API response contains `{}` or no data even when the database has records. The issue disappears once `await` is added.

**Solution:**
Always use `await` before every database helper call inside an `async` function. All route handlers in `index.js` are declared with `async` and all DB calls use `await` to prevent this bug.

---

## 17. Deployment on Render

### How to Deploy

1. Push the project to a **public GitHub repository** named `BDF_Lab_03`.
2. Log in at [render.com](https://render.com).
3. Click **New → Web Service**.
4. Connect your GitHub account and select the `BDF_Lab_03` repository.
5. Configure:
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Click **Create Web Service**.
7. Wait for the build to complete and copy the deployed URL.
8. Update this README with the actual deployed URL below.

### Deployed URL

> ⚠️ **Update this section after deployment.**
>
> Live URL: `https://<your-render-url>.onrender.com`

### ⚠️ SQLite Ephemeral Storage Warning

Render's **free tier** uses **ephemeral storage**. This means:
- The `books.db` file is **not persisted** between deployments or restarts.
- Every time the service restarts, the database is re-created with the 10 seed records.
- Any data added via POST/PUT/DELETE will be **lost on restart**.

**For permanent persistence:** Use Render's paid **Persistent Disk** add-on, or migrate to an external database (e.g., PostgreSQL via Supabase or Railway).

### Render Configuration Notes

- **PORT:** Dynamically read from `process.env.PORT` (Render sets this automatically).
- **Host binding:** Server binds to `0.0.0.0` (required for Render's proxy).
- **`node_modules`** is excluded via `.gitignore`; Render installs dependencies fresh on each deploy.

---

## 18. Postman Testing Evidence (Screenshots)

All screenshots were captured from Postman while testing the locally running API at `http://localhost:3000`.

| # | Test Case                | Screenshot                                   |
|---|--------------------------|----------------------------------------------|
| 1 | GET all books            | ![01](screenshots/01_get_all_books.png)       |
| 2 | GET book by ID           | ![02](screenshots/02_get_book_by_id.png)      |
| 3 | Search (Harry)           | ![03](screenshots/03_search_harry.png)        |
| 4 | Sort price ASC           | ![04](screenshots/04_sort_price_asc.png)      |
| 5 | Sort price DESC          | ![05](screenshots/05_sort_price_desc.png)     |
| 6 | Pagination               | ![06](screenshots/06_pagination.png)          |
| 7 | Price range filter       | ![07](screenshots/07_price_filter.png)        |
| 8 | Combined query params    | ![08](screenshots/08_combined_query.png)      |
| 9 | POST — Create book       | ![09](screenshots/09_post_create.png)         |
| 10 | PUT — Update book       | ![10](screenshots/10_put_update.png)          |
| 11 | DELETE — Delete book    | ![11](screenshots/11_delete.png)              |
| 12 | POST — Missing title    | ![12](screenshots/12_missing_title.png)       |
| 13 | POST — Non-numeric price| ![13](screenshots/13_non_numeric_price.png)   |
| 14 | GET — Book not found    | ![14](screenshots/14_not_found_404.png)       |
| 15 | GET — Invalid order_by  | ![15](screenshots/15_invalid_order_by.png)    |

---

## 19. License

This project is submitted as part of academic coursework at **Aurora Higher Education and Research Academy**.

