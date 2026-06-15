import { headers } from 'next/headers'
import { desc } from 'drizzle-orm'
import { auditLogs } from '@/db/schema'
import { db } from './db'
import { getClientIp } from './request-ip'

export type AuditActorType = 'admin' | 'game' | 'anonymous'

export interface RecordAuditInput {
  /** '<entity>.<verb>', e.g. 'player.create'. */
  action: string
  actorType: AuditActorType
  entityType?: string | null
  entityId?: string | number | null
  /** Human-readable one-liner. Never include secrets. */
  summary: string
  /** Structured detail (changed fields). Never include secrets. */
  metadata?: Record<string, unknown> | null
}

export interface AuditLogEntry {
  id: number
  action: string
  actorType: string
  actorIp: string | null
  entityType: string | null
  entityId: string | null
  summary: string
  metadata: unknown
  createdAt: Date
}

/**
 * Records a single audit entry. The originating client IP is resolved here from
 * the request headers (via `getClientIp`), so callers never thread it through.
 *
 * Best-effort: a failure to write the audit row is logged and swallowed so it
 * can never break the user's action. Must be called from request scope (Server
 * Actions / route handlers), where `headers()` is available.
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    const actorIp = getClientIp(await headers())
    await db.insert(auditLogs).values({
      action: input.action,
      actorType: input.actorType,
      actorIp,
      entityType: input.entityType ?? null,
      entityId: input.entityId != null ? String(input.entityId) : null,
      summary: input.summary,
      metadata: input.metadata ?? null,
    })
  } catch (err) {
    // Best-effort: never let an audit failure break the user's action.
    // eslint-disable-next-line no-console -- no logger abstraction; surface the failure to server logs
    console.error('[audit] failed to record', { action: input.action, err })
  }
}

/** Returns audit entries newest-first, capped at `limit`. */
export async function listAuditLogs(limit = 200): Promise<AuditLogEntry[]> {
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit)
}
