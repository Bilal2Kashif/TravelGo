-- PROCEDURE: sp_RegisterUser
go
create or alter procedure sp_RegisterUser
    @FirstName  varchar(50),
    @LastName   varchar(50),
    @Email      varchar(100),
    @Password   varchar(255),
    @Phone      varchar(20),
    @DOB        date
as
begin
    

    if exists (select 1 from [USER] where Email = @Email)
    begin
        raiserror('Email is already registered.', 16, 1);
        return;
    end

    insert into [USER] (FirstName, LastName, Email, Password, Phone, DOB)
    values (@FirstName, @LastName, @Email, @Password, @Phone, @DOB);

end
go

-- ------------------------------------------------------------
-- PROCEDURE: sp_LoginUser
create or alter procedure sp_LoginUser
    @Email      varchar(100),
    @Password   varchar(255)
as
begin
    

    select UserID, FirstName, LastName, Email
    from [USER]
    where Email = @Email and Password = @Password;

end
go


-- ------------------------------------------------------------
-- PROCEDURE: sp_SearchTrips

create or alter procedure sp_SearchTrips
    @FromCity       varchar(100),
    @ToCity         varchar(100),
    @TripDate       date,
    @TransportType  varchar(10) = null   -- pass NULL for all types
as
begin
    

    select
        t.TripID,
        t.TripDate,
        t.DepartureTime,
        t.Price,
        tr.TransportName,
        tr.Type                 as TransportType,
        tr.Capacity,
        ld.CityName             as DepartureCity,
        la.CityName             as ArrivalCity,
        (tr.Capacity - (
            select count(*) from BOOKING b
            where b.TripID = t.TripID and b.Status = 'Upcoming'
        ))                      as AvailableSeats
    from TRIP t
    join TRANSPORT tr on t.TransportID = tr.TransportID
    join LOCATION  ld on t.DepartsFrom = ld.LocationID
    join LOCATION  la on t.ArrivesAt   = la.LocationID
    where ld.CityName   = @FromCity
      and la.CityName   = @ToCity
      and t.TripDate    = @TripDate
      and (@TransportType is null or tr.Type = @TransportType)
      and t.TripDate   >= cast(getdate() as date);
end
go

-- ------------------------------------------------------------
-- PROCEDURE: sp_CreateBooking


CREATE OR ALTER PROCEDURE sp_CreateBooking
    @UserID     INT,
    @TripID     INT,
    @SeatNumber INT
AS
BEGIN

    DECLARE @Capacity   INT;
    DECLARE @Booked     INT;
    DECLARE @SeatTaken  INT;
    DECLARE @TripDate   DATE;

    SELECT @TripDate = t.TripDate,
           @Capacity = tr.Capacity
    FROM TRIP t
    JOIN TRANSPORT tr ON t.TransportID = tr.TransportID
    WHERE t.TripID = @TripID;

    IF @TripDate IS NULL
    BEGIN RAISERROR('Trip not found.', 16, 1); RETURN; END

    IF @TripDate < CAST(GETDATE() AS DATE)
    BEGIN RAISERROR('Cannot book a trip that has already passed.', 16, 1); RETURN; END

    SELECT @Booked = COUNT(*) FROM BOOKING
    WHERE TripID = @TripID AND Status = 'Upcoming';

    IF @Booked >= @Capacity
    BEGIN RAISERROR('Sorry, this trip is fully booked.', 16, 1); RETURN; END

    SELECT @SeatTaken = COUNT(*) FROM BOOKING
    WHERE TripID = @TripID AND SeatNumber = @SeatNumber AND Status = 'Upcoming';

    IF @SeatTaken > 0
    BEGIN RAISERROR('This seat is already taken. Please choose another.', 16, 1); RETURN; END

    INSERT INTO BOOKING (UserID, TripID, SeatNumber, Status)
    VALUES (@UserID, @TripID, @SeatNumber, 'Upcoming');

    SELECT SCOPE_IDENTITY() AS NewBookingID;
END
GO

-- ------------------------------------------------------------
-- PROCEDURE: sp_ProcessPayment

create or alter procedure sp_ProcessPayment
    @BookingID  int,
    @Amount     decimal(10,2),
    @Method     varchar(20)
