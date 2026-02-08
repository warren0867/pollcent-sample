const express = require('express');
const axios = require('axios');
const { getDb } = require('../db/database');

const router = express.Router();

// 간편 시작 페이지
router.get('/start', (req, res) => {
  res.render('start', { error: null });
});

// 간편 가입 (닉네임 + 이메일만)
router.post('/start', (req, res) => {
  const { email, nickname } = req.body;
  const db = getDb();

  // 기존 회원이면 바로 로그인
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) {
    req.session.userId = existing.id;
    req.session.user = { id: existing.id, nickname: existing.nickname, loginType: existing.login_type, kakaoLinked: !!existing.kakao_id };
    return res.redirect('/');
  }

  const result = db.prepare(
    'INSERT INTO users (email, nickname, login_type, reward_delay_days) VALUES (?, ?, ?, ?)'
  ).run(email, nickname || '유저', 'email', 30);

  req.session.userId = Number(result.lastInsertRowid);
  req.session.user = { id: Number(result.lastInsertRowid), nickname: nickname || '유저', loginType: 'email', kakaoLinked: false };
  res.redirect('/');
});

// 카카오 연동 (마이페이지에서)
router.get('/kakao/link', (req, res) => {
  if (!req.session.userId) return res.redirect('/auth/start');
  const clientId = process.env.KAKAO_CLIENT_ID;
  const redirectUri = process.env.KAKAO_REDIRECT_URI;
  res.redirect(`https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`);
});

// 카카오 콜백
router.get('/kakao/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const tokenRes = await axios.post('https://kauth.kakao.com/oauth/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID,
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
        code,
      },
    });

    const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
    });

    const kakaoId = String(userRes.data.id);
    const db = getDb();

    if (req.session.userId) {
      // 기존 계정에 카카오 연동
      db.prepare('UPDATE users SET kakao_id = ?, reward_delay_days = 7 WHERE id = ?').run(kakaoId, req.session.userId);
      req.session.user.kakaoLinked = true;
      req.session.user.loginType = 'kakao';
      res.redirect('/mypage?success=카카오 연동 완료! 보상 대기일이 7일로 단축됩니다.');
    } else {
      // 카카오로 바로 시작
      let user = db.prepare('SELECT * FROM users WHERE kakao_id = ?').get(kakaoId);
      if (!user) {
        const nickname = userRes.data.properties?.nickname || '카카오유저';
        const result = db.prepare(
          'INSERT INTO users (kakao_id, nickname, login_type, reward_delay_days) VALUES (?, ?, ?, ?)'
        ).run(kakaoId, nickname, 'kakao', 7);
        user = { id: Number(result.lastInsertRowid), nickname, login_type: 'kakao', kakao_id: kakaoId };
      }
      req.session.userId = user.id;
      req.session.user = { id: user.id, nickname: user.nickname, loginType: 'kakao', kakaoLinked: true };
      res.redirect('/');
    }
  } catch (err) {
    console.error('카카오 연동 실패:', err.message);
    res.redirect('/mypage?error=카카오 연동에 실패했습니다.');
  }
});

// 로그아웃
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
