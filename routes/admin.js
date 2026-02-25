const express = require('express');
const { getDb } = require('../db/database');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(403).send('어드민 기능을 사용하려면 .env에 ADMIN_PASSWORD를 설정하세요.');
  }
  res.render('admin-login', { error: null });
}

router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect('/admin');
  } else {
    res.render('admin-login', { error: '비밀번호가 틀렸습니다.' });
  }
});

router.get('/logout', (req, res) => {
  req.session.isAdmin = false;
  res.redirect('/admin');
});

router.get('/', requireAdmin, (req, res) => {
  const db = getDb();
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
  const todayUsers = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE date(created_at) = date('now')").get();
  const pendingRewards = db.prepare("SELECT COALESCE(SUM(reward_amount), 0) as total FROM delayed_rewards WHERE status = 'pending'").get();
  const exchangedRewards = db.prepare("SELECT COALESCE(SUM(reward_amount), 0) as total FROM delayed_rewards WHERE status = 'exchanged'").get();

  let products = [];
  try { products = db.prepare('SELECT * FROM hotdeals ORDER BY created_at DESC').all(); } catch (e) {}

  const success = req.query.success || null;
  const error = req.query.error || null;

  res.render('admin', {
    stats: {
      userCount: userCount.cnt,
      todayUsers: todayUsers.cnt,
      pendingRewards: pendingRewards.total,
      exchangedRewards: exchangedRewards.total,
    },
    products, success, error,
  });
});

router.post('/products', requireAdmin, (req, res) => {
  const { name, originalPrice, discountPrice, rewardRate, category, imageUrl, coupangUrl } = req.body;
  if (!name || !originalPrice || !discountPrice) {
    return res.redirect('/admin?error=필수 항목을 입력해주세요');
  }
  const db = getDb();
  try {
    db.prepare(`
      INSERT INTO hotdeals (name, original_price, discount_price, reward_rate, category, image_url, coupang_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, originalPrice, discountPrice, rewardRate || 2, category || '일반', imageUrl || '', coupangUrl || '');
    res.redirect('/admin?success=상품이 추가되었습니다');
  } catch (e) {
    res.redirect('/admin?error=상품 추가 실패: ' + e.message);
  }
});

router.post('/products/:id/delete', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.redirect('/admin?error=잘못된 요청');
  const db = getDb();
  try {
    db.prepare('DELETE FROM hotdeals WHERE id = ?').run(id);
    res.redirect('/admin?success=상품이 삭제되었습니다');
  } catch (e) {
    res.redirect('/admin?error=삭제 실패');
  }
});

router.get('/users', requireAdmin, (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT id, email, nickname, login_type, kakao_id, balance, reward_delay_days, created_at
    FROM users ORDER BY created_at DESC LIMIT 100
  `).all();
  res.render('admin-users', { users });
});

module.exports = router;
