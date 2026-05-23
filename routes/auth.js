const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const { sql, poolPromise } = require('../db');

// ── Home → redirect to login ──────────────────────────────────
router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.redirect('/login');
});

// ── LOGIN ─────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { error: null, query: req.query });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const pool   = await poolPromise;
    const result = await pool.request()
      .input('Email',    sql.VarChar(100), email.trim())
      .input('Password', sql.VarChar(255), password)
      .execute('sp_LoginUser');

    const user = result.recordset[0];
    if (!user) {
      return res.render('login', { error: 'Incorrect email or password.', query: {} });
    }

    // if (user.Password !== password) {
    //   return res.render('login', { error: 'Incorrect email or password.', query: {} });
    // }

    req.session.user = {
      UserID:    user.UserID,
      FirstName: user.FirstName,
      LastName:  user.LastName,
      Email:     user.Email
    };
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Server error. Please try again.', query: {} });
  }
});

// ── REGISTER ──────────────────────────────────────────────────
router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('register', { error: null });
});

router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, phone, dob } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return res.render('register', { error: 'All fields are required.' });
  }
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('FirstName', sql.VarChar(50),  firstName.trim())
      .input('LastName',  sql.VarChar(50),  lastName.trim())
      .input('Email',     sql.VarChar(100), email.trim())
      .input('Password',  sql.VarChar(255), password)
      .input('Phone',     sql.VarChar(20),  phone || null)
      .input('DOB',       sql.Date,         dob   || null)
      .execute('sp_RegisterUser');

    res.redirect('/login?registered=1');
  } catch (err) {
    const msg = err.message.includes('Email is already registered')
      ? 'This email is already registered.'
      : 'Registration failed. Please try again.';
    res.render('register', { error: msg });
  }
});

// ── LOGOUT ───────────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
