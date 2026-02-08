const express = require('express');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { getDb } = require('../db/database');

const router = express.Router();

// 로그인 페이지
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// 회원가입 페이지
router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

// 이메일 회원가입
router.post('/register', (req, res) => {
  const { email, password, nickname } = req.body;
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.render('register', { error: '이미 가입된 이메일입니다.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, nickname, login_type, reward_delay_days) VALUES (?, ?, ?, ?, ?)'
  ).run(email, hash, nickname, 'email', 30);

  req.session.userId = result.lastInsertRowid;
  req.session.user = { id: result.lastInsertRowid, nickname, loginType: 'email' };
  res.redirect('/dashboard');
});

// 이메일 로그인
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND login_type = ?').get(email, 'email');
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.render('login', { error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }

  req.session.userId = user.id;
  req.session.user = { id: user.id, nickname: user.nickname, loginType: 'email' };
  res.redirect('/dashboard');
});

// 카카오 로그인 시작
router.get('/kakao', (req, res) => {
  const clientId = process.env.KAKAO_CLIENT_ID;
  const redirectUri = process.env.KAKAO_REDIRECT_URI;
  res.redirect(`https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`);
});

// 카카오 콜백
router.get('/kakao/callback', async (req, res) => {
  try {
    const { code } = req.query;

    // 토큰 발급
    const tokenRes = await axios.post('https://kauth.kakao.com/oauth/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID,
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
        code,
      },
    });

    // 사용자 정보 조회
    const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
    });

    const kakaoId = String(userRes.data.id);
    const nickname = userRes.data.properties?.nickname || '카카오유저';
    const db = getDb();

    let user = db.prepare('SELECT * FROM users WHERE kakao_id = ?').get(kakaoId);
    if (!user) {
      const result = db.prepare(
        'INSERT INTO users (kakao_id, nickname, login_type, reward_delay_days) VALUES (?, ?, ?, ?)'
      ).run(kakaoId, nickname, 'kakao', 7);
      user = { id: result.lastInsertRowid, nickname, login_type: 'kakao' };
    }

    req.session.userId = user.id;
    req.session.user = { id: user.id, nickname: user.nickname, loginType: user.login_type };
    res.redirect('/dashboard');
  } catch (err) {
    console.error('카카오 로그인 실패:', err.message);
    res.render('login', { error: '카카오 로그인에 실패했습니다.' });
  }
});

// 로그아웃
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
