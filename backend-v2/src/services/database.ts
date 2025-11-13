import {
  Pool,
  QueryResult,
  PoolClient,
  QueryConfig,
  QueryResultRow,
} from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database (v2)");
});

pool.on("error", (err) => {
  console.error("❌ Database connection error:", err);
});

export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string | QueryConfig<any[]>,
  params?: any[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const result =
      typeof text === "string"
        ? await pool.query<T>(text, params)
        : await pool.query<T>(text);
    const duration = Date.now() - start;
    console.log("📊 Executed query", {
      text: typeof text === "string" ? text.slice(0, 50) : text.text?.slice(0, 50),
      duration,
      rows: result.rowCount,
    });
    return result;
  } catch (error) {
    console.error("❌ Database query error:", error);
    throw error;
  }
};

export const getClient = (): Promise<PoolClient> => pool.connect();

export default pool;
