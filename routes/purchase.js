const express = require('express');
const { getDb } = require('../db/database');
const { requireLogin } = require('../middleware/auth');
const { createDeepLink } = require('../services/coupang');
const { calculateDelayedReward, getLotteryTicketCount, checkDailyLimit, updateDailyLimit } = require('../services/reward-calculator');

const router = express.Router();

// 딥링크 생성 (상품 URL → 파트너스 딥링크)
router.post('/deeplink', requireLogin, async (req, res) => {
  const { productUrl } = req.body;
  const deepLink = await createDeepLink(productUrl);

  if (!deepLink) {
    return res.json({ success: false, error: '딥링크 생성 실패' });
  }
  res.json({ success: true, deepLink });
});

// 쿠팡 포스트백 수신 (구매 알림)
router.get('/postback', (req, res) => {
  const { orderId, orderAmount, subId, commission } = req.query;

  if (!orderId || !orderAmount) {
    return res.status(400).send('Bad Request');
  }

  const db = getDb();
  const amount = parseInt(orderAmount, 10);

  // subId에서 userId 추출 (format: pollcent_userId)
  const userId = subId ? parseInt(subId.split('_')[1], 10) : null;
  if (!userId) return res.status(400).send('Invalid subId');

  // 일일 한도 체크
  const limit = checkDailyLimit(db, userId);
  if (limit.remaining <= 0) {
    return res.status(200).send('Daily limit exceeded');
  }

  const effectiveAmount = Math.min(amount, limit.remaining);

  // 구매 기록 저장
  const purchase = db.prepare(`
    INSERT INTO purchases (user_id, coupang_order_id, amount, commission, status, purchased_at)
    VALUES (?, ?, ?, ?, 'pending', datetime('now'))
  `).run(userId, orderId, effectiveAmount, parseInt(commission || 0, 10));

  const purchaseId = purchase.lastInsertRowid;

  // 일일 한도 갱신
  updateDailyLimit(db, userId, effectiveAmount);

  // 복권 티켓 생성 (1만원당 1장)
  const ticketCount = getLotteryTicketCount(effectiveAmount);
  const insertTicket = db.prepare(
    'INSERT INTO tickets (user_id, purchase_id, type, status) VALUES (?, ?, ?, ?)'
  );
  for (let i = 0; i < ticketCount; i++) {
    insertTicket.run(userId, purchaseId, 'lottery', 'unused');
  }

  // 이벤트 룰렛 티켓 1장
  insertTicket.run(userId, purchaseId, 'roulette', 'unused');

  // 지연 보상 생성
  const user = db.prepare('SELECT reward_delay_days FROM users WHERE id = ?').get(userId);
  const delayed = calculateDelayedReward(effectiveAmount);
  if (delayed) {
    const delayDays = user ? user.reward_delay_days : 30;
    db.prepare(`
      INSERT INTO delayed_rewards (user_id, purchase_id, tier, purchase_amount, reward_amount, delay_days, available_at, status)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+' || ? || ' days'), 'pending')
    `).run(userId, purchaseId, delayed.tier, effectiveAmount, delayed.rewardAmount, delayDays, delayDays);
  }

  res.status(200).send('OK');
});

// 테스트용: 수동 구매 시뮬레이션
router.post('/simulate', requireLogin, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;
  const { amount, productName } = req.body;
  const parsedAmount = parseInt(amount, 10);

  if (!parsedAmount || parsedAmount < 1000) {
    return res.redirect('/dashboard?error=최소 1,000원 이상이어야 합니다');
  }

  // 일일 한도 체크
  const limit = checkDailyLimit(db, userId);
  if (limit.remaining <= 0) {
    return res.redirect('/dashboard?error=일일 한도 초과');
  }

  const effectiveAmount = Math.min(parsedAmount, limit.remaining);
  const orderId = 'SIM_' + Date.now();

  // 구매 기록
  const purchase = db.prepare(`
    INSERT INTO purchases (user_id, coupang_order_id, product_name, amount, status, purchased_at)
    VALUES (?, ?, ?, ?, 'confirmed', datetime('now'))
  `).run(userId, orderId, productName || '테스트 상품', effectiveAmount);

  const purchaseId = purchase.lastInsertRowid;
  updateDailyLimit(db, userId, effectiveAmount);

  // 복권 티켓
  const ticketCount = getLotteryTicketCount(effectiveAmount);
  const insertTicket = db.prepare(
    'INSERT INTO tickets (user_id, purchase_id, type, status) VALUES (?, ?, ?, ?)'
  );
  for (let i = 0; i < ticketCount; i++) {
    insertTicket.run(userId, purchaseId, 'lottery', 'unused');
  }

  // 룰렛 티켓
  insertTicket.run(userId, purchaseId, 'roulette', 'unused');

  // 지연 보상
  const user = db.prepare('SELECT reward_delay_days FROM users WHERE id = ?').get(userId);
  const delayed = calculateDelayedReward(effectiveAmount);
  if (delayed) {
    const delayDays = user ? user.reward_delay_days : 30;
    db.prepare(`
      INSERT INTO delayed_rewards (user_id, purchase_id, tier, purchase_amount, reward_amount, delay_days, available_at, status)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+' || ? || ' days'), 'pending')
    `).run(userId, purchaseId, delayed.tier, effectiveAmount, delayed.rewardAmount, delayDays, delayDays);
  }

  res.redirect('/dashboard?success=구매 시뮬레이션 완료! 티켓 ' + (ticketCount + 1) + '장 지급');
});

module.exports = router;
