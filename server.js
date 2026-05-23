const express       = require('express');
const session       = require('express-session');
const methodOverride = require('method-override');
const path          = require('path');
const authRoutes    = require('./routes/auth');
const dashRoutes    = require('./routes/dashboard');
const bookRoutes    = require('./routes/booking');
const adminRoutes   = require('./routes/admin');
const feedbackRoutes = require('./routes/feedback');
const app = express();
// ── View Engine ─────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// ── Static Files ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
// ── Body Parsing ──────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
// ── Session ───────────────────────────────────────────────────
app.use(session({
  secret: 'travelgo_secret_key_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }   // 24 hours
}));

app.use((req, res, next) => {
  res.locals.user  = req.session.user  || null;
  res.locals.admin = req.session.admin || null;
  // ✅ For USER dashboard sidebar
  res.locals.currentPage = req.path;
  res.locals.pages = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/booking',   label: 'Book Trip', icon: '🎫' },
    { href: '/history',   label: 'History',   icon: '📜' }
  ];
  res.locals.adminPage = req.path;
  res.locals.adminNav = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/admin/users',     label: 'Users',     icon: '👥' },
    { href: '/admin/bookings',  label: 'Bookings',  icon: '🎫' },
    { href: '/admin/reports',   label: 'Reports',   icon: '📈' }
  ];
  next();
});
// ── Routes ────────────────────────────────────────────────────
app.use('/',       authRoutes);
app.use('/dashboard', dashRoutes);
app.use('/booking',   bookRoutes);
app.use('/admin',     adminRoutes);
app.use('/feedback', feedbackRoutes);
// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404');
});
// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀  TravelGo running at http://localhost:${PORT}`);
});