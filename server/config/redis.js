import { Redis } from "ioredis";

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // 👈 important
  enableReadyCheck: false,    // 👈 also recommended
});

connection.on("connect", () => console.log("✅ Redis Connected"));
connection.on("error", (err) => console.error("❌ Redis Error", err));

export default connection;
