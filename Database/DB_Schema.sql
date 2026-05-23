CREATE DATABASE TravelGo;
GO

USE TravelGo;
GO

-- =========================
-- USER
-- =========================
CREATE TABLE [USER] (
    UserID      INT IDENTITY(1,1) PRIMARY KEY,
    FirstName   VARCHAR(50) NOT NULL,
    LastName    VARCHAR(50) NOT NULL,
    Email       VARCHAR(100) NOT NULL UNIQUE,
    Password    VARCHAR(255) NOT NULL,
    Phone       VARCHAR(20),
    DOB         DATE
);

-- =========================
-- LOCATION
-- =========================
CREATE TABLE LOCATION (
    LocationID  INT IDENTITY(1,1) PRIMARY KEY,
    CityName    VARCHAR(100) NOT NULL
);

-- =========================
-- TRANSPORT
-- =========================
CREATE TABLE TRANSPORT (
    TransportID     INT IDENTITY(1,1) PRIMARY KEY,
    TransportName   VARCHAR(100) NOT NULL,
    Type            VARCHAR(10) NOT NULL CHECK (Type IN ('Bus','Train','Plane')),
    Capacity        INT NOT NULL CHECK (Capacity > 0)
);

-- =========================
-- TRIP
-- =========================
CREATE TABLE TRIP (
    TripID          INT IDENTITY(1,1) PRIMARY KEY,
    DepartureTime   TIME NOT NULL,
    TripDate        DATE NOT NULL,
    Price           DECIMAL(10,2) NOT NULL CHECK (Price > 0),
    TransportID     INT NOT NULL,
    DepartsFrom     INT NOT NULL,
    ArrivesAt       INT NOT NULL,

    FOREIGN KEY (TransportID) REFERENCES TRANSPORT(TransportID),
    FOREIGN KEY (DepartsFrom) REFERENCES LOCATION(LocationID),
    FOREIGN KEY (ArrivesAt)   REFERENCES LOCATION(LocationID)
);

-- =========================
-- BOOKING
-- =========================
CREATE TABLE BOOKING (
    BookingID       INT IDENTITY(1,1) PRIMARY KEY,
    BookingDate     DATETIME NOT NULL DEFAULT GETDATE(),
    Status          VARCHAR(10) NOT NULL DEFAULT 'Upcoming'
                    CHECK (Status IN ('Upcoming','Completed','Cancelled')),
    SeatNumber      INT NOT NULL,
    UserID          INT NOT NULL,
    TripID          INT NOT NULL,

    FOREIGN KEY (UserID) REFERENCES [USER](UserID),
    FOREIGN KEY (TripID) REFERENCES TRIP(TripID)
);

-- =========================
-- PAYMENT
-- =========================
CREATE TABLE PAYMENT (
    PaymentNo   INT IDENTITY(1,1) PRIMARY KEY,
    Amount      DECIMAL(10,2) NOT NULL CHECK (Amount > 0),
    Method      VARCHAR(20) NOT NULL
                CHECK (Method IN ('CreditCard','DebitCard','Cash','Online')),
    BookingID   INT NOT NULL UNIQUE,

    FOREIGN KEY (BookingID) REFERENCES BOOKING(BookingID)
);

-- =========================
-- FEEDBACKS
-- =========================
CREATE TABLE FEEDBACKS (
    FeedbackID      INT IDENTITY(1,1) PRIMARY KEY,
    Rating          TINYINT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
    CommentMessage  NVARCHAR(MAX),
    SubmittedDate   DATETIME NOT NULL DEFAULT GETDATE(),
    UserID          INT NOT NULL,
    TripID          INT NOT NULL,

    FOREIGN KEY (UserID) REFERENCES [USER](UserID),
    FOREIGN KEY (TripID) REFERENCES TRIP(TripID)
);
