// Entry point. Env: PORT (8080), POB_ROOT (repo root holding vendor/pob2 and tools/pob2; default ../..),
// LUAJIT (luajit), ALLOWED_ORIGIN (regex source; default the Pages app + localhost), CALC_TIMEOUT_MS (90000),
// RATE_LIMIT (20 builds per client per 10 minutes), MAX_QUEUE (4), CACHE_SIZE (64).
import { createServer } from 'node:http'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHandler, DEFAULT_ORIGIN, Lru, RateLimit } from './app.mjs'
import { EngineWorker } from './worker.mjs'

const env = process.env
const root = resolve(env.POB_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..'))
const log = (m) => console.log(new Date().toISOString(), m)
const worker = new EngineWorker({ root, luajit: env.LUAJIT ?? 'luajit', timeoutMs: Number(env.CALC_TIMEOUT_MS ?? 90_000), log })
const handler = createHandler({
  worker,
  allowedOrigin: env.ALLOWED_ORIGIN ? new RegExp(env.ALLOWED_ORIGIN) : DEFAULT_ORIGIN,
  maxQueue: Number(env.MAX_QUEUE ?? 4),
  cache: new Lru(Number(env.CACHE_SIZE ?? 64)),
  rateLimit: new RateLimit(Number(env.RATE_LIMIT ?? 20), 10 * 60_000),
  log,
})

createServer((req, res) => {
  handler(req, res).catch((e) => {
    log(`unhandled: ${e.stack ?? e}`)
    if (!res.headersSent) res.writeHead(500).end()
  })
}).listen(Number(env.PORT ?? 8080), () => log(`pob-engine listening on ${env.PORT ?? 8080}, root ${root}`))

// Start PoB now so the first request does not pay for it.
worker.start().then((i) => log(`PoB ${i.pobVersion} (${i.pinCommit}) ready`), (e) => log(`PoB failed to start: ${e.message}`))
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => (worker.stop(), process.exit(0)))
