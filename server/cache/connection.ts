// The HTTP-only client: no native module, so it also runs on Vercel.
import { createClient, type InStatement } from "@libsql/client/web"

// Without TURSO_URL the cache lives in memory only and is lost on restart.
const client = process.env.TURSO_URL
  ? createClient({
      url: process.env.TURSO_URL,
      authToken: process.env.TURSO_TOKEN,
    })
  : undefined

export const hasDatabase = client !== undefined

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
)`

/**
 * Runs statements as one round trip. The table is only created when the
 * database turns out not to have it, so a normal start costs no extra call.
 */
export async function run(statements: InStatement[]) {
  if (!client) return []
  try {
    return await client.batch(statements)
  } catch (error) {
    if (!(error instanceof Error) || !/no such table/i.test(error.message)) {
      throw error
    }
    return client
      .batch([CREATE_TABLE, ...statements])
      .then(([, ...rest]) => rest)
  }
}

// Database errors can carry the connection URL, so only their kind is logged.
export function logFailure(action: string, error: unknown) {
  const kind =
    error instanceof Error
      ? ("code" in error && String(error.code)) || error.name
      : "unknown error"
  console.error(`cache ${action} failed: ${kind}`)
}
