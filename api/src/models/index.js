import pg from "pg";
const { Pool } = pg;

const connectionString = "postgres://postgres:password@postgres:5432/chat";

const pool = new Pool({
  connectionString,
});

const initTable = async () => {
  const client = await pool.connect();
  try {
    const table = `
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      CREATE TABLE IF NOT EXISTS messages(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
        message TEXT, 
        sender INTEGER, 
        createdAt BIGSERIAL
      )
    `;

    await client.query(table);
    console.log("Messages Table Created/Verified.");
  } catch (err) {
    console.error("Error initializing database:", err);
    throw err;
  } finally {
    client.release();
  }
};

// Initialize the table
initTable().catch(console.error);

export default pool;
