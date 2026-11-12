// Downloads every dane.gov.pl file and stores it in the database for good.
// dane.gov.pl only answers connections from Poland, and Vercel has no region
// there, so the deployed server reads what this stores. Run it from a Polish
// machine after adding a year to resource-ids.ts:
//   vp run @baza-imion/server#fill-cache   (TURSO_URL and TURSO_TOKEN in .env)
import type { Gender } from "@baza-imion/shared"
import { hasDatabase } from "./cache/connection.ts"
import { readEntry, writeEntry } from "./cache/database.ts"
import { fresh, type Entry } from "./cache/entry.ts"
import { fileKey, historyKey } from "./names/years.ts"
import { fetchChildrenHistory } from "./upstream/children-history.ts"
import { YEARLY_LISTS } from "./upstream/resource-ids.ts"
import { fetchNameCounts } from "./upstream/yearly-list.ts"

if (!hasDatabase) {
  throw new Error("TURSO_URL is not set: there is nowhere to store the files")
}

const stored = new Map<string, Entry>()

async function store(key: string, value: unknown) {
  const entry = fresh(value)
  stored.set(key, entry)
  await writeEntry(key, entry)
  console.log(`stored ${key}`)
}

const writes: Promise<void>[] = []
for (const years of Object.values(YEARLY_LISTS)) {
  for (const files of Object.values(years)) {
    for (const [gender, resourceId] of Object.entries(files)) {
      const download = fetchNameCounts(resourceId, gender as Gender)
      writes.push(download.then((value) => store(fileKey(resourceId), value)))
    }
  }
}
writes.push(
  fetchChildrenHistory().then(async (history) => {
    const years = [...history]
    await Promise.all(
      years.map(([year, entries]) => store(historyKey(year), entries))
    )
  })
)
await Promise.all(writes)

// A failed write is only logged, so every key is read back to be sure.
const missing: string[] = []
for (const [key, entry] of stored) {
  const found = await readEntry(key)
  if (found?.fetchedAt !== entry.fetchedAt) {
    missing.push(key)
  }
}
if (missing.length > 0) {
  throw new Error(`not stored: ${missing.join(", ")}`)
}
console.log(`${stored.size} entries stored for good`)
