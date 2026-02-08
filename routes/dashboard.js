const express = require('express');
const { getDb } = require('../db/database');
const { requireLogin } = require('../middleware/auth');
const { checkDailyLimit } = require('../services/reward-calculator');

const router = express.Router();

router.get('/', requireLogin, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  // 티켓 현황
  const unusedLottery = db.prepare(
    "SELECT COUNT(*) as count FROM tickets WHERE user_id = ? AND type = 'lottery' AND status = 'unused'"
  ).get(userId).count;

  const unusedRoulette = db.prepare(
    "SELECT COUNT(*) as count FROM tickets WHERE user_id = ? AND type = 'roulette' AND status = 'unused'"
  ).get(userId).count;

  // 지연 보상 현황
  const pendingRewards = db.prepare(
    "SELECT COUNT(*) as count, COALESCE(SUM(reward_amount),0) as total FROM delayed_rewards WHERE user_id = ? AND status = 'pending'"
  ).get(userId);

  const availableRewards = db.prepare(
    "SELECT COUNT(*) as count, COALESCE(SUM(reward_amount),0) as total FROM delayed_rewards WHERE user_id = ? AND status = 'available'"
  ).get(userId);

  // 최근 구매
  const recentPurchases = db.prepare(
    'SELECT * FROM purchases WHERE user_id = ? ORDER BY created_at DESC LIMIT 5'
  ).all(userId);

  // 일일 한도
  const dailyLimit = checkDailyLimit(db, userId);

  // 총 당첨금 (티켓)
  const ticketTotal = db.prepare(
    "SELECT COALESCE(SUM(reward_amount),0) as total FROM tickets WHERE user_id = ? AND status = 'used'"
  ).get(userId).total;

  res.render('dashboard', {
    user,
    unusedLottery,
    unusedRoulette,
    pendingRewards,
    availableRewards,
    recentPurchases,
    dailyLimit,
    ticketTotal,
  });
});

module.exports = router;
