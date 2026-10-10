import mysql from "mysql2/promise";
import { config } from "./env.js";

// El pool reutiliza conexiones. execute() usa consultas parametrizadas.
export const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 50,
  connectTimeout: 10000,
  charset: "utf8mb4",
  timezone: "Z",
});
