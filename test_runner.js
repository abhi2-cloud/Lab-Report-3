// ============================================================
// BDF Lab 3 — In-Process Test Runner (no HTTP networking needed)
// test_runner.js
// ============================================================
// Tests the Express app directly in-process using mock-req/res.
// Run with:  node test_runner.js
// ============================================================

'use strict';

// Suppress DB startup logs
const origLog = console.log;
console.log = () => {};
const origError = console.error;
console.error = () => {};

const { app, dbReady } = require('./index.js');

console.log = origLog;
console.error = origError;

// ─── Minimal mock request and response factories ──────────────
function makeReq(method, url, body = null) {
  const parsed = new URL(`http://localhost${url}`);
  const req = {
    method: method.toUpperCase(),
    url,
    path: parsed.pathname,
    query: Object.fromEntries(parsed.searchParams.entries()),
    params: {},
    headers: { 'content-type': 'application/json' },
    body: body || {},
  };
  return req;
}

function makeRes() {
  const res = {
    _status: 200,
    _body: null,
    _ended: false,
    statusCode: 200,
    locals: {},
    status(code) { this._status = code; this.statusCode = code; return this; },
    json(data) { this._body = data; this._ended = true; return this; },
    send(data) { this._body = data; this._ended = true; return this; },
    end() { this._ended = true; return this; },
    setHeader() { return this; },
    getHeader() { return null; },
    removeHeader() { return this; },
    set() { return this; },
    type() { return this; },
  };
  return res;
}

// ─── Dispatch a fake request through the Express app ─────────
function dispatch(method, url, body = null) {
  return new Promise((resolve, reject) => {
    const req = makeReq(method, url, body);
    const res = makeRes();

    // Timeout guard
    const timer = setTimeout(() => reject(new Error('Handler timeout')), 5000);

    // Wrap res.json to resolve
    const origJson = res.json.bind(res);
    res.json = function (data) {
      clearTimeout(timer);
      origJson(data);
      resolve({ status: res._status, body: data });
    };

    // Walk the Express router manually
    app.handle(req, res, (err) => {
      clearTimeout(timer);
      if (err) { reject(err); return; }
      resolve({ status: res._status, body: res._body });
    });
  });
}

// ─── Test helpers ─────────────────────────────────────────────
let passed = 0;
let failed = 0;
let createdBookId = null;

