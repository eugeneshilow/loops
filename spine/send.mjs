// Send a Telegram message from YOUR account — used to DM testers the invite / the
// new build link. Also resolves @handles to ids.
//   node spine/send.mjs <peer> "text"
//   node spine/send.mjs resolve <@a> <@b>
import { connect } from './client.mjs'

const [mode, ...rest] = process.argv.slice(2)
const client = await connect()
try {
  if (mode === 'resolve') {
    for (const u of rest) {
      try {
        const e = await client.getEntity(u)
        const name = [e.firstName, e.lastName].filter(Boolean).join(' ') || e.title || ''
        console.log(`${u} -> id=${e.id} @${e.username ?? '?'} name="${name}" bot=${Boolean(e.bot)}`)
      } catch (err) {
        console.log(`${u} -> RESOLVE FAILED: ${err.message}`)
      }
    }
  } else {
    const peer = mode
    const text = rest.join(' ')
    if (!peer || !text) { console.error('usage: node spine/send.mjs <peer> "text"  |  resolve <@a> <@b>'); process.exit(2) }
    // anti-loop: never send @claude in our own message
    if (/@claude\b/i.test(text)) { console.error('refusing: text contains @claude (anti-loop)'); process.exit(2) }
    const e = await client.getEntity(/^-?\d+$/.test(peer) ? BigInt(peer) : peer)
    const r = await client.sendMessage(e, { message: text })
    console.log('SENT to', peer, 'msg', r.id)
  }
} finally {
  await client.disconnect()
}
