const express = require('express');
const { getDb } = require('../db/database');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireLogin, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;

  const availableRewards = db.prepare(`
    SELECT * FROM delayed_rewards
    WHERE user_id = ? AND status = 'available'
    ORDER BY available_at ASC
  `).all(userId);

  const pendingRewards = db.prepare(`
    SELECT * FROM delayed_rewards
    WHERE user_id = ? AND status = 'pending'
    ORDER BY available_at ASC
  `).all(userId);

  const history = db.prepare(`
    SELECT * FROM exchange_history
    WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 20
  `).all(userId);

  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);
  res.render('exchange', { availableRewards, pendingRewards, history, balance: user.balance });
});

router.post('/exchange/:id', requireLogin, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;

  // ✅ 입력 검증
  const rewardId = parseInt(req.params.id, 10);
  if (isNaN(rewardId)) {
    return res.status(400).json({ success: false, error: '잘못된 요청입니다' });
  }

  const reward = db.prepare(
    "SELECT * FROM delayed_rewards WHERE id = ? AND user_id = ? AND status = 'available'"
  ).get(rewardId, userId);

  if (!reward) {
    return res.json({ success: false, error: '교환할 수 없는 보상입니다' });
  }

  // ✅ 트랜잭션: 중간에 오류 나도 전부 롤백됨
  const doExchange = db.transaction((rewardId, userId, amount) => {
    db.prepare(
      "UPDATE delayed_rewards SET status = 'exchanged', exchanged_at = datetime('now') WHERE id = ?"
    ).run(rewardId);
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, userId);
    db.prepare(
      "INSERT INTO exchange_history (user_id, reward_id, reward_type, amount, exchange_method) VALUES (?, ?, 'delayed', ?, 'cash')"
    ).run(userId, rewardId, amount);
  });

  try {
    doExchange(rewardId, userId, reward.reward_amount);
    res.json({ success: true, amount: reward.reward_amount });
  } catch (e) {
    console.error('exchange error:', e.message);
    res.status(500).json({ success: false, error: '교환 중 오류가 발생했습니다' });
  }
});

router.post('/exchange-all', requireLogin, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;

  const rewards = db.prepare(
    "SELECT * FROM delayed_rewards WHERE user_id = ? AND status = 'available'"
  ).all(userId);

  if (rewards.length === 0) {
    return res.json({ success: true, count: 0, totalAmount: 0 });
  }

  // ✅ 트랜잭션: 전체를 하나로 묶어서 처리
  const doExchangeAll = db.transaction((rewards, userId) => {
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
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(totalAmount, userId);
    return totalAmount;
  });

  try {
    const totalAmount = doExchangeAll(rewards, userId);
    res.json({ success: true, count: rewards.length, totalAmount });
  } catch (e) {
    console.error('exchange-all error:', e.message);
    res.status(500).json({ success: false, error: '전체 교환 중 오류가 발생했습니다' });
  }
});

module.exports = router;
