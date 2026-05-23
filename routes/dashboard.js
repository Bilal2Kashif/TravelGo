const express = require('express');
const router  = express.Router();
const { sql, poolPromise } = require('../db');
const { requireUser } = require('../middleware/auth');

// ── DASHBOARD HOME ────────────────────────────────────────────
router.get('/', requireUser, async (req, res) => {
  try {
    const pool  = await poolPromise;
    await pool.request().execute('sp_MarkCompletedTrips');
    const stats = await pool.request()
      .input('UserID', sql.Int, req.session.user.UserID)
      .execute('sp_GetUserDashboard');

    const upcoming = await pool.request()
      .input('UserID', sql.Int, req.session.user.UserID)
      .execute('sp_GetUserUpcomingBookings');

    res.render('dashboard', {
      stats:    stats.recordset[0],
      upcoming: upcoming.recordset
    });
  } catch (err) {
    console.error(err);
    res.render('dashboard', { stats: {}, upcoming: [] });
  }
});

// ── BOOKING HISTORY ───────────────────────────────────────────
router.get('/history', requireUser, async (req, res) => {
  try {
    const pool   = await poolPromise;
    const result = await pool.request()
      .input('UserID', sql.Int, req.session.user.UserID)
      .execute('sp_GetUserBookingHistory');

    res.render('history', { bookings: result.recordset });
  } catch (err) {
    console.error(err);
    res.render('history', { bookings: [] });
  }
});

// ── CANCEL BOOKING ────────────────────────────────────────────
router.post('/cancel', requireUser, async (req, res) => {
  const { bookingId } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('BookingID', sql.Int, parseInt(bookingId))
      .input('UserID',    sql.Int, req.session.user.UserID)
      .execute('sp_CancelBooking');

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
