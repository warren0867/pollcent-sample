require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { getDb } = require('./db/database');
const { setLocals } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// DB 초기화
getDb();

// 지연 보상 상태 자동 업데이트 (pending → available)
function updateDelayedRewardStatus() {
  try {
    const db = getDb();
    db.prepare(`
      UPDATE delayed_rewards SET status = 'available'
      WHERE status = 'pending' AND available_at <= datetime('now')
    `).run();
  } catch (e) {
    console.error('delayed reward update error:', e.message);
  }
}
setInterval(updateDelayedRewardStatus, 60000);
updateDelayedRewardStatus();

// 미들웨어
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 },
}));
app.use(setLocals);

// 라우트
app.use('/auth', require('./routes/auth'));
app.use('/purchase', require('./routes/purchase'));
app.use('/tickets', require('./routes/ticket'));
app.use('/rewards', require('./routes/reward'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/price', require('./routes/price'));

// 메인 페이지
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('index');
});

// 글로벌 에러 핸들러
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('서버 오류가 발생했습니다.');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PricePick 서버 실행: port ${PORT}`);
});