as
begin
    

    if not exists (select 1 from BOOKING where BookingID = @BookingID)
    begin
        raiserror('Booking not found.', 16, 1); return;
    end

    if exists (select 1 from PAYMENT where BookingID = @BookingID)
    begin
        raiserror('Payment already recorded for this booking.', 16, 1); return;
    end

    insert into PAYMENT (BookingID, Amount, Method)
    values (@BookingID, @Amount, @Method);

    select scope_identity() as NewPaymentNo;
end
go

-- ------------------------------------------------------------
-- PROCEDURE: sp_CancelBooking

create or alter procedure sp_CancelBooking
    @BookingID  int,
    @UserID     int
as
begin
    

    declare @Status varchar(10);

    select @Status = Status from BOOKING
    where BookingID = @BookingID and UserID = @UserID;

    if @Status is null
    begin
        raiserror('Booking not found for this user.', 16, 1); return;
    end

    if @Status != 'Upcoming'
    begin
        raiserror('Only upcoming bookings can be cancelled.', 16, 1); return;
    end

    update BOOKING set Status = 'Cancelled'
    where BookingID = @BookingID;

    select 'Booking cancelled successfully.' as Message;
end
go


-- ------------------------------------------------------------
-- PROCEDURE: sp_GetUserDashboard

create or alter procedure sp_GetUserDashboard
    @UserID int
as
begin
    

    select
        count(case when b.Status = 'Upcoming'  then 1 end)  as UpcomingBookings,
        count(case when b.Status = 'Completed' then 1 end)  as CompletedTrips,
        count(case when b.Status = 'Cancelled' then 1 end)  as CancelledTrips,
        isnull(sum(case when b.Status != 'Cancelled' then p.Amount end), 0) as TotalSpending
    from BOOKING b
    left join PAYMENT p on b.BookingID = p.BookingID
    where b.UserID = @UserID;
end
go

-- ------------------------------------------------------------
-- PROCEDURE: sp_GetUserUpcomingBookings

create or alter procedure sp_GetUserUpcomingBookings
    @UserID int
as
begin
    

    select
        b.BookingID,
        b.SeatNumber,
        b.BookingDate,
        t.TripDate,
        t.DepartureTime,
        t.Price,
        tr.TransportName,
        tr.Type             as TransportType,
        ld.CityName         as From_City,
        la.CityName         as To_City,
        pay.Method          as PaymentMethod,
        pay.Amount          as AmountPaid
    from BOOKING b
    join TRIP      t   on b.TripID      = t.TripID
    join TRANSPORT tr  on t.TransportID = tr.TransportID
    join LOCATION  ld  on t.DepartsFrom = ld.LocationID
    join LOCATION  la  on t.ArrivesAt   = la.LocationID
    left join PAYMENT pay on b.BookingID = pay.BookingID
    where b.UserID = @UserID and b.Status = 'Upcoming'
    order by t.TripDate asc;
end
go

-- ------------------------------------------------------------
-- PROCEDURE: sp_GetUserBookingHistory

create or alter procedure sp_GetUserBookingHistory
    @UserID int
as
begin
    

    select
        b.BookingID,
        b.BookingDate,
        b.Status,
        b.SeatNumber,
        t.TripDate,
        t.DepartureTime,
        t.Price,
        tr.TransportName,
        tr.Type             as TransportType,
        ld.CityName         as From_City,
        la.CityName         as To_City,
        pay.Amount          as AmountPaid,
        pay.Method          as PaymentMethod
    from BOOKING b
    join TRIP      t   on b.TripID      = t.TripID
    join TRANSPORT tr  on t.TransportID = tr.TransportID
    join LOCATION  ld  on t.DepartsFrom = ld.LocationID
    join LOCATION  la  on t.ArrivesAt   = la.LocationID
    left join PAYMENT pay on b.BookingID = pay.BookingID
    where b.UserID = @UserID
    order by b.BookingDate desc;
end
go

-- ------------------------------------------------------------
-- PROCEDURE: sp_SubmitFeedback

create or alter procedure sp_SubmitFeedback
    @UserID     int,
    @TripID     int,
    @Rating     tinyint,
    @Comment    nvarchar(max)
