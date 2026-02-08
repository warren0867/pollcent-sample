const express = require('express');
const { getDb } = require('../db/database');
const { requireLogin } = require('../middleware/auth');
const { checkDailyLimit } = require('../services/reward-calculator');

const router = express.Router();

router.get('/', requireLogin, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  const unusedLottery = db.prepare(
    "SELECT COUNT(*) as count FROM tickets WHERE user_id = ? AND type = 'lottery' AND status = 'unused'"
  ).get(userId).count;

  const unusedRoulette = db.prepare(
    "SELECT COUNT(*) as count FROM tickets WHERE user_id = ? AND type = 'roulette' AND status = 'unused'"
  ).get(userId).count;

  const pendingRewards = db.prepare(
    "SELECT COUNT(*) as count, COALESCE(SUM(reward_amount),0) as total FROM delayed_rewards WHERE user_id = ? AND status = 'pending'"
  ).get(userId);

  const availableRewards = db.prepare(
    "SELECT COUNT(*) as count, COALESCE(SUM(reward_amount),0) as total FROM delayed_rewards WHERE user_id = ? AND status = 'available'"
  ).get(userId);

  const dailyLimit = checkDailyLimit(db, userId);

  const ticketTotal = db.prepare(
    "SELECT COALESCE(SUM(reward_amount),0) as total FROM tickets WHERE user_id = ? AND status = 'used'"
  ).get(userId).total;

  const recentPurchases = db.prepare(
    'SELECT * FROM purchases WHERE user_id = ? ORDER BY created_at DESC LIMIT 5'
  ).all(userId);

  res.render('mypage', {
    user,
    unusedLottery,
    unusedRoulette,
    pendingRewards,
    availableRewards,
    dailyLimit,
    ticketTotal,
    recentPurchases,
  });
});

module.exports = router;
