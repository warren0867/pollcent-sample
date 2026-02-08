const DAILY_LIMIT = 500000; // 50만원

const TIERS = {
  bronze: { min: 10000, max: 20000, unit: 10000, reward: 250 },
  silver: { min: 20010, max: 100000, unit: 20000, reward: 500 },
  gold:   { min: 100010, max: 500000, unit: 100000, reward: 3000 },
};

function getTier(amount) {
  if (amount >= TIERS.gold.min && amount <= TIERS.gold.max) return 'gold';
  if (amount >= TIERS.silver.min && amount <= TIERS.silver.max) return 'silver';
  if (amount >= TIERS.bronze.min && amount <= TIERS.bronze.max) return 'bronze';
  return null;
}

function calculateDelayedReward(amount) {
  const tier = getTier(amount);
  if (!tier) return null;

  const t = TIERS[tier];
  const units = Math.floor(amount / t.unit);
  const rewardAmount = units * t.reward;

  return { tier, rewardAmount };
}

function getLotteryTicketCount(amount) {
  return Math.floor(amount / 10000); // 1만원당 1장
}

function checkDailyLimit(db, userId) {
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare('SELECT total_amount FROM daily_limits WHERE user_id = ? AND date = ?').get(userId, today);
  return {
    used: row ? row.total_amount : 0,
    remaining: DAILY_LIMIT - (row ? row.total_amount : 0),
    limit: DAILY_LIMIT,
  };
}

function updateDailyLimit(db, userId, amount) {
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(`
    INSERT INTO daily_limits (user_id, date, total_amount) VALUES (?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET total_amount = total_amount + ?
  `).run(userId, today, amount, amount);
}

module.exports = { TIERS, DAILY_LIMIT, getTier, calculateDelayedReward, getLotteryTicketCount, checkDailyLimit, updateDailyLimit };
