-- ------------------------------------------------------------
-- VIEW: vw_TripDetails

create or alter view vw_TripDetails as
select
    t.TripID,
    t.TripDate,
    t.DepartureTime,
    t.Price,
    tr.TransportID,
    tr.TransportName,
    tr.Type             as TransportType,
    tr.Capacity,
    ld.CityName         as DepartureCity,
    la.CityName         as ArrivalCity,
    (tr.Capacity - (
        select count(*) from BOOKING b
        where b.TripID = t.TripID and b.Status = 'Upcoming'
    ))                  as AvailableSeats
from TRIP t
join TRANSPORT tr on t.TransportID = tr.TransportID
join LOCATION  ld on t.DepartsFrom = ld.LocationID
join LOCATION  la on t.ArrivesAt   = la.LocationID;
go

-- ------------------------------------------------------------
-- VIEW: vw_BookingDetails

create or alter view vw_BookingDetails as
select
    b.BookingID,
    b.BookingDate,
    b.Status,
    b.SeatNumber,
    u.UserID,
    u.FirstName + ' ' + u.LastName  as PassengerName,
    u.Email,
    u.Phone,
    t.TripID,
    t.TripDate,
    t.DepartureTime,
    t.Price             as TripPrice,
    tr.TransportName,
    tr.Type             as TransportType,
    ld.CityName         as From_City,
    la.CityName         as To_City,
    pay.PaymentNo,
    pay.Amount          as AmountPaid,
    pay.Method          as PaymentMethod
from BOOKING b
join [USER]    u   on b.UserID      = u.UserID
join TRIP      t   on b.TripID      = t.TripID
join TRANSPORT tr  on t.TransportID = tr.TransportID
join LOCATION  ld  on t.DepartsFrom = ld.LocationID
join LOCATION  la  on t.ArrivesAt   = la.LocationID
left join PAYMENT pay on b.BookingID = pay.BookingID;
go

-- ------------------------------------------------------------
-- VIEW: vw_UserSpendingSummary

create or alter view vw_UserSpendingSummary as
select
    u.UserID,
    u.FirstName + ' ' + u.LastName  as FullName,
    u.Email,
    u.Phone,
    count(b.BookingID)                                              as TotalBookings,
    count(case when b.Status = 'Completed' then 1 end)              as Completed,
    count(case when b.Status = 'Cancelled' then 1 end)              as Cancelled,
    count(case when b.Status = 'Upcoming'  then 1 end)              as Upcoming,
    isnull(sum(case when b.Status != 'Cancelled' then pay.Amount end), 0) as TotalSpent
from [USER] u
left join BOOKING b   on u.UserID     = b.UserID
left join PAYMENT pay on b.BookingID  = pay.BookingID
group by u.UserID, u.FirstName, u.LastName, u.Email, u.Phone;
go

-- ------------------------------------------------------------
-- VIEW: vw_TripFeedbackSummary

create or alter view vw_TripFeedbackSummary as
select
    f.FeedbackID,
    f.Rating,
    f.CommentMessage,
    f.SubmittedDate,
    u.FirstName + ' ' + u.LastName  as PassengerName,
    u.Email,
    t.TripDate,
    tr.TransportName,
    tr.Type      as TransportType,
    ld.CityName  as From_City,
    la.CityName  as To_City
from FEEDBACKS f
join [USER]    u   on f.UserID      = u.UserID
join TRIP      t   on f.TripID      = t.TripID
join TRANSPORT tr  on t.TransportID = tr.TransportID
join LOCATION  ld  on t.DepartsFrom = ld.LocationID
join LOCATION  la  on t.ArrivesAt   = la.LocationID;
go

-- ------------------------------------------------------------
-- VIEW: vw_RevenueByTransportType

create or alter view vw_RevenueByTransportType as
select
    tr.Type                         as TransportType,
    count(b.BookingID)              as TotalBookings,
    isnull(sum(pay.Amount), 0)      as TotalRevenue
from TRANSPORT tr
join TRIP    t   on tr.TransportID  = t.TransportID
join BOOKING b   on t.TripID        = b.TripID
left join PAYMENT pay on b.BookingID = pay.BookingID
where b.Status != 'Cancelled'
group by tr.Type;
go

-- ------------------------------------------------------------
-- VIEW: vw_PopularRoutes

create or alter view vw_PopularRoutes as
select
    ld.CityName             as From_City,
    la.CityName             as To_City,
    count(b.BookingID)      as TotalBookings,
    round(avg(pay.Amount), 2) as AvgTicketPrice
from BOOKING b
join TRIP      t   on b.TripID      = t.TripID
join LOCATION  ld  on t.DepartsFrom = ld.LocationID
join LOCATION  la  on t.ArrivesAt   = la.LocationID
left join PAYMENT pay on b.BookingID = pay.BookingID
where b.Status != 'Cancelled'
group by ld.CityName, la.CityName;
go


