const mysql = require("mysql2/promise");
require("dotenv").config();

const {
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_CONN_LIMIT,
} = process.env;

function createPool() {
  return mysql.createPool({
    host: DB_HOST || "localhost",
    user: DB_USER || "root",
    password: DB_PASSWORD || "",
    database: DB_NAME || "college_management",
    waitForConnections: true,
    connectionLimit: Number(DB_CONN_LIMIT || 10),
    namedPlaceholders: true,
  });
}

const pool = createPool();

async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = {
  pool,
  query,
};
