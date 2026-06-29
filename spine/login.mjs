// One-time QR login to YOUR Telegram. Writes the session string to
// .loops/personal.session (local, git-ignored). Scan the QR in Telegram ->
// Settings -> Devices -> Link Desktop Device. The QR opens as an image on your
// screen (and prints in the terminal as a fallback); 2FA is asked via a native
// dialog on macOS, else on the terminal.
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'
import qrTerminal from 'qrcode-terminal'
import QRCode from 'qrcode'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { spawn, spawnSync } from 'node:child_process'
import { cfg, readSession, requireCreds, WORKDIR } from './config.mjs'

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
      qrTerminal.generate(url, { small: true })
      try {
        const png = path.join(WORKDIR, 'login-qr.png')
        await QRCode.toFile(png, url, { width: 320, margin: 2 })
        openFile(png)
        console.log(`\n(QR also opened as an image: ${png})`)
      } catch {}
      console.log(`(QR expires ${new Date(Number(expires) * 1000).toLocaleTimeString()} — it refreshes automatically)\n`)
    },
    password: async (hint) => askPassword(hint),
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

function openFile(p) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open'
  try { spawn(cmd, [p], { stdio: 'ignore', detached: true }).unref() } catch {}
}

function askPassword(hint) {
  const label = `Telegram 2FA password${hint ? ` (hint: ${hint})` : ''}`
  if (process.platform === 'darwin') {
    const r = spawnSync('osascript', [
      '-e', `display dialog ${JSON.stringify(label)} default answer "" hidden answer true buttons {"Send"} default button "Send"`,
      '-e', 'text returned of result',
    ], { encoding: 'utf8' })
    if (r.status === 0) return r.stdout.trim()
  }
  return ask(`${label}: `)
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((res) => rl.question(q, (a) => { rl.close(); res(a.trim()) }))
}
