const express = require('express');
const { getDb } = require('../db/database');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// 교환소 페이지
router.get('/', requireLogin, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;

  // 교환 가능한 지연 보상
  const availableRewards = db.prepare(`
    SELECT * FROM delayed_rewards
    WHERE user_id = ? AND status = 'available'
    ORDER BY available_at ASC
  `).all(userId);

  // 대기중인 지연 보상
  const pendingRewards = db.prepare(`
    SELECT * FROM delayed_rewards
    WHERE user_id = ? AND status = 'pending'
    ORDER BY available_at ASC
  `).all(userId);

  // 교환 이력
  const history = db.prepare(`
    SELECT * FROM exchange_history
    WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 20
  `).all(userId);

  // 잔액
  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);

  res.render('exchange', { availableRewards, pendingRewards, history, balance: user.balance });
});

// 지연 보상 교환
router.post('/exchange/:id', requireLogin, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;
  const rewardId = req.params.id;

  const reward = db.prepare(
    "SELECT * FROM delayed_rewards WHERE id = ? AND user_id = ? AND status = 'available'"
  ).get(rewardId, userId);

  if (!reward) {
    return res.json({ success: false, error: '교환할 수 없는 보상입니다' });
  }

  // 보상 상태 업데이트
  db.prepare(
    "UPDATE delayed_rewards SET status = 'exchanged', exchanged_at = datetime('now') WHERE id = ?"
  ).run(rewardId);

  // 잔액에 추가
  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(reward.reward_amount, userId);

  // 교환 이력
  db.prepare(
    "INSERT INTO exchange_history (user_id, reward_id, reward_type, amount, exchange_method) VALUES (?, ?, 'delayed', ?, 'cash')"
  ).run(userId, rewardId, reward.reward_amount);

  res.json({ success: true, amount: reward.reward_amount });
});

// 전체 교환
router.post('/exchange-all', requireLogin, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;

  const rewards = db.prepare(
    "SELECT * FROM delayed_rewards WHERE user_id = ? AND status = 'available'"
  ).all(userId);

  let totalAmount = 0;
  for (const reward of rewards) {
    db.prepare(
      "UPDATE delayed_rewards SET status = 'exchanged', exchanged_at = datetime('now') WHERE id = ?"
    ).run(reward.id);

    db.prepare(
      "INSERT INTO exchange_history (user_id, reward_id, reward_type, amount, exchange_method) VALUES (?, ?, 'delayed', ?, 'cash')"
    ).run(userId, reward.id, reward.reward_amount);

    totalAmount += reward.reward_amount;
  }

  if (totalAmount > 0) {
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(totalAmount, userId);
  }

  res.json({ success: true, count: rewards.length, totalAmount });
});

module.exports = router;
