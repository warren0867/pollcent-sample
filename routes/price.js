const express = require('express');
const { getDb } = require('../db/database');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// 가격 추적 목록
router.get('/', requireLogin, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;

  const tracks = db.prepare(
    'SELECT * FROM price_tracks WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);

  // 각 상품의 최저가/최고가 계산
  for (const t of tracks) {
    const stats = db.prepare(
      'SELECT MIN(price) as min_price, MAX(price) as max_price, COUNT(*) as count FROM price_history WHERE track_id = ?'
    ).get(t.id);
    t.minPrice = stats.min_price || t.current_price;
    t.maxPrice = stats.max_price || t.current_price;
    t.historyCount = stats.count;
    t.diff = t.current_price - t.target_price;
  }

  res.render('price', { tracks });
});

// 상품 추가
router.post('/add', requireLogin, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;
  const { productName, productUrl, currentPrice, targetPrice } = req.body;

  const result = db.prepare(
    'INSERT INTO price_tracks (user_id, product_name, product_url, current_price, target_price) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, productName, productUrl || '', parseInt(currentPrice, 10), parseInt(targetPrice, 10));

  const trackId = result.lastInsertRowid;

  // 더미 가격 히스토리 생성 (30일치)
  const basePrice = parseInt(currentPrice, 10);
  const insert = db.prepare('INSERT INTO price_history (track_id, price, recorded_at) VALUES (?, ?, ?)');
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    // ±15% 랜덤 변동
    const variance = basePrice * (Math.random() * 0.3 - 0.15);
    const price = Math.round(basePrice + variance);
    insert.run(trackId, price, date.toISOString());
  }

  res.redirect('/price');
});

// 상품 가격 히스토리 (차트용 JSON)
router.get('/history/:id', requireLogin, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;
  const trackId = req.params.id;

  const track = db.prepare(
    'SELECT * FROM price_tracks WHERE id = ? AND user_id = ?'
  ).get(trackId, userId);

  if (!track) return res.json({ success: false });

  const history = db.prepare(
    'SELECT price, recorded_at FROM price_history WHERE track_id = ? ORDER BY recorded_at ASC'
  ).all(trackId);

  res.json({
    success: true,
    product: track,
    history: history.map(h => ({
      date: h.recorded_at.slice(0, 10),
      price: h.price,
    })),
  });
});

// 삭제
router.post('/delete/:id', requireLogin, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;
  db.prepare('DELETE FROM price_history WHERE track_id IN (SELECT id FROM price_tracks WHERE id = ? AND user_id = ?)').run(req.params.id, userId);
  db.prepare('DELETE FROM price_tracks WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.redirect('/price');
});

module.exports = router;
