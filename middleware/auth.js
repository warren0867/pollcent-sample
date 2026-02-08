function requireLogin(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect('/auth/login');
}

function setLocals(req, res, next) {
  res.locals.user = req.session ? req.session.user : null;
  next();
}

module.exports = { requireLogin, setLocals };
