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

  // 스트릭 데이터
  let streak = db.prepare('SELECT * FROM purchase_streaks WHERE user_id = ?').get(userId);
  if (!streak) {
    streak = { current_streak: 0, longest_streak: 0, last_purchase_date: null };
  }

  // 월간 랭킹 (교환 이력 기준)
  const rankings = db.prepare(`
    SELECT u.id, u.nickname, COALESCE(SUM(e.amount), 0) as total
    FROM exchange_history e
    JOIN users u ON e.user_id = u.id
    WHERE strftime('%Y-%m', e.created_at) = strftime('%Y-%m', 'now')
    GROUP BY e.user_id
    ORDER BY total DESC
    LIMIT 10
  `).all();

  // 내 순위
  const myRankRow = db.prepare(`
    SELECT COUNT(*) + 1 as rank FROM (
      SELECT user_id, SUM(amount) as total
      FROM exchange_history
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      GROUP BY user_id
      HAVING total > COALESCE((
        SELECT SUM(amount) FROM exchange_history
        WHERE user_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      ), 0)
    )
  `).get(userId);

  const myTotal = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM exchange_history
    WHERE user_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
  `).get(userId);

  res.render('mypage', {
    user,
    unusedLottery,
    unusedRoulette,
    pendingRewards,
    availableRewards,
    dailyLimit,
    ticketTotal,
    recentPurchases,
    streak,
    rankings,
    myRank: myRankRow ? myRankRow.rank : 0,
    myTotal: myTotal ? myTotal.total : 0,
  });
});

module.exports = router;
