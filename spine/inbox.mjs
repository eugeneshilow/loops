// Durable @claude inbox: an always-on poller appends hits here (poll.mjs --queue);
// a live agent session drains them idempotently. Pure file I/O, no Telegram.
//   node spine/inbox.mjs        drain (print fresh hits + mark them processed)
import fs from 'node:fs'
import { cfg } from './config.mjs'

export function appendInbox(items) {
  const nowSec = Math.floor(Date.now() / 1000)
  const lines = items.map((x) => JSON.stringify({ ...x, ts: nowSec })).join('\n') + '\n'
  fs.appendFileSync(cfg.inboxPath, lines)
}

export function drain() {
  const drained = new Set(readJson(cfg.cursorPath, { drainedIds: [] }).drainedIds || [])
  let lines = []
  try { lines = fs.readFileSync(cfg.inboxPath, 'utf8').split('\n').filter(Boolean) } catch {}
  const fresh = []
  for (const ln of lines) {
    let item
    try { item = JSON.parse(ln) } catch { continue }
    if (item && item.msgId != null && !drained.has(item.msgId)) {
      fresh.push(item)
      drained.add(item.msgId)
    }
  }
  // cap the cursor so it can't grow forever
  writeJson(cfg.cursorPath, { drainedIds: Array.from(drained).slice(-1000) })
  return { fresh, freshCount: fresh.length, inboxLines: lines.length }
}

function readJson(p, d) { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return d } }
function writeJson(p, v) { fs.writeFileSync(p, JSON.stringify(v, null, 2)) }

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(drain(), null, 2))
}
