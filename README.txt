TravelGo

Description
TravelGo is a travel booking system with user and admin dashboards built on Node.js, Express, and MSSQL.

Features
- User registration and login
- User dashboard and booking flow
- Booking history
- Feedback submission
- Admin dashboard
- Admin management pages for users, bookings, trips, vehicles, and feedback

Software and libraries used
- Node.js + npm
- Express
- EJS templates
- Microsoft SQL Server (mssql)
- express-session, bcryptjs, method-override
- nodemon (dev only)

How to run
1) Install Node.js LTS and npm.
2) Install Microsoft SQL Server and create a database named TravelGo.
3) Update DB connection settings in db.js (server, user, password).
4) Install dependencies: npm install
5) Start the app:
	- npm run dev (auto-reload)
	- or npm start
6) Open http://localhost:3000

Notes
- The default port is 3000 (change with the PORT environment variable).
- Update db.js before running to match your SQL Server instance.