as
begin
    

    if not exists (
        select 1 from BOOKING
        where UserID = @UserID and TripID = @TripID and Status = 'Completed'
    )
    begin
        raiserror('You can only review trips you have completed.', 16, 1); return;
    end

    insert into FEEDBACKS (UserID, TripID, Rating, CommentMessage)
    values (@UserID, @TripID, @Rating, @Comment);

    select scope_identity() as NewFeedbackID;
end
go

-- ------------------------------------------------------------
-- PROCEDURE: sp_AdminAddTrip

create or alter procedure sp_AdminAddTrip
    @DepartureTime  time,
    @TripDate       date,
    @Price          decimal(10,2),
    @TransportID    int,
    @DepartsFrom    int,
    @ArrivesAt      int
as
begin
    

    if @DepartsFrom = @ArrivesAt
    begin
        raiserror('Departure and arrival city cannot be the same.', 16, 1); return;
    end

    insert into TRIP (DepartureTime, TripDate, Price, TransportID, DepartsFrom, ArrivesAt)
    values (@DepartureTime, @TripDate, @Price, @TransportID, @DepartsFrom, @ArrivesAt);

    select scope_identity() as NewTripID;
end
go

-- ------------------------------------------------------------
-- PROCEDURE: sp_AdminAddTransport

create or alter procedure sp_AdminAddTransport
    @TransportName  varchar(100),
    @Type           varchar(10),
    @Capacity       int
as
begin
    

    insert into TRANSPORT (TransportName, Type, Capacity)
    values (@TransportName, @Type, @Capacity);

    select scope_identity() as NewTransportID;
end
go

---- ------------------------------------------------------------
---- PROCEDURE: sp_AdminDeleteUser

--create or alter procedure sp_AdminDeleteUser
--    @UserID int
--as
--begin
    

--    if not exists (select 1 from [USER] where UserID = @UserID)
--    begin
--        raiserror('User not found.', 16, 1); return;
--    end

--    -- Cancel all upcoming bookings before deleting user
--    update BOOKING set Status = 'Cancelled'
--    where UserID = @UserID and Status = 'Upcoming';

--    delete from [USER] where UserID = @UserID;

--    select 'User deleted and active bookings cancelled.' as Message;
--end
--go

-- ------------------------------------------------------------
-- PROCEDURE: sp_AdminGetStats

create or alter procedure sp_AdminGetStats
as
begin
    

    select
        (select count(*) from [USER])                                       as TotalUsers,
        (select count(*) from BOOKING)                                      as TotalBookings,
        (select count(*) from BOOKING where Status = 'Upcoming')            as ActiveBookings,
        (select count(*) from BOOKING where Status = 'Completed')           as CompletedBookings,
        (select count(*) from BOOKING where Status = 'Cancelled')           as CancelledBookings,
        (select isnull(sum(Amount), 0) from PAYMENT)                        as TotalRevenue,
        (select count(*) from TRIP where TripDate >= cast(getdate() as date)) as UpcomingTrips,
        (select count(*) from TRANSPORT)                                    as TotalVehicles;
end
go




-- ------------------------------------------------------------
-- PROCEDURE: sp_MarkCompletedTrips

create or alter procedure sp_MarkCompletedTrips
as
begin
    

    update b
    set b.Status = 'Completed'
    from BOOKING b
    join TRIP t on b.TripID = t.TripID
    where b.Status = 'Upcoming'
      and t.TripDate < cast(getdate() as date);

    select @@rowcount as BookingsMarkedCompleted;
end
go

-- ------------------------------------------------------------
-- PROCEDURE: sp_GetAvailableSeats

create or alter procedure sp_GetAvailableSeats
    @TripID int
as
begin
    

    select
        tr.Capacity                 as TotalSeats,
        count(b.SeatNumber)         as BookedSeats,
        (tr.Capacity - count(b.SeatNumber)) as AvailableSeats
    from TRIP t
    join TRANSPORT tr on t.TransportID = tr.TransportID
    left join BOOKING b on t.TripID = b.TripID and b.Status = 'Upcoming'
    where t.TripID = @TripID
    group by tr.Capacity;

    -- Also return list of taken seat numbers for seat map
    select SeatNumber as TakenSeat
    from BOOKING
    where TripID = @TripID and Status = 'Upcoming'
    order by SeatNumber;
end
go


