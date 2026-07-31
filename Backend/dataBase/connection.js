const mysql = require("mysql2");
require("dotenv").config();

let pool;

function createPool() {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 20000,
    acquireTimeout: 20000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });

  pool.on("acquire", (connection) => {
    // connection acquired
  });

  pool.on("release", (connection) => {
    // connection released
  });

  pool.on("error", (err) => {
    console.error("Pool error:", err.code);
    if (err.code === "PROTOCOL_CONNECTION_LOST" || err.code === "ECONNRESET") {
      console.warn("⚠️ Re-creating MySQL pool due to connection drop...");
      try {
        createPool();
      } catch (e) {}
    }
  });

  return pool;
}

createPool();

function queryWithRetry(sql, params = [], retries = 3) {
  return new Promise((resolve, reject) => {
    const attemptQuery = (attemptsLeft) => {
      pool.query(sql, params, (err, results) => {
        if (err) {
          if (err.code === "ER_TOO_MANY_USER_CONNECTIONS") {
            reject(new Error("Database busy. Try again in a moment."));
            return;
          }

          if (
            (err.code === "ECONNRESET" ||
              err.code === "PROTOCOL_CONNECTION_LOST" ||
              err.code === "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR") &&
            attemptsLeft > 0
          ) {
            console.warn(
              `⚠️ MySQL connection lost (${err.code}). Retrying query (${attemptsLeft} retries left)...`,
            );
            setTimeout(() => attemptQuery(attemptsLeft - 1), 300);
          } else {
            reject(err);
          }
        } else {
          resolve(results);
        }
      });
    };
    attemptQuery(retries);
  });
}

function getConnectionWithRetry(retries = 1) {
  return new Promise((resolve, reject) => {
    const attemptConnection = (attemptsLeft) => {
      pool.getConnection((err, connection) => {
        if (err) {
          if (err.code === "ER_TOO_MANY_USER_CONNECTIONS") {
            reject(new Error("Database busy. Try again in a moment."));
            return;
          }

          if (
            (err.code === "ECONNRESET" ||
              err.code === "PROTOCOL_CONNECTION_LOST") &&
            attemptsLeft > 0
          ) {
            setTimeout(() => attemptConnection(attemptsLeft - 1), 500);
          } else {
            reject(err);
          }
        } else {
          // Auto-release after 30 seconds safety
          const safetyTimer = setTimeout(() => {
            console.warn("⚠ Force releasing connection", connection.threadId);
            try {
              connection.release();
            } catch (e) {}
          }, 30000);

          const originalRelease = connection.release.bind(connection);
          connection.release = function () {
            clearTimeout(safetyTimer);
            originalRelease();
          };

          resolve(connection);
        }
      });
    };
    attemptConnection(retries);
  });
}

function closePool() {
  return new Promise((resolve, reject) => {
    pool.end((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  pool,
  queryWithRetry,
  getConnectionWithRetry,
  closePool,
};
