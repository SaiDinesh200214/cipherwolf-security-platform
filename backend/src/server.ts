import { createApp } from "./app.js";
import { config } from "./config.js";
import { initDatabase, pool } from "./db.js";

await initDatabase();
const app = await createApp();

const shutdown = async () => {
  await app.close();
  await pool.end();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ port: config.port, host: "0.0.0.0" });
