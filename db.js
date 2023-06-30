const { Pool, types } = require("pg");

require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

types.setTypeParser(types.builtins.NUMERIC, (value) => parseFloat(value));

types.setTypeParser(types.builtins.INT8, (value) => parseInt(value));

exports.connect = async () => {
  return pool.connect();
};
