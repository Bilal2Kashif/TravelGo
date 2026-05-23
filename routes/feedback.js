const express = require('express');
const router  = express.Router();
const { sql, poolPromise } = require('../db');
const { requireUser } = require('../middleware/auth');

// ── FEEDBACK PAGE (shows completed trips to review) ───────────
router.get('/', requireUser, async (req, res) => {
  try {
    const pool = await poolPromise;

    // Get completed trips for this user that have no feedback yet
    const eligible = await pool.request()
      .input('UserID', sql.Int, req.session.user.UserID)
      .query(`
        select distinct
          t.TripID,
          t.TripDate,
          t.DepartureTime,
          tr.TransportName,
          tr.Type        as TransportType,
          ld.CityName    as From_City,
          la.CityName    as To_City,
          b.BookingID
        from BOOKING b
        join TRIP      t   on b.TripID      = t.TripID
        join TRANSPORT tr  on t.TransportID = tr.TransportID
        join LOCATION  ld  on t.DepartsFrom = ld.LocationID
        join LOCATION  la  on t.ArrivesAt   = la.LocationID
        where b.UserID  = @UserID
          and b.Status  = 'Completed'
          and not exists (
            select 1 from FEEDBACKS f
            where f.UserID = @UserID and f.TripID = t.TripID
          )
        order by t.TripDate desc
      `);

    // Get feedbacks already submitted by this user
    const submitted = await pool.request()
      .input('UserID', sql.Int, req.session.user.UserID)
      .query(`
        select
          f.FeedbackID,
          f.Rating,
          f.CommentMessage,
          f.SubmittedDate,
          ld.CityName  as From_City,
          la.CityName  as To_City,
          tr.TransportName,
          tr.Type      as TransportType,
          t.TripDate
        from FEEDBACKS f
        join TRIP      t   on f.TripID      = t.TripID
        join TRANSPORT tr  on t.TransportID = tr.TransportID
        join LOCATION  ld  on t.DepartsFrom = ld.LocationID
        join LOCATION  la  on t.ArrivesAt   = la.LocationID
        where f.UserID = @UserID
        order by f.SubmittedDate desc
      `);

    res.render('feedback', {
      eligible:  eligible.recordset,
      submitted: submitted.recordset,
      success:   req.query.success || null,
      error:     null
    });
  } catch (err) {
    console.error(err);
    res.render('feedback', { eligible: [], submitted: [], success: null, error: err.message });
  }
});

// ── SUBMIT FEEDBACK ───────────────────────────────────────────
router.post('/submit', requireUser, async (req, res) => {
  const { tripId, rating, comment } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('UserID',  sql.Int,          req.session.user.UserID)
      .input('TripID',  sql.Int,          parseInt(tripId))
      .input('Rating',  sql.TinyInt,      parseInt(rating))
      .input('Comment', sql.NVarChar(sql.MAX), comment || '')
      .execute('sp_SubmitFeedback');

    res.redirect('/feedback?success=1');
  } catch (err) {
    const pool     = await poolPromise;
    const eligible = await pool.request()
      .input('UserID', sql.Int, req.session.user.UserID)
      .query(`select distinct t.TripID, t.TripDate, tr.TransportName, tr.Type as TransportType, ld.CityName as From_City, la.CityName as To_City, b.BookingID from BOOKING b join TRIP t on b.TripID=t.TripID join TRANSPORT tr on t.TransportID=tr.TransportID join LOCATION ld on t.DepartsFrom=ld.LocationID join LOCATION la on t.ArrivesAt=la.LocationID where b.UserID=@UserID and b.Status='Completed' and not exists (select 1 from FEEDBACKS f where f.UserID=@UserID and f.TripID=t.TripID)`);
    res.render('feedback', {
      eligible:  eligible.recordset,
      submitted: [],
      success:   null,
      error:     err.message.includes('only review trips') ? 'You can only review completed trips.' : err.message
    });
  }
});

module.exports = router;
