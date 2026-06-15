import { listAuditLogs } from '@/lib/audit'
import { PageWidth } from '@/components/PageWidth'
import { FormattedDate } from '@/components/FormattedDate'

export const dynamic = 'force-dynamic'

const ACTOR_LABELS: Record<string, string> = {
  admin: 'Admin',
  game: 'Game',
  anonymous: 'Anonymous',
}

export default async function AdminAuditPage() {
  const entries = await listAuditLogs()

  return (
    <PageWidth width="5xl" className="px-6 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="font-cinzel text-xl tracking-wide text-(--cream)">Audit History</h1>
          <p className="mt-0.5 text-xs text-(--cream)/50">
            {entries.length} most recent action{entries.length === 1 ? '' : 's'}
          </p>
        </div>

        {entries.length === 0 ? (
          <p className="
            rounded-lg border border-(--border-gold-subtle)
            bg-(--surface-subtle) px-4 py-3 text-sm text-(--cream)/50
          ">
            No actions recorded yet.
          </p>
        ) : (
          <div className="
            overflow-x-auto rounded-xl border border-(--border-gold-subtle)
          ">
            <table className="w-full min-w-176 text-left text-sm">
              <thead>
                <tr className="
                  border-b border-(--border-gold-subtle) bg-(--surface-subtle)
                  text-[10px] font-medium tracking-[0.2em] text-(--gold)
                  uppercase
                ">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">IP Address</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Summary</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="
                      border-b border-(--border-gold-subtle) transition-colors
                      last:border-b-0
                      hover:bg-(--gold)/5
                    "
                  >
                    <td className="
                      px-4 py-3 whitespace-nowrap text-(--cream)/50 tabular-nums
                    ">
                      <FormattedDate iso={entry.createdAt.toISOString()} className="" />
                    </td>
                    <td className="
                      px-4 py-3 font-medium whitespace-nowrap text-(--cream)
                    ">
                      {entry.action}
                    </td>
                    <td className="
                      px-4 py-3 whitespace-nowrap text-(--cream)/70
                    ">
                      {ACTOR_LABELS[entry.actorType] ?? entry.actorType}
                    </td>
                    <td className="
                      px-4 py-3 whitespace-nowrap text-(--cream)/50 tabular-nums
                    ">
                      {entry.actorIp ?? '—'}
                    </td>
                    <td className="
                      px-4 py-3 whitespace-nowrap text-(--cream)/50
                    ">
                      {entry.entityType
                        ? `${entry.entityType}${entry.entityId ? ` #${entry.entityId}` : ''}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-(--cream)/70">{entry.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageWidth>
  )
}