function assert(name, condition, detail = '') {
  if (condition) {
    origLog(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    origLog(`  ❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

// ─── Tests ────────────────────────────────────────────────────
async function runTests() {
  origLog('\n════════════════════════════════════════════════');
  origLog('  BDF Lab 3 — Automated Test Runner');
  origLog('════════════════════════════════════════════════\n');

  // ── 1. GET all books ────────────────────────────────────────
  origLog('▶  Test 1: GET /books — All books');
  try {
    const r = await dispatch('GET', '/books');
    assert('Status is 200', r.status === 200, `Got ${r.status}`);
    assert('Response is array', Array.isArray(r.body));
    assert('At least 1 book', Array.isArray(r.body) && r.body.length >= 1, `Got ${Array.isArray(r.body) ? r.body.length : 'non-array'}`);
  } catch (e) { assert('GET /books', false, e.message); }

  // ── 2. GET by ID ─────────────────────────────────────────────
  origLog('\n▶  Test 2: GET /books/1');
  try {
    const r = await dispatch('GET', '/books/1');
    assert('Status is 200', r.status === 200, `Got ${r.status}`);
    assert('Returns object', typeof r.body === 'object' && !Array.isArray(r.body));
    assert('Has id field', r.body && r.body.id !== undefined);
  } catch (e) { assert('GET /books/1', false, e.message); }

  // ── 3. Search ────────────────────────────────────────────────
  origLog('\n▶  Test 3: GET /books?search_q=Harry');
  try {
    const r = await dispatch('GET', '/books?search_q=Harry');
    assert('Status is 200', r.status === 200, `Got ${r.status}`);
    assert('Array response', Array.isArray(r.body));
    if (Array.isArray(r.body) && r.body.length > 0) {
      const allHarry = r.body.every(b => b.title.toLowerCase().includes('harry'));
      assert('All titles contain "harry"', allHarry);
    } else {
      assert('Has results', false, 'No books matched search_q=Harry');
    }
  } catch (e) { assert('Search', false, e.message); }

  // ── 4. Sort ASC ─────────────────────────────────────────────
  origLog('\n▶  Test 4: GET /books?order_by=price&order=ASC');
  try {
    const r = await dispatch('GET', '/books?order_by=price&order=ASC');
    assert('Status is 200', r.status === 200, `Got ${r.status}`);
    if (Array.isArray(r.body) && r.body.length > 1) {
      let sorted = true;
      for (let i = 1; i < r.body.length; i++) if (r.body[i].price < r.body[i-1].price) { sorted = false; break; }
      assert('Prices ascending', sorted, r.body.map(b => b.price).join(', '));
    } else { assert('Has results', Array.isArray(r.body) && r.body.length >= 1); }
  } catch (e) { assert('Sort ASC', false, e.message); }

  // ── 5. Sort DESC ────────────────────────────────────────────
  origLog('\n▶  Test 5: GET /books?order_by=price&order=DESC');
  try {
    const r = await dispatch('GET', '/books?order_by=price&order=DESC');
    assert('Status is 200', r.status === 200, `Got ${r.status}`);
    if (Array.isArray(r.body) && r.body.length > 1) {
      let sorted = true;
      for (let i = 1; i < r.body.length; i++) if (r.body[i].price > r.body[i-1].price) { sorted = false; break; }
      assert('Prices descending', sorted, r.body.map(b => b.price).join(', '));
    } else { assert('Has results', Array.isArray(r.body) && r.body.length >= 1); }
  } catch (e) { assert('Sort DESC', false, e.message); }

  // ── 6. Pagination ────────────────────────────────────────────
  origLog('\n▶  Test 6: GET /books?limit=5&offset=5');
  try {
    const r = await dispatch('GET', '/books?limit=5&offset=5');
    assert('Status is 200', r.status === 200, `Got ${r.status}`);
    assert('Returns ≤5 records', Array.isArray(r.body) && r.body.length <= 5, `Got ${Array.isArray(r.body) ? r.body.length : 'non-array'}`);
  } catch (e) { assert('Pagination', false, e.message); }

  // ── 7. Price filter ──────────────────────────────────────────
  origLog('\n▶  Test 7: GET /books?min_price=200&max_price=400');
  try {
    const r = await dispatch('GET', '/books?min_price=200&max_price=400');
    assert('Status is 200', r.status === 200, `Got ${r.status}`);
    if (Array.isArray(r.body)) {
      const inRange = r.body.every(b => b.price >= 200 && b.price <= 400);
      assert('All in [200,400]', inRange, r.body.map(b => b.price).join(', '));
    }
  } catch (e) { assert('Price filter', false, e.message); }

  // ── 8. Combined ──────────────────────────────────────────────
  origLog('\n▶  Test 8: Combined query params');
  try {
    const r = await dispatch('GET', '/books?search_q=Harry&order_by=price&order=ASC&limit=5&offset=0&min_price=300&max_price=500');
    assert('Status is 200', r.status === 200, `Got ${r.status}`);
    assert('Array response', Array.isArray(r.body));
  } catch (e) { assert('Combined', false, e.message); }

  // ── 9. POST valid ────────────────────────────────────────────
  origLog('\n▶  Test 9: POST /books — Create book');
  try {
    const r = await dispatch('POST', '/books', { title: 'Test Book Runner', author: 'Test Author', price: 299, pages: 200 });
    assert('Status is 201', r.status === 201, `Got ${r.status}`);
    assert('Has id', r.body && r.body.id !== undefined);
    assert('Title matches', r.body && r.body.title === 'Test Book Runner');
    createdBookId = r.body && r.body.id;
    origLog(`     → Created book ID: ${createdBookId}`);
  } catch (e) { assert('POST valid', false, e.message); }

  // ── 10. PUT update ───────────────────────────────────────────
  origLog(`\n▶  Test 10: PUT /books/${createdBookId} — Update`);
  if (createdBookId) {
    try {
      const r = await dispatch('PUT', `/books/${createdBookId}`, { title: 'Updated Book Runner', author: 'Test Author', price: 399, pages: 220 });
      assert('Status is 200', r.status === 200, `Got ${r.status}`);
      assert('Title updated', r.body && r.body.title === 'Updated Book Runner');
      assert('Price updated', r.body && r.body.price === 399);
    } catch (e) { assert('PUT update', false, e.message); }
  } else { assert('PUT skipped', false, 'No createdBookId'); }

  // ── 11. DELETE ───────────────────────────────────────────────
  origLog(`\n▶  Test 11: DELETE /books/${createdBookId}`);
  if (createdBookId) {
    try {
      const r = await dispatch('DELETE', `/books/${createdBookId}`);
      assert('Status is 200', r.status === 200, `Got ${r.status}`);
      assert('Has message', r.body && typeof r.body.message === 'string');
    } catch (e) { assert('DELETE', false, e.message); }
  } else { assert('DELETE skipped', false, 'No createdBookId'); }

  // ── 12. Missing title ────────────────────────────────────────
  origLog('\n▶  Test 12: POST — Missing title');
  try {
    const r = await dispatch('POST', '/books', { author: 'Test', price: 100, pages: 50 });
    assert('Status is 400', r.status === 400, `Got ${r.status}`);
    assert('Has message', r.body && typeof r.body.message === 'string');
  } catch (e) { assert('Missing title', false, e.message); }

  // ── 13. Non-numeric price ─────────────────────────────────────
  origLog('\n▶  Test 13: POST — Non-numeric price');
  try {
    const r = await dispatch('POST', '/books', { title: 'Book', author: 'Author', price: 'abc', pages: 100 });
    assert('Status is 400', r.status === 400, `Got ${r.status}`);
    assert('Message mentions price', r.body && r.body.message && r.body.message.toLowerCase().includes('price'));
  } catch (e) { assert('Non-numeric price', false, e.message); }

  // ── 14. Book not found ───────────────────────────────────────
  origLog('\n▶  Test 14: GET /books/999 — Not found');
  try {
    const r = await dispatch('GET', '/books/999');
    assert('Status is 404', r.status === 404, `Got ${r.status}`);
    assert('Has message', r.body && typeof r.body.message === 'string');
  } catch (e) { assert('Not found', false, e.message); }

  // ── 15. Invalid order_by ─────────────────────────────────────
  origLog('\n▶  Test 15: GET — Invalid order_by');
  try {
    const r = await dispatch('GET', '/books?order_by=invalid');
    assert('Status is 400', r.status === 400, `Got ${r.status}`);
    assert('Has message', r.body && typeof r.body.message === 'string');
  } catch (e) { assert('Invalid order_by', false, e.message); }

  // ── 16. Invalid order direction ──────────────────────────────
  origLog('\n▶  Test 16: GET — Invalid order direction');
  try {
    const r = await dispatch('GET', '/books?order=RANDOM');
    assert('Status is 400', r.status === 400, `Got ${r.status}`);
  } catch (e) { assert('Invalid order', false, e.message); }

  // ── 17. Invalid limit ────────────────────────────────────────
  origLog('\n▶  Test 17: GET — Invalid limit');
  try {
    const r = await dispatch('GET', '/books?limit=abc');
    assert('Status is 400', r.status === 400, `Got ${r.status}`);
  } catch (e) { assert('Invalid limit', false, e.message); }

  // ── 18. Invalid offset ───────────────────────────────────────
  origLog('\n▶  Test 18: GET — Invalid offset');
  try {
    const r = await dispatch('GET', '/books?offset=-5');
    assert('Status is 400', r.status === 400, `Got ${r.status}`);
  } catch (e) { assert('Invalid offset', false, e.message); }

  // ── 19. Invalid price range ──────────────────────────────────
  origLog('\n▶  Test 19: GET — min_price > max_price');
  try {
    const r = await dispatch('GET', '/books?min_price=500&max_price=200');
    assert('Status is 400', r.status === 400, `Got ${r.status}`);
    assert('Has message', r.body && typeof r.body.message === 'string');
  } catch (e) { assert('Invalid range', false, e.message); }

  // ── 20. Missing author ───────────────────────────────────────
  origLog('\n▶  Test 20: POST — Missing author');
  try {
    const r = await dispatch('POST', '/books', { title: 'Title Only', price: 100, pages: 50 });
    assert('Status is 400', r.status === 400, `Got ${r.status}`);
    assert('Has message', r.body && typeof r.body.message === 'string');
  } catch (e) { assert('Missing author', false, e.message); }

  // ── 21. Invalid book ID ──────────────────────────────────────
  origLog('\n▶  Test 21: GET /books/abc — Invalid ID');
  try {
    const r = await dispatch('GET', '/books/abc');
    assert('Status is 400', r.status === 400, `Got ${r.status}`);
  } catch (e) { assert('Invalid ID', false, e.message); }

  // ─── Summary ─────────────────────────────────────────────────
  const total = passed + failed;
  origLog('\n════════════════════════════════════════════════');
  origLog(`  Results: ${passed} / ${total} tests passed`);
  if (failed > 0) origLog(`  ⚠️  ${failed} test(s) FAILED`);
  else origLog('  🎉 All tests PASSED!');
  origLog('════════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

// ─── Wait for DB then run ─────────────────────────────────────
dbReady
  .then(runTests)
  .catch(e => { origLog('DB init failed:', e.message); process.exit(1); });
