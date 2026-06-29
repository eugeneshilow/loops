// Poll YOUR Telegram for @claude-tagged feedback, download voice, transcribe.
//   node spine/poll.mjs --mode contacts            poll the tester DMs (LOOP_TESTERS)
//   node spine/poll.mjs --mode mentions            scan recent chats for @claude
//   node spine/poll.mjs --mode mentions --queue     append hits to durable inbox + self-notify
//   ... --since 0                                    re-scan from scratch
import { Api } from 'telegram'
import fs from 'node:fs'
import path from 'node:path'
import { connect } from './client.mjs'
import { cfg } from './config.mjs'
import { transcribeBuffer } from './transcribe.mjs'
import { appendInbox } from './inbox.mjs'

const argv = process.argv.slice(2)
const mode = arg('--mode') ?? 'contacts'
const sinceArg = has('--since') ? Number(arg('--since')) : null
const QUEUE = has('--queue')
const TAG = /@claude\b/i
const DIALOG_LIMIT = 60
const PER_CHAT = 8

const client = await connect()
const me = await client.getMe()
console.error(`[connected as @${me.username ?? me.id}] mode=${mode}`)

try {
  const found = mode === 'mentions' ? await pollMentions() : await pollContacts()
  if (QUEUE && found.length) {
    appendInbox(found)
    // anti-loop: the self-notify must NOT contain "@claude" or the poller catches itself.
    try {
      await client.sendMessage('me', { message: `🔔 loops: ${found.length} new ping(s) for the agent. Drain in a live session.` })
    } catch {}
  }
  console.log(JSON.stringify({ mode, found, count: found.length }, null, 2))
} finally {
  await client.disconnect()
}

async function pollContacts() {
  if (!cfg.testers.length) console.error('No LOOP_TESTERS set — add tester @handles to .loops/.env')
  const STATE = cfg.statePath('contacts_state.json')
  const state = readJson(STATE, {})
  const out = []
  for (const handle of cfg.testers) {
    let e
    try { e = await client.getEntity(handle) } catch (err) { console.error(`resolve ${handle} failed: ${err.message}`); continue }
    const minId = sinceArg != null ? sinceArg : (state[handle] ?? 0)
    const msgs = await client.getMessages(e, { limit: 50, minId })
    let maxId = minId
    for (const m of msgs) {
      if (m.id > maxId) maxId = m.id
      if (m.out) continue // skip my own messages
      const text = (m.message || '').trim()
      if (!TAG.test(text)) continue // strictly: only @claude-tagged
      out.push(await build(m, e, handle, text))
    }
    state[handle] = maxId
  }
  writeJson(STATE, state)
  return out
}

async function pollMentions() {
  const STATE = cfg.statePath('mentions_state.json')
  const state = readJson(STATE, {})
  const nowSec = Math.floor(Date.now() / 1000)
  // baseline: first run = now, so we only catch FUTURE @claude tags
  const since = sinceArg != null ? sinceArg : (typeof state.sinceDate === 'number' ? state.sinceDate : nowSec)
  let maxDate = since
  const out = []
  const dialogs = await client.getDialogs({ limit: DIALOG_LIMIT })
  for (const d of dialogs) {
    if ((d.message?.date ?? 0) <= since) continue
    const entity = d.entity
    if (!entity) continue
    let msgs = []
    try { msgs = await client.getMessages(entity, { limit: PER_CHAT }) } catch { continue }
    for (const m of msgs) {
      if (typeof m.date === 'number' && m.date > maxDate) maxDate = m.date
      if (!m.date || m.date <= since) continue
      const text = (m.message || '').trim()
      if (text.startsWith('🔔')) continue // our own self-notify
      if (!TAG.test(text)) continue
      out.push(await build(m, entity, d.name || d.title || String(d.id), text))
      // 👀 ack so the owner sees it was caught
      try {
        await client.invoke(new Api.messages.SendReaction({ peer: entity, msgId: m.id, reaction: [new Api.ReactionEmoji({ emoticon: '👀' })] }))
      } catch {}
    }
  }
  state.sinceDate = Math.max(maxDate, since)
  writeJson(STATE, state)
  return out
}

async function build(m, entity, chat, text) {
  let feedback = text.replace(/@claude/gi, '').trim()
  if (m.media) {
    try {
      const buf = await client.downloadMedia(m, {})
      const mime = m.media?.document?.mimeType || ''
      const isAudio = mime.startsWith('audio') || Boolean(m.voice)
      if (buf && buf.length) {
        if (isAudio) {
          let tr
          try { tr = await transcribeBuffer(buf, m.id) } catch (e) { tr = `[transcribe failed: ${e.message}]` }
          feedback = `${feedback ? feedback + '\n' : ''}[voice->text]: ${tr}`
        } else {
          fs.mkdirSync(cfg.mediaDir, { recursive: true })
          const p = path.join(cfg.mediaDir, `${m.id}.${mime.split('/')[1] || 'bin'}`)
          fs.writeFileSync(p, buf)
          feedback = `${feedback ? feedback + '\n' : ''}[media saved: ${p} — open with Read]`
        }
      }
    } catch (err) {
      feedback += ` [media download failed: ${err.message}]`
    }
  }
  return {
    chat,
    peer: entity?.username ? `@${entity.username}` : (entity?.id != null ? String(entity.id) : null),
    msgId: m.id,
    fromMe: Boolean(m.out),
    date: m.date,
    feedback,
  }
}

function arg(flag) { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null }
function has(flag) { return argv.includes(flag) }
function readJson(p, d) { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return d } }
function writeJson(p, v) { fs.writeFileSync(p, JSON.stringify(v, null, 2)) }
