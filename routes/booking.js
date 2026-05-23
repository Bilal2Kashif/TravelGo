const express = require('express');
const router  = express.Router();
const { sql, poolPromise } = require('../db');
const { requireUser } = require('../middleware/auth');

// ── BOOKING SEARCH PAGE ───────────────────────────────────────
router.get('/', requireUser, async (req, res) => {
  try {
    const pool   = await poolPromise;
    const cities = await pool.request()
      .query('select CityName from LOCATION order by CityName');

    res.render('booking', {
      cities:  cities.recordset.map(r => r.CityName),
      trips:   [],
      error:   null,
      search:  null
    });
  } catch (err) {
    res.render('booking', { cities: [], trips: [], error: err.message, search: null });
  }
});

// ── SEARCH TRIPS ──────────────────────────────────────────────
router.post('/search', requireUser, async (req, res) => {
  const { fromCity, toCity, tripDate, transportType } = req.body;
  try {
    const pool   = await poolPromise;
    const cities = await pool.request()
      .query('select CityName from LOCATION order by CityName');

    const result = await pool.request()
      .input('FromCity',       sql.VarChar(100), fromCity)
      .input('ToCity',         sql.VarChar(100), toCity)
      .input('TripDate',       sql.Date,         tripDate)
      .input('TransportType',  sql.VarChar(10),  transportType || null)
      .execute('sp_SearchTrips');

    res.render('booking', {
      cities:  cities.recordset.map(r => r.CityName),
      trips:   result.recordset,
      error:   null,
      search:  { fromCity, toCity, tripDate, transportType }
    });
  } catch (err) {
    res.render('booking', { cities: [], trips: [], error: err.message, search: null });
  }
});

// ── GET SEAT INFO FOR A TRIP (AJAX) ──────────────────────────
router.get('/seats/:tripId', requireUser, async (req, res) => {
  try {
    const pool   = await poolPromise;
    const result = await pool.request()
      .input('TripID', sql.Int, parseInt(req.params.tripId))
      .execute('sp_GetAvailableSeats');

    res.json({
      summary:    result.recordsets[0][0],
      takenSeats: result.recordsets[1].map(r => r.TakenSeat)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CONFIRM BOOKING ───────────────────────────────────────────
router.post('/confirm', requireUser, async (req, res) => {
  const { tripId, seatNumber, paymentMethod } = req.body;
  try {
    const pool = await poolPromise;

    // 1. Create booking
    const bookResult = await pool.request()
      .input('UserID',     sql.Int, req.session.user.UserID)
      .input('TripID',     sql.Int, parseInt(tripId))
      .input('SeatNumber', sql.Int, parseInt(seatNumber))
      .execute('sp_CreateBooking');

    console.log('=== bookResult.recordsets ===', JSON.stringify(bookResult.recordsets));
    console.log('=== bookResult.recordset  ===', JSON.stringify(bookResult.recordset));

    const recordset = bookResult.recordsets[0] || bookResult.recordset;
    const newBookingID = recordset && recordset[0] ? recordset[0].NewBookingID : null;

    console.log('=== newBookingID ===', newBookingID);

    if (!newBookingID) {
      return res.json({ success: false, message: 'Booking saved but ID not retrieved.' });
    }

    // 2. Get trip price
    const priceRes = await pool.request()
      .input('TripID', sql.Int, parseInt(tripId))
      .query('SELECT Price FROM TRIP WHERE TripID = @TripID');
    const amount = priceRes.recordset[0].Price;

    console.log('=== amount ===', amount);

    // 3. Record payment
    await pool.request()
      .input('BookingID', sql.Int,           newBookingID)
      .input('Amount',    sql.Decimal(10,2), amount)
      .input('Method',    sql.VarChar(20),   paymentMethod || 'Cash')
      .execute('sp_ProcessPayment');

    res.json({ success: true, bookingId: newBookingID });

  } catch (err) {
    console.log('=== CONFIRM ERROR ===', err.message);
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;