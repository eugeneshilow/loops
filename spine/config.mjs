// Shared config + paths for the loops spine. Loads YOUR own creds from .loops/.env
// (or repo-root .env). No secret is ever logged or committed.
import { config as loadEnv } from 'dotenv'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function expand(p) {
  if (!p) return p
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p
}

export const WORKDIR = expand(process.env.LOOPS_WORKDIR) || path.join(process.cwd(), '.loops')
fs.mkdirSync(WORKDIR, { recursive: true, mode: 0o700 })

// .loops/.env first (the home for your creds), then repo-root .env as fallback.
loadEnv({ path: path.join(WORKDIR, '.env'), quiet: true })
loadEnv({ quiet: true })

export const cfg = {
  apiId: Number.parseInt(process.env.TELEGRAM_API_ID ?? '', 10),
  apiHash: (process.env.TELEGRAM_API_HASH ?? '').trim(),
  sessionPath: path.join(WORKDIR, 'personal.session'),
  statePath: (name) => path.join(WORKDIR, name),
  inboxPath: path.join(WORKDIR, 'claude_inbox.jsonl'),
  cursorPath: path.join(WORKDIR, 'claude_inbox_cursor.json'),
  mediaDir: path.join(WORKDIR, 'media'),
  sttBackend: (process.env.STT_BACKEND ?? 'mlx-whisper').trim(),
  sttModel: (process.env.STT_MODEL ?? 'mlx-community/whisper-small-mlx').trim(),
  sttLang: (process.env.STT_LANGUAGE ?? 'ru').trim(),
  mlxBin: expand((process.env.MLX_WHISPER_BIN ?? '~/.stt-venv/bin/mlx_whisper').trim()),
  openaiKey: (process.env.OPENAI_API_KEY ?? '').trim(),
  openaiModel: (process.env.OPENAI_STT_MODEL ?? 'whisper-1').trim(),
  testers: (process.env.LOOP_TESTERS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  workdir: WORKDIR,
}

export function readSession() {
  try { return fs.readFileSync(cfg.sessionPath, 'utf8').trim() } catch { return '' }
}

export function requireCreds() {
  if (!cfg.apiId || !cfg.apiHash) {
    console.error('Missing TELEGRAM_API_ID / TELEGRAM_API_HASH. Run the setup skill (skills/setup/SKILL.md).')
    process.exit(2)
  }
}
