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
  const db = getDb();
  db.prepare(`
    UPDATE delayed_rewards SET status = 'available'
    WHERE status = 'pending' AND available_at <= datetime('now')
  `).run();
}
setInterval(updateDelayedRewardStatus, 60000); // 1분마다
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
  cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24시간
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

app.listen(PORT, () => {
  console.log(`Pollcent 서버 실행: http://localhost:${PORT}`);
});
