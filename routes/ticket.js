const express = require('express');
const { getDb } = require('../db/database');
const { requireLogin } = require('../middleware/auth');
const { playLottery, playRoulette, ROULETTE_TABLE } = require('../services/ticket-game');

const router = express.Router();

// 티켓 목록 페이지
router.get('/', requireLogin, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;

  const lotteryTickets = db.prepare(
    "SELECT * FROM tickets WHERE user_id = ? AND type = 'lottery' AND status = 'unused' ORDER BY created_at DESC"
  ).all(userId);

  const rouletteTickets = db.prepare(
    "SELECT * FROM tickets WHERE user_id = ? AND type = 'roulette' AND status = 'unused' ORDER BY created_at DESC"
  ).all(userId);

  const usedTickets = db.prepare(
    "SELECT * FROM tickets WHERE user_id = ? AND status = 'used' ORDER BY used_at DESC LIMIT 20"
  ).all(userId);

  res.render('tickets', { lotteryTickets, rouletteTickets, usedTickets, rouletteTable: ROULETTE_TABLE });
});

// 복권 사용
router.post('/lottery/:id', requireLogin, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;
  const ticketId = req.params.id;

  const ticket = db.prepare(
    "SELECT * FROM tickets WHERE id = ? AND user_id = ? AND type = 'lottery' AND status = 'unused'"
  ).get(ticketId, userId);

  if (!ticket) {
    return res.json({ success: false, error: '사용할 수 없는 티켓입니다' });
  }

  const result = playLottery();

  db.prepare(
    "UPDATE tickets SET status = 'used', reward_amount = ?, used_at = datetime('now') WHERE id = ?"
  ).run(result.amount, ticketId);

  // 당첨금 잔액에 추가
  if (result.amount > 0) {
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(result.amount, userId);
  }

  res.json({ success: true, result: { amount: result.amount, label: result.label } });
});

// 룰렛 사용
router.post('/roulette/:id', requireLogin, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;
  const ticketId = req.params.id;

  const ticket = db.prepare(
    "SELECT * FROM tickets WHERE id = ? AND user_id = ? AND type = 'roulette' AND status = 'unused'"
  ).get(ticketId, userId);

  if (!ticket) {
    return res.json({ success: false, error: '사용할 수 없는 티켓입니다' });
  }

  const result = playRoulette();

  db.prepare(
    "UPDATE tickets SET status = 'used', reward_amount = ?, used_at = datetime('now') WHERE id = ?"
  ).run(result.amount, ticketId);

  // 당첨금 잔액에 추가
  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(result.amount, userId);

  res.json({ success: true, result: { amount: result.amount, label: result.label, color: result.color } });
});

// 복권 전체 사용
router.post('/lottery-all', requireLogin, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;

  const tickets = db.prepare(
    "SELECT * FROM tickets WHERE user_id = ? AND type = 'lottery' AND status = 'unused'"
  ).all(userId);

  let totalReward = 0;
  const results = [];

  for (const ticket of tickets) {
    const result = playLottery();
    db.prepare(
      "UPDATE tickets SET status = 'used', reward_amount = ?, used_at = datetime('now') WHERE id = ?"
    ).run(result.amount, ticket.id);
    totalReward += result.amount;
    results.push({ amount: result.amount, label: result.label });
  }

  if (totalReward > 0) {
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(totalReward, userId);
  }

  res.json({ success: true, count: tickets.length, totalReward, results });
});

module.exports = router;
