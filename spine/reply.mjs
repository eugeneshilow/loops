// Reply in Telegram to a specific message — closes the @claude loop where it was
// pinged. Posts the work report as a REPLY to the original message.
//   node spine/reply.mjs <peer> <msgId> "text"      (peer = @username or numeric id)
//   echo "text" | node spine/reply.mjs <peer> <msgId>
import fs from 'node:fs'
import { connect } from './client.mjs'

const peer = process.argv[2]
const msgId = Number(process.argv[3])
let text = process.argv.slice(4).join(' ').trim()
if (!text) { try { text = fs.readFileSync(0, 'utf8').trim() } catch {} }

if (!peer || !Number.isFinite(msgId) || !text) {
  console.error('usage: node spine/reply.mjs <peer> <msgId> "text"  (peer = @username or numeric id)')
  process.exit(2)
}
// anti-loop: never send @claude in our own message, or the poller re-catches it.
if (/@claude\b/i.test(text)) {
  console.error('refusing to send: text contains @claude (would re-trigger the poller)')
  process.exit(2)
}

const client = await connect()
try {
  const target = /^-?\d+$/.test(peer) ? BigInt(peer) : peer
  const e = await client.getEntity(target)
  const r = await client.sendMessage(e, { message: text, replyTo: msgId })
  console.log('REPLIED', peer, 'msg', r.id)
} catch (err) {
  console.log('REPLY FAILED:', err.message)
} finally {
  await client.disconnect()
}
