// Connect to YOUR Telegram as a userbot (GramJS / MTProto), using the session
// produced by `npm run login`. Everything stays on your machine.
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'
import { cfg, readSession, requireCreds } from './config.mjs'

export async function connect() {
  requireCreds()
  const session = readSession()
  if (!session) {
    console.error('No Telegram session yet. Run `npm run login` (QR login) first.')
    process.exit(2)
  }
  const client = new TelegramClient(new StringSession(session), cfg.apiId, cfg.apiHash, { connectionRetries: 5 })
  await client.connect()
  return client
}
