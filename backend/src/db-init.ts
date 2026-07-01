import { initDatabase, pool } from "./db.js";

await initDatabase();
await pool.end();

console.log("Database schema ready.");
