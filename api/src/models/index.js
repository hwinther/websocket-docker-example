import pg from "pg";
const { Pool } = pg;

const connectionString =
  process.env.POSTGRES_CONNECTION_URI ||
  "postgres://postgres:password@postgres:5432/chat";

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Add connection error handler
  on: "error",
  onError: (err, client) => {
    console.error("Unexpected database error:", err);
    if (client) client.release(true); // Release with error
  },
});

// Add connection validation function
const validateConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    await client.query("SELECT 1");
    console.log("Database connection validated");
    return true;
  } catch (err) {
    console.error("Database connection validation failed:", err);
    return false;
  } finally {
    if (client) client.release();
  }
};

// Add periodic connection validation
setInterval(async () => {
  await validateConnection();
}, 30000); // Check every 30 seconds

const initTable = async () => {
  const client = await pool.connect();
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // Check if tables exist before creating them
    const { rows: existingTables } = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('conversations', 'conversation_participants', 'messages')
    `);

    if (existingTables.length === 0) {
      console.log("Creating database tables...");
      await client.query(`
        -- Create conversations table if not exists
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Create conversation participants table if not exists
        CREATE TABLE IF NOT EXISTS conversation_participants (
          conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
          user_id INTEGER,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (conversation_id, user_id)
        );
        
        -- Create messages table with conversation reference
        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
          message TEXT,
          sender INTEGER,
          created_at BIGSERIAL
        );
      `);
      console.log("Database tables created successfully.");
    } else {
      console.log("Database tables already exist, skipping initialization.");
    }
  } catch (err) {
    console.error("Error initializing database:", err);
    if (err.code === "ECONNREFUSED") {
      console.log("Database connection refused. Retrying in 5 seconds...");
      setTimeout(() => {
        initTable().catch(console.error);
      }, 5000);
    }
  } finally {
    client.release();
  }
};

console.log("Starting database initialization...");
initTable().catch((err) => {
  console.error("Failed to initialize database:", err);
});

export default pool;
