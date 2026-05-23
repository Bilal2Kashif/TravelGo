// db.js  –  MSSQL connection pool
// -------------------------------------------------------
// Change the server / user / password below to match
// your SQL Server instance. If you use Windows Auth,
// set "trustedConnection: true" and remove user/password.
// -------------------------------------------------------

const sql = require('mssql');

const config = {
  server: 'BILAL',          // ← your SQL Server name (e.g. BILAL\\SQLEXPRESS)
  database: 'TravelGo',
  user: 'sa',                   // ← your SQL login
  password: 'Admin1234!',  // ← your SQL password
  options: {
    encrypt: false,             // set true only for Azure
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Alternatively, for Windows Integrated Auth uncomment below and
// comment out user/password above:
// const config = {
//   server: 'localhost',
//   database: 'TravelGo',
//   options: { trustedConnection: true, trustServerCertificate: true }
// };

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('✅  Connected to SQL Server – TravelGo database');
    return pool;
  })
  .catch(err => {
    console.error('❌  DB Connection Failed:', err.message);
    process.exit(1);
  });

module.exports = { sql, poolPromise };
