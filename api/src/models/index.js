import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.POSTGRES_CONNECTION_URI || "postgres://postgres:password@postgres:5432/chat";

const pool = new Pool({
  connectionString,
});

const initTable = async () => {
  const client = await pool.connect();
  try {
    // First check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'messages'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log("Messages table does not exist. Creating...");
      // Create the table if it doesn't exist
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";
        DROP TABLE IF EXISTS messages;
        CREATE TABLE messages(
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
          message TEXT, 
          sender INTEGER, 
          createdAt BIGSERIAL
        );
      `);
      console.log("Messages table created successfully.");
    } else {
      console.log("Messages table already exists.");
    }
  } catch (err) {
    console.error("Error initializing database:", err);
    // Try to create table again after a delay if it failed
    setTimeout(() => {
      console.log("Retrying table creation...");
      initTable().catch(console.error);
    }, 5000);
  } finally {
    client.release();
  }
};

// Initialize the table
console.log("Starting database initialization...");
initTable().catch(err => {
  console.error("Failed to initialize database:", err);
});

export default pool;
