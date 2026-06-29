// One-time QR login to YOUR Telegram. Writes the session string to
// .loops/personal.session (local, git-ignored). Scan the QR in Telegram ->
// Settings -> Devices -> Link Desktop Device.
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'
import qrcode from 'qrcode-terminal'
import fs from 'node:fs'
import readline from 'node:readline'
import { cfg, readSession, requireCreds } from './config.mjs'

requireCreds()

const client = new TelegramClient(new StringSession(readSession()), cfg.apiId, cfg.apiHash, { connectionRetries: 5 })

try {
  await client.start({
    // Force QR (no phone-number flow): throwing here restarts auth with a QR token.
    phoneNumber: async () => {
      const e = new Error('RESTART_AUTH_WITH_QR')
      e.errorMessage = 'RESTART_AUTH_WITH_QR'
      throw e
    },
    qrCode: async ({ token, expires }) => {
      const url = `tg://login?token=${token.toString('base64url')}`
      console.log('\nScan in Telegram -> Settings -> Devices -> Link Desktop Device:\n')
      qrcode.generate(url, { small: true })
      console.log(`\n(QR expires ${new Date(Number(expires) * 1000).toLocaleTimeString()} — rerun if it lapses)\n`)
    },
    password: async (hint) => ask(`Telegram 2FA password${hint ? ` (hint: ${hint})` : ''} (empty if none): `),
    onError: (e) => {
      console.error('[login] auth error:', e?.errorMessage || e?.message || e)
      return false
    },
  })

  const session = client.session.save()
  if (!session) throw new Error('login succeeded but the session string is empty')
  fs.writeFileSync(cfg.sessionPath, `${session}\n`, { mode: 0o600 })
  const me = await client.getMe()
  console.log(`\nLogged in as @${me.username ?? me.id}. Session saved to ${cfg.sessionPath}`)
} finally {
  await client.disconnect()
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((res) => rl.question(q, (a) => { rl.close(); res(a.trim()) }))
}
