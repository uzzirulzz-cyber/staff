import { PrismaClient } from '@prisma/client'

// On Vercel/production, env vars are set by the platform — no dotenv needed.
// In local dev, Next.js loads .env automatically.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('[db] DATABASE_URL is not set!')
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    datasources: url ? { db: { url } } : undefined,
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Neon auto-suspends idle compute — retry once on connection errors.
export async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await fn()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const isConnectionError =
      /closed|connection|timeout|epipe|read 0|fetch failed|ETIMEDOUT|ECONNRESET/i.test(msg)
    if (retries > 0 && isConnectionError) {
      await new Promise((r) => setTimeout(r, 500))
      return withRetry(fn, retries - 1)
    }
    throw err
  }
}
