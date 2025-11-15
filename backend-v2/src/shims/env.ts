import dotenv from "dotenv";

// Load environment variables from .env files when available.
// In Docker we typically rely on injected env vars, so dotenv just silently
// ignores missing files.
dotenv.config();
