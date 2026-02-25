require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDb, getDb } = require('./db/database');
const { setLocals } = require('./middleware/auth');
const { getHotdeals, getHotdealById } = require('./services/hotdeals');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ✅ 수정: public 폴더만 정적 제공 (기존엔 루트 전체가 열려있어서 .env 등이 노출됨)
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
}));
app.use(setLocals);

// ✅ Rate Limiting (어뷰징 방지)
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});
const rewardLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: '교환 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: '요청이 너무 많습니다. 15분 후 다시 시도해주세요.',
});

app.use(generalLimiter);

app.use('/auth', authLimiter, require('./routes/auth'));
app.use('/purchase', require('./routes/purchase'));
app.use('/tickets', require('./routes/ticket'));
app.use('/rewards', rewardLimiter, require('./routes/reward'));
app.use('/price', require('./routes/price'));
app.use('/mypage', require('./routes/mypage'));
app.use('/admin', require('./routes/admin'));

app.get('/', (req, res) => {
  res.render('index', { products: getHotdeals() });
});

app.get('/api/products', (req, res) => {
  res.json(getHotdeals());
});

app.get('/product/:id', (req, res) => {
  const idNum = parseInt(req.params.id, 10);
  if (isNaN(idNum)) return res.redirect('/');
  const product = getHotdealById(idNum);
  if (!product) return res.redirect('/');
  if (!req.session.userId) return res.redirect('/auth/start');
  res.render('product', { product });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('서버 오류가 발생했습니다.');
});

initDb().then(() => {
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PricePick 서버 실행: port ${PORT}`);
  });
}).catch(err => {
  console.error('DB 초기화 실패:', err);
  process.exit(1);
});
