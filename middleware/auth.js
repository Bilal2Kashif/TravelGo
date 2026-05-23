// middleware/auth.js  –  session guards

function requireUser(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session.admin) return next();
  res.redirect('/admin/login');
}

module.exports = { requireUser, requireAdmin };
