const express = require('express');
const router  = express.Router();
const { sql, poolPromise } = require('../db');
const { requireAdmin } = require('../middleware/auth');

// Hardcoded admin credentials (as required)
const ADMIN_EMAIL    = 'Admin@TravelGo.com';
const ADMIN_PASSWORD = 'TravelGo_Admin';

// ── ADMIN LOGIN ───────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    req.session.admin = { email: ADMIN_EMAIL, name: 'Admin' };
    return res.redirect('/admin');
  }
  res.render('admin/login', { error: 'Invalid admin credentials.' });
});

router.get('/logout', (req, res) => {
  req.session.admin = null;
  res.redirect('/admin/login');
});

// ── ADMIN DASHBOARD ───────────────────────────────────────────
router.get('/', requireAdmin, async (req, res) => {
  try {
    const pool   = await poolPromise;
    const stats  = await pool.request().execute('sp_AdminGetStats');
    const routes = await pool.request().query('select top 5 * from vw_PopularRoutes order by TotalBookings desc');
    const rev    = await pool.request().query('select * from vw_RevenueByTransportType');
    res.render('admin/dashboard', {
      stats:    stats.recordset[0],
      routes:   routes.recordset,
      revenue:  rev.recordset
    });
  } catch (err) {
    console.error(err);
    res.render('admin/dashboard', { stats: {}, routes: [], revenue: [] });
  }
});

// ── ALL USERS ─────────────────────────────────────────────────
router.get('/users', requireAdmin, async (req, res) => {
  const pool   = await poolPromise;
  const result = await pool.request().query('select * from vw_UserSpendingSummary order by UserID');
  res.render('admin/users', { users: result.recordset });
});

router.post('/users/delete', requireAdmin, async (req, res) => {
  const { userId } = req.body;
  try {
    const pool = await poolPromise;

    await pool.request()
      .input('UserID', sql.Int, parseInt(userId))
      .query(`
        update [USER]
        set Email    = 'deleted_' + cast(UserID as varchar) + '@removed.com',
            Password = 'DELETED',
            Phone    = null
        where UserID = @UserID
      `);

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ── ALL BOOKINGS ──────────────────────────────────────────────
router.get('/bookings', requireAdmin, async (req, res) => {
  const pool   = await poolPromise;
  const result = await pool.request().query('select * from vw_BookingDetails order by BookingDate desc');
res.render('admin/bookings', { bookings: result.recordset });
});

// ── TRIPS ─────────────────────────────────────────────────────
router.get('/trips', requireAdmin, async (req, res) => {
  const pool      = await poolPromise;
  const trips     = await pool.request().query('select * from vw_TripDetails order by TripDate desc');
  const transport = await pool.request().query('select * from TRANSPORT order by Type');
  const locations = await pool.request().query('select * from LOCATION order by CityName');
  res.render('admin/trips', {
    trips:     trips.recordset,
    transport: transport.recordset,
    locations: locations.recordset,
    error:     null
  });
});

router.post('/trips/add', requireAdmin, async (req, res) => {
  const { departureTime, tripDate, price, transportId, departsFrom, arrivesAt } = req.body;
  try {
    const pool = await poolPromise;

    async function getOrCreateCity(cityName) {
      const city = cityName.trim();
      const existing = await pool.request()
        .input('CityName', sql.VarChar(100), city)
        .query('select LocationID from LOCATION where CityName = @CityName');
      if (existing.recordset.length > 0) {
        return existing.recordset[0].LocationID;
      }
      const inserted = await pool.request()
        .input('CityName', sql.VarChar(100), city)
        .query('insert into LOCATION (CityName) values (@CityName); select scope_identity() as LocationID');
      return inserted.recordset[0].LocationID;
    }

    const fromID = await getOrCreateCity(departsFrom);
    const toID   = await getOrCreateCity(arrivesAt);

    await pool.request()
      .input('DepartureTime', sql.VarChar(8),   departureTime)
      .input('TripDate',      sql.Date,          tripDate)
      .input('Price',         sql.Decimal(10,2), parseFloat(price))
      .input('TransportID',   sql.Int,           parseInt(transportId))
      .input('DepartsFrom',   sql.Int,           fromID)
      .input('ArrivesAt',     sql.Int,           toID)
      .execute('sp_AdminAddTrip');

    res.redirect('/admin/trips?success=1');
  } catch (err) {
    const pool      = await poolPromise;
    const trips     = await pool.request().query('select * from vw_TripDetails order by TripDate desc');
    const transport = await pool.request().query('select * from TRANSPORT order by Type');
    const locations = await pool.request().query('select * from LOCATION order by CityName');
    res.render('admin/trips', {
      trips:     trips.recordset,
      transport: transport.recordset,
      locations: locations.recordset,
      error:     err.message
    });
  }
});

// ── VEHICLES ──────────────────────────────────────────────────
router.get('/vehicles', requireAdmin, async (req, res) => {
  const pool   = await poolPromise;
  const result = await pool.request().query('select * from TRANSPORT order by Type, TransportName');
  res.render('admin/vehicles', { vehicles: result.recordset, error: null });
});

router.post('/vehicles/add', requireAdmin, async (req, res) => {
  const { transportName, type, capacity } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('TransportName', sql.VarChar(100), transportName.trim())
      .input('Type',          sql.VarChar(10),  type)
      .input('Capacity',      sql.Int,          parseInt(capacity))
      .execute('sp_AdminAddTransport');
    res.redirect('/admin/vehicles?success=1');
  } catch (err) {
    const pool   = await poolPromise;
    const result = await pool.request().query('select * from TRANSPORT order by Type, TransportName');
    res.render('admin/vehicles', { vehicles: result.recordset, error: err.message });
  }
});

// ── FEEDBACKS ─────────────────────────────────────────────────
router.get('/feedbacks', requireAdmin, async (req, res) => {
  const pool = await poolPromise;

  const feedbacks = await pool.request().query('select * from vw_TripFeedbackSummary order by TripDate desc');

  const summary = await pool.request().query(`
    select
      count(*)                                              as TotalReviews,
      round(avg(cast(Rating as decimal(3,1))), 1)          as AvgRating,
      sum(case when Rating = 5 then 1 else 0 end)          as FiveStars,
      sum(case when Rating = 1 then 1 else 0 end)          as OneStar
    from FEEDBACKS
  `);

  res.render('admin/feedbacks', {
    feedbacks: feedbacks.recordset,
    summary:   summary.recordset[0] || {}
  });
});

module.exports = router;
